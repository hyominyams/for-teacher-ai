// Paid, opt-in comparison using the current production route's exact messages.
// Run from the repo root: node scripts/compare-luna-quality.mjs --run --rounds 2
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import env from "@next/env";
import ts from "typescript";
import OpenAI from "openai";

if (!process.argv.includes("--run")) {
  console.log("Add --run to make paid API calls. Optional: --rounds 1 or 2.");
  process.exit(0);
}
const roundsIndex = process.argv.indexOf("--rounds");
const rounds = roundsIndex === -1 ? 2 : Number(process.argv[roundsIndex + 1]);
if (![1, 2].includes(rounds)) throw new Error("rounds must be 1 or 2");
env.loadEnvConfig(process.cwd());
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");

const models = ["gpt-4o", "gpt-6-luna"];
const sourcePath = "app/api/generate/route.ts";
const source = fs.readFileSync(sourcePath, "utf8");
const fixtureSource = fs.readFileSync("scripts/compare-model-quality.mjs", "utf8");
const fixtureMatch = fixtureSource.match(/const samples = (\[[\s\S]*?\n\]);\s*\nconst toMarkdown/);
if (!fixtureMatch) throw new Error("Could not locate the existing synthetic fixtures");
const samples = JSON.parse(JSON.stringify(vm.runInNewContext(`(${fixtureMatch[1]})`, {}, { timeout: 1000 })));
const require = createRequire(import.meta.url);
const routeModule = { exports: {} };
let captured;
class CaptureOpenAI {
  chat = { completions: { create: async (request) => {
    captured = structuredClone(request);
    return { choices: [{ message: { content: "capture only" } }] };
  } } };
}
// Execute only trusted repository code, replacing its SDK call to capture the
// production prompt assembly, including achievement-level criteria filtering.
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
new Function("require", "module", "exports", compiled)(
  (name) => name === "openai" ? { OpenAI: CaptureOpenAI } : require(name),
  routeModule,
  routeModule.exports,
);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 90000 });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve("docs", "model-comparisons", `4o-vs-luna-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });
const prompts = [];
for (const sample of samples) {
  captured = null;
  const response = await routeModule.exports.POST(new Request("http://localhost/api/generate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sample.input),
  }));
  if (response.status !== 200 || !captured) throw new Error(`Could not capture ${sample.id}`);
  prompts.push({ sampleId: sample.id, sha256: crypto.createHash("sha256").update(JSON.stringify(captured.messages)).digest("hex"), messages: captured.messages, temperature: captured.temperature });
}

const report = {
  startedAt: new Date().toISOString(), timezone: "Asia/Seoul",
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourcePath, sourceSha256: crypto.createHash("sha256").update(source).digest("hex"),
  models, rounds, temperature: 0.7, lunaReasoningEffort: "none", maxCompletionTokens: 2048,
  methodology: "9 existing synthetic fixtures; production handler messages captured with SDK stub; one concurrent model pair at a time; no retries; order alternates by round; common 2048 output-token ceiling; unedited outputs retained.",
  samples, prompts, results: [],
};

function checks(text, sample) {
  const banned = sample.category === "behavior" ? ["이러한", "동시에", "업무", "과업", "팀원"] : sample.category === "subject" ? ["깊은", "교사의", "교과 활동에", "학생은"] : ["이러한", "이를 통해"];
  // Strip dates only for sentence-count diagnostics. Warnings need human review.
  const withoutDates = text.replace(/\d{4}\.\d{1,2}\.\d{1,2}\./g, "DATE");
  const sentences = withoutDates.split(/[.!?](?:\s+|$)/).map(s => s.trim()).filter(Boolean);
  const hasMieumEnding = (sentence) => {
    const code = sentence.codePointAt(sentence.length - 1);
    return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 16;
  };
  return {
    chars: [...text].length,
    targetChars: sample.input.targetChars,
    lengthRatio: [...text].length / sample.input.targetChars,
    singleParagraph: !text.includes("\n"),
    bannedFound: banned.filter(w => text.includes(w)),
    sentenceCount: sentences.length,
    nonNominalEndings: sentences.filter(s => !hasMieumEnding(s)).map(s => s.slice(-30)),
    ...(sample.category === "creative" ? {
      missingEvents: sample.input.keywords.filter(event => !text.includes(event)),
      expectedSentences: sample.input.keywords.length + (sample.input.role && sample.input.role !== "임원아님" ? 1 : 0),
      officerFirst: sample.input.role !== "임원아님" ? !!sentences[0]?.includes(sample.input.role) : null,
      termIncluded: sample.input.term ? text.includes(sample.input.term) : null,
    } : {}),
  };
}
function save() { fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(report, null, 2) + "\n"); }
save();
console.log(`Output: ${outDir}`);
for (let round = 1; round <= rounds; round++) {
  for (const sample of samples) {
    const prompt = prompts.find(p => p.sampleId === sample.id);
    const order = round % 2 ? models : [...models].reverse();
    const pair = await Promise.all(order.map(async model => {
      const start = performance.now();
      try {
        const response = await client.chat.completions.create({
          model, messages: prompt.messages, temperature: prompt.temperature,
          max_completion_tokens: 2048,
          ...(model === "gpt-6-luna" ? { reasoning_effort: "none" } : {}),
        });
        const content = response.choices[0]?.message?.content?.trim() || "";
        return { sampleId: sample.id, category: sample.category, round, model, actualModel: response.model, elapsedMs: Math.round(performance.now() - start), content, finishReason: response.choices[0]?.finish_reason, usage: response.usage, checks: checks(content, sample) };
      } catch (error) {
        return { sampleId: sample.id, category: sample.category, round, model, elapsedMs: Math.round(performance.now() - start), error: { status: error.status, code: error.code, message: String(error.message).replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]") } };
      }
    }));
    report.results.push(...pair);
    save();
    console.log(JSON.stringify({ round, sample: sample.id, results: pair.map(r => ({ model: r.model, ms: r.elapsedMs, chars: r.checks?.chars, warnings: r.checks?.bannedFound, missingEvents: r.checks?.missingEvents, error: r.error?.code })) }));
  }
}
report.finishedAt = new Date().toISOString();
save();
console.log(`Completed ${report.results.length} calls: ${path.join(outDir, "results.json")}`);
