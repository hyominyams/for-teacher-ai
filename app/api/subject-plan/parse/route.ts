import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { parse } from "kordoc";
import type { AchievementLevel, CriteriaLevels, ParsedSubjectPlanSubject } from "@/types";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".hwp", ".hwpx", ".pdf"]);

type SubjectPlanExtraction = {
    subjects: ParsedSubjectPlanSubject[];
};

const subjectPlanSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        subjects: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    subjectName: { type: "string" },
                    schoolLevel: { type: "string" },
                    grade: { type: "string" },
                    assessments: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                area: { type: "string" },
                                standard: { type: "string" },
                                criteria: { type: "string" },
                                criteriaLevels: {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        상: { type: "string" },
                                        중: { type: "string" },
                                        하: { type: "string" },
                                    },
                                    required: ["상", "중", "하"],
                                },
                                competency: { type: "string" },
                            },
                            required: ["area", "standard", "criteria", "criteriaLevels", "competency"],
                        },
                    },
                },
                required: ["subjectName", "schoolLevel", "grade", "assessments"],
            },
        },
    },
    required: ["subjects"],
} as const;

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return "평가계획을 읽을 수 없습니다.";
};

const getExtension = (filename: string) => {
    const match = filename.toLowerCase().match(/\.[^.]+$/);
    return match?.[0] || "";
};

const cleanText = (value: unknown, fallback = "") => (
    typeof value === "string" && value.trim() ? value.trim() : fallback
);

const LEVELS: AchievementLevel[] = ["상", "중", "하"];

const stripLevelPrefix = (value: string, level: AchievementLevel) => (
    value.replace(new RegExp(`^\\s*${level}\\s*[):：:\\-]\\s*`), "").trim()
);

const splitCriteriaLevelsFromText = (criteria: string): CriteriaLevels => {
    const levels: CriteriaLevels = {};
    const text = criteria.trim();
    if (!text) return levels;

    LEVELS.forEach((level, index) => {
        const nextLevel = LEVELS[index + 1];
        const pattern = nextLevel
            ? new RegExp(`(?:^|\\n)\\s*${level}\\s*[):：:\\-]\\s*([\\s\\S]*?)(?=\\n\\s*${nextLevel}\\s*[):：:\\-])`)
            : new RegExp(`(?:^|\\n)\\s*${level}\\s*[):：:\\-]\\s*([\\s\\S]*)`);
        const match = text.match(pattern);
        if (match?.[1]?.trim()) {
            levels[level] = match[1].trim();
        }
    });

    if (LEVELS.every((level) => levels[level])) return levels;

    const candidateLines = text
        .split(/\n+/)
        .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
        .filter(Boolean);
    if (candidateLines.length === 3) {
        LEVELS.forEach((level, index) => {
            levels[level] = stripLevelPrefix(candidateLines[index], level);
        });
    }

    return levels;
};

const normalizeCriteriaLevels = (value: unknown, criteria: string): CriteriaLevels => {
    const explicitLevels = value && typeof value === "object"
        ? LEVELS.reduce<CriteriaLevels>((acc, level) => {
            const rawValue = (value as Record<string, unknown>)[level];
            acc[level] = cleanText(rawValue);
            return acc;
        }, {})
        : {};
    const parsedLevels = splitCriteriaLevelsFromText(criteria);

    return LEVELS.reduce<CriteriaLevels>((acc, level) => {
        acc[level] = explicitLevels[level] || parsedLevels[level] || "";
        return acc;
    }, {});
};

const normalizeSubjects = (
    extraction: SubjectPlanExtraction,
    hints: { schoolLevel: string; grade: string; subjectName: string }
) => {
    return (extraction.subjects || [])
        .map((subject) => {
            const subjectName = cleanText(subject.subjectName, hints.subjectName || "가져온 교과");
            const schoolLevel = cleanText(subject.schoolLevel, hints.schoolLevel || "elementary");
            const grade = cleanText(subject.grade, hints.grade || "1").replace(/학년/g, "").trim() || hints.grade || "1";
            const assessments = (subject.assessments || [])
                .map((assessment) => ({
                    area: cleanText(assessment.area, "평가"),
                    standard: cleanText(assessment.standard),
                    criteria: cleanText(assessment.criteria),
                    criteriaLevels: normalizeCriteriaLevels(assessment.criteriaLevels, cleanText(assessment.criteria)),
                    competency: cleanText(assessment.competency),
                }))
                .filter((assessment) => assessment.standard || assessment.criteria);

            return { subjectName, schoolLevel, grade, assessments };
        })
        .filter((subject) => subject.assessments.length > 0);
};

