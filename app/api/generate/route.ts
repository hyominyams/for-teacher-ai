import { callBudget, completionText, creditFailure, creditUser, CreditError, readAIJson, runCreditJob } from "@/lib/server/credits";
import { assertEditableWorkLog, workLogFailure } from "@/lib/server/work-log-access";
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";

type SubjectAssessment = {
    id: string;
    area: string;
    standard: string;
    criteria: string;
    competency: string;
};

type StudentAssessment = {
    assessmentId: string;
    level?: string;
};

const ACHIEVEMENT_LEVELS = ["상", "중", "하"] as const;

const getCriteriaForLevel = (criteria: string, level: string) => {
    if (!ACHIEVEMENT_LEVELS.some((item) => item === level)) return criteria;

    const levelIndex = ACHIEVEMENT_LEVELS.findIndex((item) => item === level);
    const nextLevel = ACHIEVEMENT_LEVELS[levelIndex + 1];
    const pattern = nextLevel
        ? new RegExp(`(?:^|\\n)\\s*${level}\\s*[):：:\\-]\\s*([\\s\\S]*?)(?=\\n\\s*${nextLevel}\\s*[):：:\\-])`)
        : new RegExp(`(?:^|\\n)\\s*${level}\\s*[):：:\\-]\\s*([\\s\\S]*)`);
    const match = criteria.match(pattern);

    return match?.[1]?.trim() || criteria;
};

export const maxDuration = 90;

export async function POST(req: Request) {
    try {
        const user = await creditUser(req);
        const raw = await readAIJson(req);
        const { keywords, targetChars, category = "behavior", role, term, subjectMeta, workLogId } = raw;
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

        // 템플릿 변수 치환
        let prompt = promptTemplate
            .replaceAll("[KEYWORDS]", keywords.join(", "))
            .replaceAll("[EVENTS]", keywords.join(", ")) // 창체의 경우 keywords에 행사가 들어옴
            .replaceAll("[OFFICER_INFO]", officerInfo)
            .replaceAll("[TARGET_CHARS]", targetChars.toString());

        if (category === "subject") {
            if (subjectMeta) {
                const { schoolLevel, grade, subjectName, assessments, studentAssessments, individualNote } = subjectMeta;

                const assessmentsText = ((assessments || []) as SubjectAssessment[]).map((a) => {
                    const studentLevel = ((studentAssessments || []) as StudentAssessment[]).find((sa) => sa.assessmentId === a.id)?.level || "미선택";
                    if (studentLevel === "" || studentLevel === "none") return null;
                    const criteria = getCriteriaForLevel(a.criteria, studentLevel);

                    return `- 영역: ${a.area}
  - 성취기준: ${a.standard}
  - 평가기준: ${criteria}
  - 핵심역량: ${a.competency}
  - 성취도: ${studentLevel}`;
                }).filter(Boolean).join("\n\n");

                const subjectData = `
학교급: ${schoolLevel}
학년: ${grade}학년
교과: ${subjectName}
특이사항: ${individualNote || "없음"}

[평가 상세 내역]
${assessmentsText || "선택된 평가 항목이 없습니다."}
                `.trim();

                prompt = prompt.replace("[SUBJECT_DATA]", subjectData);
            }
        }

        const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: "gpt-6-luna",
            reasoning_effort: "none",
            max_completion_tokens: Math.min(32768, Math.max(1024, targetChars * 4 + 256)),
            messages: [
                { role: "system", content: "당신은 학생 생활기록부를 전문적으로 작성하는 대한민국 교사입니다. 학생의 이름이나 번호를 절대 언급하지 마세요." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
        };
        return await runCreditJob(req, user, "generate", raw, [callBudget(params)], async complete => ({ result: completionText(await complete(params)) }));
    } catch (error: unknown) {
        return creditFailure(error);
    }
}
