import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

const ROOT = process.cwd();
const MODELS = ["gpt-4o", "gpt-4o-mini"];
const OUTPUT_DIR = path.join(ROOT, "tmp", "model-quality-compare");

const loadEnvLocal = () => {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
};

const buildPrompt = ({ category, keywords = [], targetChars, role, term, subjectMeta }) => {
  const promptPath = path.join(ROOT, "prompts", `${category}.md`);
  const finalPath = fs.existsSync(promptPath) ? promptPath : path.join(ROOT, "prompts", "behavior.md");
  const promptTemplate = fs.readFileSync(finalPath, "utf-8");

  let officerInfo = "임원아님";
  if (role && role !== "임원아님") {
    officerInfo = `${role}${term ? `(${term})` : ""}`;
  }

  let prompt = promptTemplate
    .replaceAll("[KEYWORDS]", keywords.join(", "))
    .replaceAll("[EVENTS]", keywords.join(", "))
    .replaceAll("[OFFICER_INFO]", officerInfo)
    .replaceAll("[TARGET_CHARS]", String(targetChars));

  if (category === "subject" && subjectMeta) {
    const { schoolLevel, grade, subjectName, assessments, studentAssessments, individualNote } = subjectMeta;
    const assessmentsText = (assessments || [])
      .map((assessment) => {
        const studentLevel =
          (studentAssessments || []).find((studentAssessment) => studentAssessment.assessmentId === assessment.id)
            ?.level || "미선택";
        if (studentLevel === "" || studentLevel === "none") return null;

        return `- 영역: ${assessment.area}
  - 성취기준: ${assessment.standard}
  - 평가기준: ${assessment.criteria}
  - 핵심역량: ${assessment.competency}
  - 성취도: ${studentLevel}`;
      })
      .filter(Boolean)
      .join("\n\n");

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

  return prompt;
};

const samples = [
  {
    id: "behavior-01",
    category: "behavior",
    title: "행특 1. 성실 책임형",
    input: {
      category: "behavior",
      keywords: ["성실함", "책임감", "규칙준수", "친구 배려"],
      targetChars: 300,
    },
  },
  {
    id: "behavior-02",
    category: "behavior",
    title: "행특 2. 탐구 발표형",
    input: {
      category: "behavior",
      keywords: ["호기심", "발표력", "적극성", "창의적 사고"],
      targetChars: 300,
    },
  },
  {
    id: "behavior-03",
    category: "behavior",
    title: "행특 3. 소극성 개선형",
    input: {
      category: "behavior",
      keywords: ["차분함", "신중함", "소극적이나 노력함", "경청"],
      targetChars: 300,
    },
  },
  {
    id: "subject-01",
    category: "subject",
    title: "세특 1. 6학년 국어",
    input: {
      category: "subject",
      keywords: [],
      targetChars: 500,
      subjectMeta: {
        schoolLevel: "elementary",
        grade: "6",
        subjectName: "국어",
        individualNote: "독서 후 인물의 선택을 근거와 함께 정리하고 모둠 토론에서 친구 의견을 반영해 자신의 주장을 보완함.",
        assessments: [
          {
            id: "kor-read",
            area: "읽기",
            standard: "[6국02-01] 글의 구조를 고려하며 주제나 주장을 파악하고 글 내용을 요약한다.",
            criteria: "글의 구조를 파악하고 중심 내용을 근거로 주제와 주장을 요약할 수 있다.",
            competency: "비판적 사고, 의사소통",
          },
          {
            id: "kor-speak",
            area: "말하기 듣기",
            standard: "[6국01-07] 절차와 규칙을 지키고 타당한 이유와 근거를 제시하며 토론한다.",
            criteria: "토론 절차를 지키며 타당한 근거를 들어 의견을 제시할 수 있다.",
            competency: "의사소통, 공동체 협력",
          },
          {
            id: "kor-write",
            area: "쓰기",
            standard: "[6국03-04] 독자와 매체를 고려하여 내용을 생성하고 표현하며 글을 쓴다.",
            criteria: "독자와 매체 특성을 고려하여 내용을 조직하고 적절한 표현으로 글을 쓸 수 있다.",
            competency: "창의적 표현, 자료 활용",
          },
        ],
        studentAssessments: [
          { assessmentId: "kor-read", level: "상" },
          { assessmentId: "kor-speak", level: "중" },
          { assessmentId: "kor-write", level: "상" },
        ],
      },
    },
  },
  {
    id: "subject-02",
    category: "subject",
    title: "세특 2. 4학년 수학",
    input: {
      category: "subject",
      keywords: [],
      targetChars: 500,
      subjectMeta: {
        schoolLevel: "elementary",
        grade: "4",
        subjectName: "수학",
        individualNote: "계산 과정은 차분히 기록하나 새로운 유형의 문제에서는 처음에 망설임이 있어 예시를 보고 해결 방법을 정리함.",
        assessments: [
          {
            id: "math-frac",
            area: "분수",
            standard: "[4수01-11] 분모가 같은 분수끼리, 단위분수끼리 크기를 비교하고 그 방법을 설명할 수 있다.",
            criteria: "분모가 같은 분수와 단위분수의 크기를 비교하고 비교 방법을 말로 설명할 수 있다.",
            competency: "추론, 의사소통",
          },
          {
            id: "math-decimal",
            area: "소수",
            standard: "[4수01-14] 소수의 크기를 비교하고 그 방법을 설명할 수 있다.",
            criteria: "자릿값을 바탕으로 소수의 크기를 비교하고 비교 과정을 설명할 수 있다.",
            competency: "문제 해결, 추론",
          },
          {
            id: "math-graph",
            area: "자료와 가능성",
            standard: "[4수04-03] 탐구 문제를 해결하기 위해 자료를 수집, 정리하여 막대그래프나 꺾은선그래프로 나타내고 해석할 수 있다.",
            criteria: "자료를 수집하고 그래프로 나타낸 뒤 그래프의 의미를 해석할 수 있다.",
            competency: "정보 처리, 문제 해결",
          },
        ],
        studentAssessments: [
          { assessmentId: "math-frac", level: "중" },
          { assessmentId: "math-decimal", level: "하" },
          { assessmentId: "math-graph", level: "중" },
        ],
      },
    },
  },
  {
    id: "subject-03",
    category: "subject",
    title: "세특 3. 6학년 과학",
    input: {
      category: "subject",
      keywords: [],
      targetChars: 500,
      subjectMeta: {
        schoolLevel: "elementary",
        grade: "6",
        subjectName: "과학",
        individualNote: "실험 결과를 표로 정리하고 예상과 다른 결과가 나온 까닭을 다시 확인하려는 태도가 두드러짐.",
        assessments: [
          {
            id: "sci-weather",
            area: "날씨와 우리 생활",
            standard: "[6과06-01] 기상 요소를 조사하고, 날씨가 우리 생활에 주는 영향을 인식할 수 있다.",
            criteria: "기온, 바람, 습도 등 기상 요소를 조사하고 날씨가 생활에 미치는 영향을 설명할 수 있다.",
            competency: "탐구, 자료 해석",
          },
          {
            id: "sci-electric",
            area: "전기의 이용",
            standard: "[6과15-01] 전지와 전구, 전선을 연결하여 전구에 불을 켜보고, 불이 켜지는 전기 회로의 특징을 말할 수 있다.",
            criteria: "간단한 전기 회로를 구성하고 전구가 켜지는 조건을 설명할 수 있다.",
            competency: "과학적 탐구, 문제 해결",
          },
          {
            id: "sci-energy",
            area: "자원과 에너지",
            standard: "[6과08-03] 자원과 에너지의 효율적인 이용 방법에 대해 탐색하고, 생활 속에서 실천할 수 있는 다양한 사례를 공유할 수 있다.",
            criteria: "에너지 절약 방법을 조사하고 생활 속 실천 사례를 제안할 수 있다.",
            competency: "공동체, 과학적 의사소통",
          },
        ],
        studentAssessments: [
          { assessmentId: "sci-weather", level: "상" },
          { assessmentId: "sci-electric", level: "상" },
          { assessmentId: "sci-energy", level: "중" },
        ],
      },
    },
  },
  {
    id: "creative-01",
    category: "creative",
    title: "창체 1. 학급자치 안전교육",
    input: {
      category: "creative",
      keywords: ["학급회의", "학교폭력예방교육", "재난안전교육", "생명존중교육"],
      role: "학급 회장",
      term: "2026.03.04.~2026.07.24.",
      targetChars: 500,
    },
  },
  {
    id: "creative-02",
    category: "creative",
    title: "창체 2. 환경 봉사활동",
    input: {
      category: "creative",
      keywords: ["환경정화활동", "기후변화교육", "분리배출 캠페인", "학교숲 탐방"],
      role: "임원아님",
      targetChars: 500,
    },
  },
  {
    id: "creative-03",
    category: "creative",
    title: "창체 3. 진로 동아리활동",
    input: {
      category: "creative",
      keywords: ["진로탐색활동", "직업인 초청 강연", "과학탐구 동아리", "협동 프로젝트 발표"],
      role: "동아리 부장",
      term: "2026.03.10.~2026.12.18.",
      targetChars: 500,
    },
  },
];

const toMarkdown = (results) => {
  const lines = [
    "# Model Quality Comparison",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Models: ${MODELS.join(", ")}`,
    `- Total calls: ${results.length}`,
    "",
  ];

  for (const sample of samples) {
    lines.push(`## ${sample.title}`, "");
    lines.push("### 입력", "");
    lines.push("```json", JSON.stringify(sample.input, null, 2), "```", "");

    for (const model of MODELS) {
      const result = results.find((item) => item.sampleId === sample.id && item.model === model);
      lines.push(`### ${model}`, "");
      if (result?.error) {
        lines.push(`ERROR: ${result.error}`, "");
      } else {
        lines.push(result?.content || "", "");
        lines.push(
          `usage: input=${result?.usage?.prompt_tokens ?? result?.usage?.input_tokens ?? "-"}, output=${result?.usage?.completion_tokens ?? result?.usage?.output_tokens ?? "-"}, total=${result?.usage?.total_tokens ?? "-"}`,
          "",
        );
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

const main = async () => {
  loadEnvLocal();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 없습니다. 셸 환경 또는 .env.local에 추가한 뒤 다시 실행하세요.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (const sample of samples) {
    const prompt = buildPrompt(sample.input);

    for (const model of MODELS) {
      process.stdout.write(`[call] ${sample.id} ${model} ... `);
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: "당신은 학생 생활기록부를 전문적으로 작성하는 대한민국 교사입니다. 학생의 이름이나 번호를 절대 언급하지 마세요.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        });

        results.push({
          sampleId: sample.id,
          category: sample.category,
          title: sample.title,
          model,
          input: sample.input,
          content: response.choices[0].message.content?.trim() || "",
          usage: response.usage || null,
        });
        process.stdout.write("done\n");
      } catch (error) {
        results.push({
          sampleId: sample.id,
          category: sample.category,
          title: sample.title,
          model,
          input: sample.input,
          error: error instanceof Error ? error.message : String(error),
        });
        process.stdout.write("failed\n");
      }
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUTPUT_DIR, `${stamp}.json`);
  const mdPath = path.join(OUTPUT_DIR, `${stamp}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(results, null, 2)}\n`);
  fs.writeFileSync(mdPath, toMarkdown(results));

  console.log(`\nSaved JSON: ${jsonPath}`);
  console.log(`Saved Markdown: ${mdPath}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
