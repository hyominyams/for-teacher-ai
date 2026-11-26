import test from "node:test";
import assert from "node:assert/strict";
import { appendRecordText, getContinuation, NO_NEW_RECORD_CONTENT, parseContinuationDecision, removeRecordEmoji } from "../lib/record-generation.ts";

test("subject records can remove entire emoji sequences without losing text and numbers", () => {
    assert.equal(removeRecordEmoji("🎬 영상 편집을 함. 👩🏽‍💻 🇰🇷 1️⃣ ❤"), "영상 편집을 함.");
    assert.equal(removeRecordEmoji("1번과 #2를 구별함. A↔B, 3.5cm."), "1번과 #2를 구별함. A↔B, 3.5cm.");
    assert.equal(removeRecordEmoji("표에서 ✅ 값을 찾아 적음. ★☆♡"), "표에서 값을 찾아 적음.");
    assert.equal(removeRecordEmoji("✅ 👨‍👩‍👧‍👦"), "");
});

test("an echoed original or repeated sentence cannot be appended twice", () => {
    const existing = "수업에 성실하게 참여함. 맡은 역할을 책임 있게 수행함.";
    const added = "친구의 의견을 배려하며 협력함.";
    assert.equal(getContinuation(existing, `${existing} ${added} ${added}`), added);
    assert.equal(getContinuation(existing, `맡은 역할을 책임 있게 수행함! ${added}`), added);
    assert.equal(getContinuation(existing, existing), "");
    assert.equal(getContinuation(existing, NO_NEW_RECORD_CONTENT), "");
});

test("prefix matches do not remove words from a different sentence or truncate a date", () => {
    assert.equal(getContinuation("협력함", "협력함을 통해 공동의 해결책을 찾음."), "협력함을 통해 공동의 해결책을 찾음.");
    const existing = "2026. 3. 2.에 학급행사에 참여함.";
    const added = "2026. 3. 6.에 친구에게 활동 순서를 설명함.";
    assert.equal(getContinuation(existing, `${existing} ${added}`), added);
});

test("append preserves the original including internal whitespace and joins with one space", () => {
    const original = "  첫 문장.\n둘째 문장.";
    assert.equal(appendRecordText(`${original} \n`, " \n 새 문장."), `${original} 새 문장.`);
    assert.equal(appendRecordText(`${original} \n`, ""), `${original} \n`);
    assert.equal(appendRecordText(" \n", " 새 문장."), "새 문장.");
});

test("a decision can select only supplied evidence IDs or report no new evidence", () => {
    const evidence = [{ id: "keyword-0", label: "협동심" }, { id: "keyword-1", label: "배려심" }];
    assert.deepEqual([...parseContinuationDecision('{"useIds":["keyword-1","keyword-1"]}', evidence)], ["keyword-1"]);
    assert.equal(parseContinuationDecision('{"useIds":[]}', evidence).size, 0);
    for (const result of ['{}', '{"useIds":["invented"]}', '{"useIds":[1]}', 'not json']) {
        assert.throws(() => parseContinuationDecision(result, evidence), /기존 기록은 유지/);
    }
});