const buildPrompt = (markdown: string, hints: { schoolLevel: string; grade: string; subjectName: string }) => `
다음은 교사가 업로드한 평가계획 문서에서 추출한 Markdown입니다.
문서 안의 교과별 평가 영역, 성취기준, 평가기준, 핵심역량을 찾아 JSON으로 정리하세요.

규칙:
- 여러 교과가 있으면 subjects 배열에 모두 포함합니다.
- 학생별 상/중/하 성취도나 점수는 추출하지 않습니다.
- 평가기준이 상/중/하로 나뉘어 있으면 criteria에는 한 문자열 안에 줄바꿈으로 유지하고, criteriaLevels.상/중/하에 각각 분리합니다.
- 평가기준이 3개 문장이나 3개 행으로 제시되어 있고 수준명이 생략되어 있으면 위에서부터 상, 중, 하로 판단해 criteriaLevels에 넣습니다.
- 수준별 평가기준이 아니면 criteriaLevels.상/중/하에는 빈 문자열을 넣습니다.
- 교과명, 학교급, 학년이 문서에 없으면 힌트 값을 사용합니다.
- 확실하지 않은 핵심역량은 빈 문자열로 둡니다.
- 성취기준 또는 평가기준이 없는 평가는 제외합니다.

힌트:
- 학교급: ${hints.schoolLevel || "elementary"}
- 학년: ${hints.grade || "1"}
- 현재 교과명: ${hints.subjectName || ""}

Markdown:
${markdown.slice(0, 60000)}
`.trim();

export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local에 키를 추가하고 dev 서버를 재시작해주세요." },
                { status: 503 }
            );
        }

        const formData = await req.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "파일을 선택해주세요." }, { status: 400 });
        }

        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json({ error: "20MB 이하 파일만 업로드할 수 있습니다." }, { status: 400 });
        }

        const extension = getExtension(file.name);
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            return NextResponse.json({ error: "HWP, HWPX, PDF 파일만 업로드할 수 있습니다." }, { status: 400 });
        }

        const hints = {
            schoolLevel: cleanText(formData.get("schoolLevel"), "elementary"),
            grade: cleanText(formData.get("grade"), "1"),
            subjectName: cleanText(formData.get("subjectName")),
        };

        const buffer = Buffer.from(await file.arrayBuffer());
        const parseResult = await parse(buffer);

        if (!parseResult.success) {
            const error = parseResult.code === "IMAGE_BASED_PDF"
                ? "텍스트를 읽을 수 없습니다. 텍스트가 포함된 PDF나 HWP 파일을 업로드해주세요."
                : parseResult.error || "평가계획을 읽을 수 없습니다.";
            return NextResponse.json({ error }, { status: 400 });
        }

        const markdown = parseResult.markdown.trim();
        const parseWarnings = (parseResult.warnings || []).map((warning) => warning.message);
        const hasOcrSignal = extension === ".pdf" && (
            parseResult.qualitySummary?.needsOcr ||
            (parseResult.warnings || []).some((warning) => warning.code === "NEEDS_OCR")
        );
        const needsOcr = extension === ".pdf" && (
            parseResult.isImageBased ||
            (hasOcrSignal && markdown.length < 500)
        );

        if (needsOcr) {
            return NextResponse.json(
                { error: "텍스트를 읽을 수 없습니다. 텍스트가 포함된 PDF나 HWP 파일을 업로드해주세요." },
                { status: 400 }
            );
        }

        if (markdown.length < 40) {
            return NextResponse.json(
                { error: "텍스트를 읽을 수 없습니다. 다른 파일을 업로드해주세요." },
                { status: 400 }
            );
        }

        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "대한민국 학교 평가계획 문서에서 교과별 평가정보를 정확히 추출하는 데이터 정리 도우미입니다.",
                },
                { role: "user", content: buildPrompt(markdown, hints) },
            ],
            temperature: 0,
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "subject_plan_extraction",
                    strict: true,
                    schema: subjectPlanSchema,
                },
            },
        });

        const content = response.choices[0].message.content;
        const parsed = JSON.parse(content || "{\"subjects\":[]}") as SubjectPlanExtraction;
        const subjects = normalizeSubjects(parsed, hints);

        if (!subjects.length) {
            return NextResponse.json(
                { error: "평가 영역, 성취기준, 평가기준을 찾지 못했습니다." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            subjects,
            warnings: parseWarnings,
        });
    } catch (error: unknown) {
        console.error("Subject Plan Parse Error:", error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
