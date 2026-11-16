import type { User } from "@supabase/supabase-js";
import type OpenAI from "openai";
import { NextResponse } from "next/server";
import { CONTINUATION_DECISION_INSTRUCTIONS, CONTINUATION_INSTRUCTIONS, getContinuation, parseContinuationDecision, type ContinuationEvidence } from "@/lib/record-generation";
import { callBudget, completionText, runCreditJob } from "@/lib/server/credits";

type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export function runRecordContinuation(req: Request, user: User, raw: unknown, input: {
    category: "behavior" | "creative";
    original: string;
    keywords: string[];
    officerInfo: string;
    targetChars: number;
}) {
    const { category, original, keywords, officerInfo, targetChars } = input;
    const evidence: ContinuationEvidence[] = keywords.flatMap((keyword, index) =>
        keyword.trim() ? [{ id: `keyword-${index}`, label: keyword }] : []
    );
    if (category === "creative" && officerInfo !== "임원아님") evidence.push({ id: "officer", label: `임원: ${officerInfo}` });
    if (!evidence.length) return NextResponse.json({ result: "", noContinuation: true });

    const decide: ChatParams = {
        model: "gpt-6-luna",
        reasoning_effort: "low",
        max_completion_tokens: 1536,
        response_format: { type: "json_schema", json_schema: {
            name: "continuation_evidence", strict: true,
            schema: { type: "object", properties: { useIds: { type: "array", items: { type: "string" } } }, required: ["useIds"], additionalProperties: false }
        } },
        messages: [
            { role: "system", content: CONTINUATION_DECISION_INSTRUCTIONS },
            { role: "user", content: JSON.stringify({ category, original, evidence }) }
        ],
    };
    const write = (chosen: ContinuationEvidence[]): ChatParams => ({
        model: "gpt-6-luna",
        reasoning_effort: "none",
        temperature: 0.3,
        max_completion_tokens: Math.min(32768, Math.max(1024, targetChars * 4 + 256)),
        messages: [
            { role: "system", content: "당신은 학생 생활기록부를 작성하는 대한민국 교사입니다. 학생의 이름이나 번호를 절대 언급하지 마세요." + CONTINUATION_INSTRUCTIONS },
            { role: "user", content: JSON.stringify({ category, original, newEvidence: chosen.map(item => item.label), targetChars }) }
        ],
    });

    // The writer can only receive a subset of these exact evidence labels, so the
    // full prompt is a safe reservation ceiling. Only actual model calls settle.
    return runCreditJob(req, user, "generate", raw, [callBudget(decide), callBudget(write(evidence))], async complete => {
        const selected = parseContinuationDecision(completionText(await complete(decide)), evidence);
        if (!selected.size) return { result: "", noContinuation: true };
        const result = getContinuation(original, completionText(await complete(write(evidence.filter(item => selected.has(item.id))))));
        return { result, noContinuation: !result };
    });
}
