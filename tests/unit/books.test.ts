import { describe, expect, it } from "vitest";
import { groupByYear, parseRating, stars } from "@/lib/books";

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
