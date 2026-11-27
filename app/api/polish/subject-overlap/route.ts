import { readFile } from "node:fs/promises";
import path from "node:path";
import type OpenAI from "openai";
import { callBudget, completionText, CreditError, creditFailure, creditUser, readAIJson, runCreditJob } from "@/lib/server/credits";
import { assertEditableWorkLog, workLogFailure } from "@/lib/server/work-log-access";
import { parseSubjectOverlapInput, parseSubjectOverlapOutput } from "@/lib/subject-overlap";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
    try {
        const user = await creditUser(req);
        const raw = await readAIJson(req);
        try { await assertEditableWorkLog(req, raw.workLogId); } catch (error) { return workLogFailure(error); }

        let input;
        try { input = parseSubjectOverlapInput(raw); }
        catch (error) { throw new CreditError("INVALID_INPUT", error instanceof Error ? error.message : "학생 기록을 확인해주세요."); }
        const prompt = (await readFile(path.join(process.cwd(), "prompts", "subject_overlap.md"), "utf8")).trimEnd();
        const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: "gpt-6-luna",
            reasoning_effort: "low",
            max_completion_tokens: Math.min(32768, Math.max(2048, input.records.reduce((total, record) => total + 2 * record.text.length + 100, 0))),
            messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify(input) }],
            response_format: { type: "json_schema", json_schema: { name: "subject_overlap_records", strict: true, schema: {
                type: "object", additionalProperties: false, required: ["records"], properties: {
                    records: { type: "array", items: {
                        type: "object", additionalProperties: false, required: ["studentId", "text"],
                        properties: { studentId: { type: "integer" }, text: { type: "string" } },
                    } },
                },
            } } },
        };
        return await runCreditJob(req, user, "polish", { ...raw, task: "subject-overlap" }, [callBudget(params)], async complete => {
            const text = completionText(await complete(params));
            try {
                return { ...parseSubjectOverlapOutput(input.records, JSON.parse(text)), batchId: crypto.randomUUID() };
            } catch {
                throw new CreditError("AI_INCOMPLETE", "학생 번호와 겹침 제거 결과를 확인하지 못했습니다. 원문을 유지했습니다.", 502);
            }
        }, { timeoutMs: 95_000 });
    } catch (error) { return creditFailure(error); }
}
