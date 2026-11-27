import test from "node:test";
import assert from "node:assert/strict";
import { selectSubjectRemarkReferences } from "../lib/subject-remarks.ts";

const phrases = {
    공통: "  글의 중심 내용을 정리함.\r\n \r\n글의 중심 내용을 정리함.\r\n자신의 생각을 발표함.",
    상: "근거를 들어 중심 생각을 설명함.",
    중: "글에서 주요 내용을 찾음.",
    하: "제시된 낱말을 보고 중심 내용을 찾음.",
};

test("common remarks alone can be referenced at each assessed level", () => {
    for (const level of ["상", "중", "하"]) {
        assert.deepEqual(selectSubjectRemarkReferences({ 공통: phrases.공통 }, [level]), {
            공통: ["글의 중심 내용을 정리함.", "자신의 생각을 발표함."],
        });
    }
});

test("include level-specific references only at the levels occurring in the student's assessments", () => {
    assert.deepEqual(selectSubjectRemarkReferences(phrases, ["상", "하"]), {
        공통: ["글의 중심 내용을 정리함.", "자신의 생각을 발표함."],
        상: [phrases.상],
        하: [phrases.하],
    });
    assert.equal(selectSubjectRemarkReferences(phrases, []), undefined);
    assert.equal(selectSubjectRemarkReferences({ 공통: "\n ", 중: ["잘못된 형식"], 하: phrases.하 }, ["중"]), undefined);
    assert.equal(selectSubjectRemarkReferences(undefined, ["상"]), undefined);
});
