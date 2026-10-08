import { describe, expect, it } from "vitest";
import { noteTitle } from "@/lib/notes";

describe("noteTitle", () => {
  it("첫 줄을 쓴다", () => {
    expect(noteTitle("오늘 배운 것\n\n두 번째 줄")).toBe("오늘 배운 것");
  });

  it("마크다운 표시는 떼어 낸다", () => {
    expect(noteTitle("## 제목처럼 쓴 줄")).toBe("제목처럼 쓴 줄");
    expect(noteTitle("- 목록으로 시작")).toBe("목록으로 시작");
  });

  it("빈 줄은 건너뛴다", () => {
    expect(noteTitle("\n\n  \n실제 내용")).toBe("실제 내용");
  });

  it("길면 자르고 … 를 붙인다", () => {
    const long = "가".repeat(80);
    const title = noteTitle(long, 10);
    expect(title).toBe(`${"가".repeat(10)}…`);
  });

  it("본문이 비면 빈 문자열이다", () => {
    expect(noteTitle("   ")).toBe("");
  });
});
