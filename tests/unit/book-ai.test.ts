import { describe, expect, it } from "vitest";
import {
  cleanReview,
  DEFAULT_CATEGORY_PROMPT,
  DEFAULT_REVIEW_PROMPT,
  pickCategory,
  renderCategoryPrompt,
  renderReviewPrompt,
} from "@/lib/books/ai";

/** 책에 AI: 한 줄 평 · 분류 제안(MYH-251) */
describe("책 AI(MYH-251)", () => {
  it("한 줄 평 프롬프트에 책 · 별점 · 노트를 넣는다", () => {
    const out = renderReviewPrompt(DEFAULT_REVIEW_PROMPT, { title: "맨먼스 미신", author: "브룩스", note: "노트", rating: 4 });
    expect(out).toContain("「맨먼스 미신」(브룩스)");
    expect(out).toContain("(별점 4/5)");
    expect(out.endsWith("노트")).toBe(true);
    expect(renderReviewPrompt("{제목}", { title: "a", author: "", note: "n", rating: null })).toBe("a\n\nn");
  });

  it("분류 프롬프트에 고를 이름들을 넣는다", () => {
    const out = renderCategoryPrompt(DEFAULT_CATEGORY_PROMPT, {
      title: "t",
      author: "",
      intro: "",
      labels: ["컴퓨터", "소설"],
    });
    expect(out).toContain("분류: 컴퓨터, 소설");
    expect(out).toContain("지은이 모름");
    expect(out).toContain("소개: (없음)");
  });

  it("한 줄 평 답을 다듬는다", () => {
    expect(cleanReview(' 한 줄 평: 「사람을 더 넣으면\n늦어진다.」 ')).toBe("사람을 더 넣으면 늦어진다.");
  });

  it("답한 분류는 목록에 있는 이름일 때만 받는다", () => {
    const codes = [
      { code: "00001", label: "컴퓨터" },
      { code: "00002", label: "Novel" },
    ];
    expect(pickCategory('{"category":"컴퓨터"}', codes)?.code).toBe("00001");
    expect(pickCategory("novel", codes)?.code).toBe("00002");
    expect(pickCategory('{"category":"역사"}', codes)).toBeNull();
    expect(pickCategory('{"category":""}', codes)).toBeNull();
  });
});
