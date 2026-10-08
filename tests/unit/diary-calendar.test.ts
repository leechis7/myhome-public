import { describe, expect, it } from "vitest";
import {
  dayLabel,
  isMood,
  monthGrid,
  monthRange,
  parseDay,
  parseMonth,
  shiftMonth,
} from "@/lib/diary-calendar";

describe("일기장 날짜(MYH-213)", () => {
  it("있는 날만 받는다", () => {
    expect(parseDay("2026-10-08")).toBe("2026-10-08");
    expect(parseDay("2028-02-29")).toBe("2028-02-29");
    for (const bad of ["2026-02-30", "2026-13-01", "2026-1-8", "오늘", null, 20261008]) {
      expect(parseDay(bad)).toBeNull();
    }
  });

  it("달은 YYYY-MM", () => {
    expect(parseMonth("2026-10")).toBe("2026-10");
    expect(parseMonth("2026-00")).toBeNull();
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth(undefined)).toBeNull();
  });

  it("달을 넘나든다", () => {
    expect(shiftMonth("2026-10", -1)).toBe("2026-09");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });

  it("달력은 일요일부터 일곱 칸씩, 앞뒤는 빈칸", () => {
    // 2026-10-01 은 목요일
    const weeks = monthGrid("2026-10");
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks).toHaveLength(5);
    expect(weeks.at(-1)!.at(-1)).toBe("2026-10-31");
    // 2026-09-30 은 수요일 - 뒤 셋은 빈칸
    expect(monthGrid("2026-09").at(-1)).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", null, null, null]);
  });

  it("날 이름과 기분", () => {
    expect(dayLabel("2026-10-08")).toBe("2026년 10월 8일 (목)");
    expect(isMood("good")).toBe(true);
    expect(isMood("toString")).toBe(false);
    expect(isMood("")).toBe(false);
  });
});
