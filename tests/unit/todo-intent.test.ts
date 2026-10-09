import { describe, expect, it } from "vitest";
import { guessTodo, looksLikeTask } from "@/lib/todo-intent";

// 2026-10-10 은 토요일이다
const today = "2026-10-10";

describe("말 없이 온 글이 할 일인가 - 규칙(MYH-230)", () => {
  it("날짜가 있고 할 일처럼 생기면 할 일", () => {
    expect(guessTodo("내일 우유 사기", today)).toEqual({ title: "우유 사기", startOn: null, dueOn: "2026-10-11" });
    expect(guessTodo("10/15 보고서", today)).toMatchObject({ title: "보고서", dueOn: "2026-10-15" });
    expect(guessTodo("다음 주 월요일 회의", today)).toMatchObject({ dueOn: "2026-10-12" });
    expect(guessTodo("10/12~10/15 출장", today)).toMatchObject({ startOn: "2026-10-12", dueOn: "2026-10-15" });
    expect(guessTodo("내일 병원 가야 한다", today)).toMatchObject({ dueOn: "2026-10-11" });
    expect(guessTodo("금요일까지 서류 제출함", today)).toMatchObject({ title: "서류 제출함" });
  });

  it("이야기 · 물음은 날짜가 있어도 아니다", () => {
    for (const text of ["오늘 날씨 좋다", "내일 비 오네", "오늘 진짜 피곤하네요", "내일 뭐 하지?", "오늘 재밌었음ㅋㅋ", "금요일 최고!"]) {
      expect(guessTodo(text, today)).toBeNull();
    }
  });

  it("날짜가 없으면 규칙으로는 할 일이 아니다", () => {
    expect(guessTodo("우유 사기", today)).toBeNull();
  });

  it("말끝 보기", () => {
    expect(looksLikeTask("우유 사기")).toBe(true);
    expect(looksLikeTask("날씨 좋다")).toBe(false);
    expect(looksLikeTask("서류 내야 한다")).toBe(true);
  });
});
