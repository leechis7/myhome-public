import { describe, expect, it } from "vitest";
import { DEFAULT_SPAM_PROMPT, readSpam, renderSpamPrompt } from "@/lib/posts/spam";

/** 방명록 · 댓글 스팸 거르기(MYH-252) */
describe("스팸 판정(MYH-252)", () => {
  it("프롬프트에 자리 · 이름 · 글을 넣는다", () => {
    const out = renderSpamPrompt(DEFAULT_SPAM_PROMPT, { where: "guestbook", author: "길동", body: "안녕하세요" });
    expect(out).toContain("방명록");
    expect(out).toContain("이름: 길동");
    expect(out).toContain("글: 안녕하세요");
    expect(renderSpamPrompt("{자리}", { where: "comment", author: "a", body: "b" })).toBe("글 댓글\n\n글: b");
  });

  it("spam 일 때만 숨긴다. 까닭이 없으면 「스팸」", () => {
    expect(readSpam('{"verdict":"ok","reason":""}')).toBeNull();
    expect(readSpam('{"verdict":"spam","reason":" 도박  광고 "}')).toEqual({ reason: "도박 광고" });
    expect(readSpam('{"verdict":"spam"}')).toEqual({ reason: "스팸" });
    expect(readSpam('{"verdict":"maybe"}')).toBeNull();
  });
});
