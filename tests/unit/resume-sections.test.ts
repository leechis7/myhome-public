import { describe, expect, it } from "vitest";
import {
  ageOn,
  careerYears,
  dotted,
  todayInSeoul,
} from "@/lib/resume-sections";

describe("이력서 셈(MYH-198)", () => {
  it("만 나이는 생일이 지나야 오른다", () => {
    // 보기 값이다. 누구의 생일도 아니다
    expect(ageOn("1980-03-15", "2025-11-07")).toBe(45);
    expect(ageOn("1980-03-15", "2026-03-14")).toBe(45);
    expect(ageOn("1980-03-15", "2026-03-15")).toBe(46);
    expect(ageOn("1980-03-15", "2026-10-03")).toBe(46);
  });

  it("전산 경력은 시작한 달부터 꽉 찬 해", () => {
    expect(careerYears("2005-09-01", "2025-11-07")).toBe(20);
    expect(careerYears("2005-09-01", "2026-08-31")).toBe(20);
    expect(careerYears("2005-09-01", "2026-09-01")).toBe(21);
  });

  it("날짜는 점으로 적는다. 한국 날짜로 오늘", () => {
    expect(dotted("1997-03")).toBe("1997.03");
    expect(dotted("1997-10-04")).toBe("1997.10.04");
    expect(dotted(null)).toBe("");
    expect(todayInSeoul(new Date("2026-10-02T16:00:00Z"))).toBe("2026-10-03");
  });
});
