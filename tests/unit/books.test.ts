import { describe, expect, it } from "vitest";
import { categoriesOf, groupByYear, isBookStatus, parseRating, stars } from "@/lib/books";

describe("독서 노트의 별점(MYH-211)", () => {
  it("1~5 정수만 받는다", () => {
    expect(parseRating("1")).toBe(1);
    expect(parseRating("5")).toBe(5);
    expect(parseRating(3)).toBe(3);
  });

  it("비우거나 벗어난 값은 매기지 않은 것", () => {
    for (const value of ["", null, undefined, "0", "6", "2.5", "많이"]) {
      expect(parseRating(value)).toBeNull();
    }
  });

  it("별 다섯 칸으로 그린다", () => {
    expect(stars(4)).toBe("★★★★☆");
    expect(stars(1)).toBe("★☆☆☆☆");
    expect(stars(5)).toBe("★★★★★");
  });
});

describe("다 읽은 책 묶기", () => {
  it("끝낸 해로 묶고 날짜 없는 것은 따로", () => {
    const groups = groupByYear([
      { finishedOn: "2026-09-20" },
      { finishedOn: "2025-01-02" },
      { finishedOn: null },
    ]);
    expect(groups.map(([year, rows]) => [year, rows.length])).toEqual([
      ["2026", 1],
      ["2025", 1],
      ["날짜 없음", 1],
    ]);
  });
});

describe("책장의 분류(MYH-225)", () => {
  const book = (
    categoryCode: string | null,
    category: string | null,
    categorySort: number | null,
  ) => ({
    categoryCode,
    category,
    categorySort,
  });

  it("분류마다 책 수를 세고 코드 화면의 순서로 늘어놓는다", () => {
    const found = categoriesOf([
      book("00003", "소설", 30),
      book("00001", "컴퓨터", 10),
      book("00003", "소설", 30),
      book(null, null, null),
    ]);
    expect(found).toEqual([
      { code: "00001", label: "컴퓨터", count: 1 },
      { code: "00003", label: "소설", count: 2 },
    ]);
  });

  it("분류가 없는 책뿐이면 비어 있다", () => {
    expect(categoriesOf([book(null, null, null)])).toEqual([]);
  });
});

describe("책 상태(MYH-227)", () => {
  it("읽고 싶은 책 · 읽는 중 · 다 읽음만 받는다", () => {
    for (const s of ["want", "reading", "read"]) expect(isBookStatus(s)).toBe(true);
    for (const s of ["", "wish", null]) expect(isBookStatus(s)).toBe(false);
  });
});
