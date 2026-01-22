import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { keywords, targetChars, category = "behavior", role, term } = await req.json();

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
        const prompt = promptTemplate
            .replaceAll("[KEYWORDS]", keywords.join(", "))
            .replaceAll("[EVENTS]", keywords.join(", ")) // 창체의 경우 keywords에 행사가 들어옴
            .replaceAll("[OFFICER_INFO]", officerInfo)
            .replaceAll("[TARGET_CHARS]", targetChars.toString());

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // 더 빠르고 정확한 모델로 변경
            messages: [
                { role: "system", content: "당신은 학생 생활기록부를 전문적으로 작성하는 대한민국 교사입니다. 학생의 이름이나 번호를 절대 언급하지 마세요." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
        });

        const result = response.choices[0].message.content?.trim();

        return NextResponse.json({ result });
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
