import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    return "성취기준 생성 중 오류가 발생했습니다.";
};

export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local에 키를 추가하고 dev 서버를 재시작해주세요." },
                { status: 503 }
            );
        }
        const openai = new OpenAI({ apiKey });

        const { schoolLevel, grade, subjectName, area, criteria, competency } = await req.json();

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

        const response = await openai.chat.completions.create({
            model: "gpt-5-nano",
            messages: [
                { role: "developer", content: "당신은 대한민국 교육과정과 성취기준 전문가입니다. 반드시 제공된 목록에서만 답변하세요." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
        });

        const content = response.choices[0].message.content?.trim();
        const parsed = JSON.parse(content || "{}");

        return NextResponse.json({ standard: parsed.standard });
    } catch (error: unknown) {
        console.error("Standard Generation Error:", error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
