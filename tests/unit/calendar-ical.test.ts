import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eventsBetween, groupByDay } from "@/lib/my-space/calendar-ical";

const ics = readFileSync("tests/unit/fixtures/calendar.ics", "utf8");
const kst = (s: string) => new Date(`${s}+09:00`);

describe("iCal 일정 읽기(MYH-214)", () => {
  const events = eventsBetween(ics, kst("2026-10-05T00:00:00"), kst("2026-10-19T00:00:00"));
  const titles = events.map((e) => e.title);

  it("시간대 · 종일 · UTC 일정을 바르게 읽는다", () => {
    const dentist = events.find((e) => e.title === "치과")!;
    expect(dentist.start.toISOString()).toBe("2026-10-08T05:00:00.000Z");
    expect(dentist.location).toBe("동네 치과");
    expect(dentist.allDay).toBe(false);

    const trip = events.find((e) => e.title === "여행")!;
    expect(trip.allDay).toBe(true);
    expect([trip.startDay, trip.endDay]).toEqual(["2026-10-09", "2026-10-11"]);

    expect(events.find((e) => e.title === "UTC 일정")!.start.toISOString()).toBe(
      "2026-10-08T00:00:00.000Z",
    );
  });

  it("반복을 펼치고, 뺀 회차 · 옮긴 회차를 따른다", () => {
    const weekly = events.filter((e) => e.title.startsWith("주간 회의"));
    // 10/5 월 · 10/7 수 · (10/12 월 뺌) · 10/14 수 → 10시로 옮김 · 10/19 월은 창 밖
    expect(weekly.map((e) => [e.title, e.start.toISOString()])).toEqual([
      ["주간 회의", "2026-10-05T00:00:00.000Z"],
      ["주간 회의", "2026-10-07T00:00:00.000Z"],
      ["주간 회의(옮김)", "2026-10-14T01:00:00.000Z"],
    ]);
  });

  it("취소된 일정은 빼고, 시작순으로 준다", () => {
    expect(titles).not.toContain("취소된 약속");
    const starts = events.map((e) => e.start.getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("날짜별로 묶으면 여러 날 일정은 걸친 날마다 나온다", () => {
    const days = groupByDay(events, ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(days.map((d) => [d.day, d.events.map((e) => e.title)])).toEqual([
      ["2026-10-08", ["UTC 일정", "치과"]],
      ["2026-10-09", ["여행"]],
      ["2026-10-10", ["여행"]],
      ["2026-10-11", []],
    ]);
  });
});

describe("캘린더 주소 줄 읽기(MYH-214)", async () => {
  const { parseCalendarLine } = await import("@/lib/my-space/calendar");

  it("앞은 이름, 끝은 주소", () => {
    expect(parseCalendarLine("회사 https://calendar.google.com/x/basic.ics")).toEqual({
      name: "회사",
      url: "https://calendar.google.com/x/basic.ics",
    });
    expect(parseCalendarLine("  https://a.example/b.ics ")).toEqual({
      name: "",
      url: "https://a.example/b.ics",
    });
    expect(parseCalendarLine("내 개인 일정 webcal://a.example/b.ics")?.name).toBe("내 개인 일정");
  });

  it("주소가 없거나 http 면 받지 않는다", () => {
    expect(parseCalendarLine("회사")).toBeNull();
    expect(parseCalendarLine("http://a.example/b.ics")).toBeNull();
    expect(parseCalendarLine("회사 http://a.example/b.ics")).toBeNull();
  });
});

describe("음력 반복(RDATE 를 UTC 0시로 적은 종일 일정)", () => {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:test
BEGIN:VEVENT
UID:lunar1
DTSTART;VALUE=DATE:20251117
DTEND;VALUE=DATE:20251118
RDATE:20251117T000000Z
RDATE:20261127T000000Z
SUMMARY:음력 생일
END:VEVENT
END:VCALENDAR`;

  it("그 날 하루의 종일 일정이고, DTSTART 와 같은 RDATE 는 한 번만", () => {
    const ev = eventsBetween(ics, new Date("2025-11-01T00:00:00+09:00"), new Date("2026-12-31T00:00:00+09:00"));
    expect(ev.map((e) => [e.allDay, e.startDay, e.endDay])).toEqual([
      [true, "2025-11-17", "2025-11-18"],
      [true, "2026-11-27", "2026-11-28"],
    ]);
    expect(groupByDay(ev, ["2026-11-27", "2026-11-28"]).map((g) => g.events.length)).toEqual([1, 0]);
  });
});
