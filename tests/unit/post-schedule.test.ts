import { describe, expect, it } from "vitest";
import {
  futureSchedule,
  parseSchedule,
  toScheduleInput,
} from "@/lib/posts/schedule";

describe("예약 시각(MYH-194)", () => {
  it("칸의 값을 한국 시각으로 읽는다", () => {
    expect(parseSchedule("2026-10-03T09:00")?.toISOString()).toBe(
      "2026-10-03T00:00:00.000Z",
    );
  });

  it("비었거나 모양이 틀리면 없는 것으로 본다", () => {
    expect(parseSchedule("")).toBeNull();
    expect(parseSchedule("2026-10-03")).toBeNull();
    expect(parseSchedule("내일 아침")).toBeNull();
  });

  it("앞날만 예약이다", () => {
    const now = new Date("2026-10-02T00:00:00Z");
    expect(futureSchedule("2026-10-03T09:00", now)).not.toBeNull();
    expect(futureSchedule("2026-10-02T09:00", now)).toBeNull(); // 바로 지금
    expect(futureSchedule("2026-10-01T09:00", now)).toBeNull();
  });

  it("시각을 칸에 넣을 모양으로 되돌린다", () => {
    expect(toScheduleInput(new Date("2026-10-03T00:00:00Z"))).toBe(
      "2026-10-03T09:00",
    );
    // 날이 넘어가는 자리
    expect(toScheduleInput(new Date("2026-10-02T15:30:00Z"))).toBe(
      "2026-10-03T00:30",
    );
  });
});
