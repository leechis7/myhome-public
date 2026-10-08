import { describe, expect, it } from "vitest";
import { formatPeriod } from "@/lib/projects";

describe("formatPeriod", () => {
  it("끝난 프로젝트는 시작과 끝을 보여준다", () => {
    expect(formatPeriod("2024-03-01", "2025-06-30")).toBe("2024.03 — 2025.06");
  });

  it("끝나지 않았으면 진행 중", () => {
    expect(formatPeriod("2026-09-02", null)).toBe("2026.09 — 진행 중");
  });

  it("시작일이 없으면 끝난 달만", () => {
    expect(formatPeriod(null, "2025-06-30")).toBe("2025.06");
  });

  it("날짜가 아예 없으면 빈 문자열", () => {
    expect(formatPeriod(null, null)).toBe("");
  });
});
