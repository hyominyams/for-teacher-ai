// Explicit paid verification with synthetic class records, not saved user data.
// node scripts/verify-class-polish.mjs --run
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import env from "@next/env";
import ts from "typescript";

if (!process.argv.includes("--run")) { console.log("Add --run for paid live verification."); process.exit(0); }
env.loadEnvConfig(process.cwd());
const require = createRequire(import.meta.url);
const cache = new Map();
const traces = [];
const BaseOpenAI = require("openai");
class TracedOpenAI extends BaseOpenAI {
    constructor(options) {
        super(options);
        const create = this.chat.completions.create.bind(this.chat.completions);
        this.chat.completions.create = async (...args) => {
            const response = await create(...args);
            traces.push({ stage: args[0].response_format.json_schema.name, content: response.choices[0].message.content, usage: response.usage });
            fs.mkdirSync("output/class-polish", { recursive: true });
            fs.writeFileSync("output/class-polish/live-trace.json", JSON.stringify(traces, null, 2) + "\n");
            return response;
        };
    }
}
function load(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const mod = { exports: {} }; cache.set(absolute, mod);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    new Function("require", "module", "exports", code)(name => name === "openai" ? { __esModule: true, default: TracedOpenAI } : name.startsWith("@/") ? load(name.slice(2) + ".ts") : require(name), mod, mod.exports);
    return mod.exports;
}
const { reviewClassPolish } = load("lib/server/class-polish.ts");
const { applyPolishProposals, undoPolishBatch } = load("lib/class-polish.ts");
const fixture = (category, count) => Array.from({ length: count }, (_, i) => {
    const behavior = [
        "친구의 의견을 경청하며 모둠 활동에 성실하게 참여함. 맡은 과제를 끝까지 수행하며 도움이 필요할 때 질문함.",
        "친구의 의견을 경청하며 모둠 활동에 성실하게 참여함. 새로운 문제를 접하면 해결 방법을 신중하게 살펴보며 꾸준히 노력함.",
        "주어진 과제를 책임감 있게 수행하며 학습 활동에 꾸준히 참여함. 친구의 입장을 배려하고 학급 규칙을 잘 지키는 태도가 돋보임.",
        "차분한 태도로 학습 활동에 참여하며 자신의 생각을 정리하는 데 충분한 시간을 들임. 친구의 말을 경청하고 서로의 의견을 존중함.",
    ];
    const subject = [
        "수학 학습에 성실한 태도로 참여하며 주어진 문제를 끝까지 해결하려고 노력함. 분수의 크기를 정확하게 비교하고 그 까닭을 설명함. 소수의 크기는 예시의 도움을 받아 비교하는 단계이며, 풀이 과정을 차분히 기록함.",
        "수학 학습에 성실한 태도로 참여하며 주어진 문제를 끝까지 해결하려고 노력함. 분수의 크기를 비교하고 그 까닭을 설명함. 그래프에 담긴 정보를 찾아 자신의 말로 설명하는 능력이 우수함.",
        "수학 학습에 꾸준한 관심을 가지고 참여하며 과제를 책임감 있게 수행함. 소수의 크기를 스스로 비교하고 풀이 방법을 정확하게 설명함. 자료를 그래프로 나타내고 의미를 해석함.",
    ];
    const creative = [
        "학급 회장(2026.03.01.~2026.07.20.)으로서 학급 자치 활동에 책임감 있게 참여함. 학급회의에서 친구의 의견을 경청하며 서로 다른 의견을 존중함. 학교폭력예방교육에서 도움을 요청하는 방법을 익힘.",
        "학급회의에서 친구의 의견을 경청하며 서로 다른 의견을 존중함. 학교폭력예방교육에서 도움을 요청하는 방법을 익힘. 환경정화활동에서 맡은 구역을 성실하게 정리함.",
        "학급회의에서 자신의 의견을 조리 있게 표현하고 친구의 이야기를 경청함. 환경정화활동에서 맡은 구역을 성실하게 정리함. 학교숲 탐방에서 나무의 특징을 관찰함.",
    ];
    const texts = category === "behavior" ? behavior : category === "subject" ? subject : creative;
    return { studentId: i + 1, text: texts[i % texts.length], protectedTerms: category === "creative" ? ["학급 회장", "학급회의", "학교폭력예방교육", "환경정화활동", "학교숲 탐방"] : [] };
});
const outputs = [];
for (const [category, count] of [["behavior", 30], ["subject", 23], ["creative", 30]]) {
    const records = fixture(category, count);
    const start = performance.now();
    const result = await reviewClassPolish(category, records, process.env.OPENAI_API_KEY);
    console.log(JSON.stringify({ category, reviewedCount: result.reviewedCount, proposals: result.proposals.length, discarded: result.discarded }));
    assert.equal(result.reviewedCount, count);
    assert.ok(result.proposals.length > 0 && result.proposals.length < count, "Need a useful subset of proposals");
    const students = records.map(r => ({ id: r.studentId, aiResult: r.text, isGenerating: false, isEditable: true, name: "", customKeywords: [], selectedKeywords: [], selected: false }));
    const batch = "live-" + category;
    const applied = applyPolishProposals(students, result.proposals, batch, new Date().toISOString());
    assert.equal(applied.applied.length, result.proposals.length);
    const restored = undoPolishBatch(JSON.parse(JSON.stringify(applied.students)), batch);
    assert.deepEqual(restored.students.map(s => s.aiResult), students.map(s => s.aiResult));
    const entry = { category, count, elapsedMs: Math.round(performance.now() - start), ...result, records };
    outputs.push(entry);
    console.log(JSON.stringify({ category, count, proposals: result.proposals.length, discarded: result.discarded, elapsedMs: entry.elapsedMs, examples: result.proposals.slice(0, 2) }));
    fs.mkdirSync("output/class-polish", { recursive: true });
    fs.writeFileSync("output/class-polish/live-verification.json", JSON.stringify(outputs, null, 2) + "\n");
}
