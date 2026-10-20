import { describe, expect, it } from "vitest";
import { briefingText, spokenTime } from "@/lib/my-space/briefing";

describe("오늘 듣기 (MYH-272)", () => {
  it("시각을 말하기 좋게", () => {
    expect(spokenTime(new Date("2026-10-20T15:00:00+09:00"))).toBe("오후 3시");
    expect(spokenTime(new Date("2026-10-20T09:30:00+09:00"))).toBe("오전 9시 30분");
  });

  it("할 일 · 넘긴 것 · 일정 · 메시지를 짧게", () => {
    expect(
      briefingText({
        dayLabel: "10월 20일 화요일",
        late: ["독감주사"],
        today: ["오후 7시 운동"],
        events: ["오후 3시 주간 회의"],
        unread: 2,
      }),
    ).toBe(
      "오늘은 10월 20일 화요일입니다. 오늘 할 일은 1개, 오후 7시 운동. 마감을 넘긴 할 일이 1개 있습니다. 독감주사. 일정은 1개, 오후 3시 주간 회의. 읽지 않은 메시지가 2개 있습니다.",
    );
  });

  it("없는 것은 없다고, 많으면 다섯까지", () => {
    const text = briefingText({
      dayLabel: "d",
      late: [],
      today: ["1", "2", "3", "4", "5", "6", "7"],
      events: [],
      unread: 0,
    });
    expect(text).toContain("오늘 할 일은 7개, 1, 2, 3, 4, 5, 그 밖에 2개.");
    expect(text).toContain("오늘 일정은 없습니다.");
    expect(text).not.toContain("메시지");
  });
});
