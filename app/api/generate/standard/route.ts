import { callBudget, completionText, creditFailure, creditUser, CreditError, readAIJson, runCreditJob } from "@/lib/server/credits";
import { assertEditableWorkLog, workLogFailure } from "@/lib/server/work-log-access";
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";

export const maxDuration = 90;

export async function POST(req: Request) {
    try {
        const user = await creditUser(req);
        const raw = await readAIJson(req);
        const { schoolLevel, grade, subjectName, area, criteria, competency, workLogId } = raw;
        if (typeof subjectName !== "string" || !subjectName.trim()) throw new CreditError("INVALID_INPUT", "교과명을 확인해주세요.");
        try { await assertEditableWorkLog(req, workLogId); } catch (error) { return workLogFailure(error); }

        // 1. 성취기준 데이터 파일 읽기
        const dataPath = path.join(process.cwd(), "public", "all_subjects.md");
        const allData = fs.readFileSync(dataPath, "utf-8");

        // 2. 과목 및 학년군 필터링
        // 예: "국어", "수학", "사회", "도덕", "과학", "음악", "미술", "체육", "실과", "영어"
        const cleanSubject = (subjectName || "").replace(/\s+/g, "");

        // 학년군 매핑
        let gradeGroup = "";
        const gNum = parseInt(grade);
        if (gNum <= 2) gradeGroup = "1~2학년군";
        else if (gNum <= 4) gradeGroup = "3~4학년군";
        else if (gNum <= 6) gradeGroup = "5~6학년군";

        // 섹션 추출 로직
        const lines = allData.split("\n");
        let inSubject = false;
        let inGrade = false;
        const standards: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("## ") && line.includes(cleanSubject)) {
                inSubject = true;
                continue;
            }
            if (inSubject && line.startsWith("## ") && !line.includes(cleanSubject)) {
                break; // 다른 과목으로 넘어감
            }
            if (inSubject && line.startsWith("### ") && line.includes(gradeGroup)) {
                inGrade = true;
                continue;
            }
            if (inGrade && line.startsWith("### ") && !line.includes(gradeGroup)) {
                inGrade = false;
                continue;
            }
            if (inGrade && line.startsWith("- [")) {
                standards.push(line.replace("- ", ""));
            }
        }

        const standardsListText = standards.length > 0 ? standards.join("\n") : "해당하는 성취기준을 찾을 수 없습니다.";

        // 3. 프롬프트 준비
        const promptPath = path.join(process.cwd(), "prompts", "subject_standard.md");
        const promptTemplate = fs.readFileSync(promptPath, "utf-8");

        const prompt = promptTemplate
            .replace("[SCHOOL_LEVEL]", schoolLevel || "초등학교")
            .replace("[GRADE]", grade || "")
            .replace("[SUBJECT_NAME]", subjectName || "")
            .replace("[AREA]", area || "")
            .replace("[CRITERIA]", criteria || "")
            .replace("[COMPETENCY]", competency || "")
            .replace("[SUBJECT_STANDARDS_LIST]", standardsListText);

        const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: "gpt-5-nano",
            reasoning_effort: "minimal",
            max_completion_tokens: 4096,
            response_format: { type: "json_object" },
            messages: [
                { role: "developer", content: "당신은 대한민국 교육과정과 성취기준 전문가입니다. 반드시 제공된 목록에서만 답변하세요." },
                { role: "user", content: prompt }
            ],

        };
        return await runCreditJob(req, user, "standard", raw, [callBudget(params)], async complete => {
            const parsed = JSON.parse(completionText(await complete(params)));
            if (typeof parsed.standard !== "string" || !parsed.standard.trim()) throw new CreditError("AI_INCOMPLETE", "성취기준을 찾지 못했습니다. 크레딧은 차감하지 않습니다.", 502);
            return { standard: parsed.standard };
        });
    } catch (error: unknown) {
        return creditFailure(error);
    }
}
