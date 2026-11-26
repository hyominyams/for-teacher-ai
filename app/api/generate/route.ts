import { callBudget, completionText, creditFailure, creditUser, CreditError, readAIJson, runCreditJob } from "@/lib/server/credits";
import { assertEditableWorkLog, workLogFailure } from "@/lib/server/work-log-access";
import { runRecordContinuation } from "@/lib/server/record-continuation";
import { MAX_EXISTING_RECORD_CHARS, removeRecordEmoji } from "@/lib/record-generation";
import type { AchievementLevel, SubjectAssessmentInfo } from "@/types";
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";

type StudentAssessment = {
    assessmentId: string;
    level?: string;
};

const ACHIEVEMENT_LEVELS = ["상", "중", "하"] as const;

const getCriteriaForLevel = ({ criteria, criteriaLevels }: SubjectAssessmentInfo, level: AchievementLevel) => {
    const explicit = criteriaLevels?.[level]?.trim();
    if (explicit) return explicit;

    // Older records can store the levels together in the criteria text.
    const sections = [...(criteria || "").matchAll(/(?:^|\n)[^\S\n]*([상중하])[^\S\n]*[):：-]([\s\S]*?)(?=\n[^\S\n]*[상중하][^\S\n]*[):：-]|$)/g)];
    if (sections.length) return sections.find((section) => section[1] === level)?.[2].trim() || "";
    return criteria;
};

export const maxDuration = 90;

export async function POST(req: Request) {
    try {
        const user = await creditUser(req);
        const raw = await readAIJson(req);
        const { keywords, targetChars, category = "behavior", role, term, subjectMeta, workLogId, mode, existingText } = raw;
        if (!["behavior", "subject", "creative"].includes(category) || !Array.isArray(keywords) || keywords.some(k => typeof k !== "string") || !Number.isInteger(targetChars) || targetChars < 1 || targetChars > 10000) throw new CreditError("INVALID_INPUT", "영역·키워드·목표 글자 수를 확인해주세요.");
        try { await assertEditableWorkLog(req, workLogId); } catch (error) { return workLogFailure(error); }

        // prompts 폴더에서 카테고리에 맞는 파일 읽기
        const promptPath = path.join(process.cwd(), "prompts", `${category}.md`);

        // 파일이 없으면 기본 behavior.md 사용
        let finalPath = promptPath;
        if (!fs.existsSync(promptPath)) {
            finalPath = path.join(process.cwd(), "prompts", "behavior.md");
        }

        const promptTemplate = fs.readFileSync(finalPath, "utf-8");

        let officerInfo = "임원아님";
        if (role && role !== "임원아님") {
            officerInfo = `${role}${term ? `(${term})` : ""}`;
        }

        if (mode === "append") {
            if ((category !== "behavior" && category !== "creative") || typeof existingText !== "string" || existingText.length > MAX_EXISTING_RECORD_CHARS) {
                throw new CreditError("INVALID_INPUT", "이어쓸 수 있는 영역과 기존 기록을 확인해주세요.");
            }
            if (existingText.trim()) return await runRecordContinuation(req, user, raw, { category, original: existingText.trim(), keywords, officerInfo, targetChars });
        }

        // 템플릿 변수 치환
        let prompt = promptTemplate
            .replaceAll("[KEYWORDS]", keywords.join(", "))
            .replaceAll("[EVENTS]", keywords.join(", ")) // 창체의 경우 keywords에 행사가 들어옴
            .replaceAll("[OFFICER_INFO]", officerInfo)
            .replaceAll("[TARGET_CHARS]", targetChars.toString());

        if (category === "subject") {
            if (subjectMeta) {
                const { schoolLevel, grade, subjectName, assessments, studentAssessments, individualNote } = subjectMeta;

                const assessmentsText = ((assessments || []) as SubjectAssessmentInfo[]).flatMap((a) => {
                    const selectedLevel = ((studentAssessments || []) as StudentAssessment[]).find((sa) => sa.assessmentId === a.id)?.level;
                    const studentLevel = ACHIEVEMENT_LEVELS.find((level) => level === selectedLevel);
                    if (!studentLevel) return [];
                    const criteria = getCriteriaForLevel(a, studentLevel);

                    return `- 영역: ${a.area}
  - 성취기준: ${a.standard}
  - 평가기준: ${criteria ?? ""}
  - 핵심역량: ${a.competency}
  - 성취도: ${studentLevel}`;
                }).join("\n\n");

                const subjectData = `
학교급: ${schoolLevel}
학년: ${grade}학년
교과: ${subjectName}
특이사항: ${individualNote || "없음"}

[평가 상세 내역]
${assessmentsText || "선택된 평가 항목이 없습니다."}
                `.trim();

                prompt = prompt.replace("[SUBJECT_DATA]", () => subjectData);
            }
        }

        const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: "gpt-6-luna",
            reasoning_effort: category === "subject" ? "low" : "none",
            max_completion_tokens: Math.min(32768, Math.max(1024, targetChars * 4 + 256)),
            messages: [
                { role: "system", content: "당신은 학생 생활기록부를 전문적으로 작성하는 대한민국 교사입니다. 학생의 이름이나 번호를 절대 언급하지 마세요." },
                { role: "user", content: prompt }
            ],
            ...(category === "subject" ? {} : { temperature: 0.7 }),
        };
        return await runCreditJob(req, user, "generate", raw, [callBudget(params)], async complete => {
            const text = completionText(await complete(params));
            const result = category === "subject" ? removeRecordEmoji(text) : text;
            if (!result) throw new CreditError("AI_INCOMPLETE", "학기말 종합의견을 받지 못했습니다. 다시 생성해주세요.", 502);
            return { result };
        });
    } catch (error: unknown) {
        return creditFailure(error);
    }
}
