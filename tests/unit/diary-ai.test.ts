import { describe, expect, it } from "vitest";
import { DEFAULT_DIARY_PROMPT, isOn, renderDiaryPrompt } from "@/lib/my-space/diary-ai";

/** 그날 메모로 일기 초안(MYH-250) */
describe("일기 초안(MYH-250)", () => {
  it("프롬프트에 날짜(요일)와 메모를 시각과 함께 넣는다", () => {
    const out = renderDiaryPrompt(DEFAULT_DIARY_PROMPT, {
      day: "2026-10-13",
      memos: [
        { at: "09:10", text: "아침에 달리기" },
        { at: "21:00", text: "책 읽음\n좋았다" },
      ],
    });
    expect(out).toContain("2026년 10월 13일(화)");
    expect(out).toContain("- [09:10] 아침에 달리기\n- [21:00] 책 읽음 좋았다");
  });

  it("{메모} 자리가 없으면 맨 끝에 붙인다", () => {
    expect(renderDiaryPrompt("{날짜} 일기", { day: "2026-10-12", memos: [{ at: "10:00", text: "a" }] })).toBe(
      "2026년 10월 12일(월) 일기\n\n메모:\n- [10:00] a",
    );
  });

  it("켬 글자는 on · true · 1 · yes", () => {
    expect(["on", "TRUE", "1", "yes", " on "].every((v) => isOn(v))).toBe(true);
    expect([null, undefined, "", "off", "0", "no"].some((v) => isOn(v))).toBe(false);
  });
});
