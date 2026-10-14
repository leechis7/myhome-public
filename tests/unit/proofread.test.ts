import { describe, expect, it } from "vitest";
import { applyEdit, DEFAULT_PROOF_PROMPT, readProofEdits, renderProofPrompt } from "@/lib/posts/proofread";

/** 맞춤법 · 문장 다듬기(MYH-253) */
describe("맞춤법 · 문장 다듬기(MYH-253)", () => {
  const content = "오늘은 날씨가 좋았읍니다. 산책을 할려고 나갔다.";

  it("프롬프트에 종류와 본문을 넣는다", () => {
    const out = renderProofPrompt(DEFAULT_PROOF_PROMPT, { kind: "note", content });
    expect(out).toContain("짧은 글");
    expect(out.endsWith(content)).toBe(true);
  });

  it("본문에 그대로 있는 원문만, 같은 것은 하나만 받는다", () => {
    const raw = `네, 여기 있습니다.
{"edits":[
 {"from":"좋았읍니다","to":"좋았습니다","why":"맞춤법"},
 {"from":"할려고","to":"하려고","why":"어미"},
 {"from":"없는 구절","to":"x","why":""},
 {"from":"할려고","to":"하려고","why":"겹침"},
 {"from":"산책","to":"산책","why":"같음"}
]}`;
    expect(readProofEdits(raw, content)).toEqual([
      { from: "좋았읍니다", to: "좋았습니다", why: "맞춤법" },
      { from: "할려고", to: "하려고", why: "어미" },
    ]);
    expect(() => readProofEdits("고칠 곳 없음", content)).toThrow(SyntaxError);
  });

  it("받아들이면 첫 원문 하나만 바뀐다. 원문이 사라졌으면 null", () => {
    expect(applyEdit("a 할려고 b 할려고", { from: "할려고", to: "하려고", why: "" })).toBe("a 하려고 b 할려고");
    expect(applyEdit("abc", { from: "x", to: "y", why: "" })).toBeNull();
  });
});
