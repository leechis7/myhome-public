import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/format";

describe("formatDateTime", () => {
  it("한국 시각으로 보여준다", () => {
    // 2026-09-05 05:30 UTC = 한국 시각 오후 2:30
    const text = formatDateTime(new Date("2026-09-05T05:30:00Z"));
    expect(text).toContain("2026");
    expect(text).toContain("9월 5일");
    expect(text).toContain("2:30");
  });

  it("자정을 넘겨도 날짜가 한국 기준으로 나온다", () => {
    // 2026-09-05 16:00 UTC = 한국 시각 9월 6일 새벽 1시
    const text = formatDateTime(new Date("2026-09-05T16:00:00Z"));
    expect(text).toContain("9월 6일");
  });
});
