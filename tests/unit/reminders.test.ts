import { describe, expect, it } from "vitest";
import {
  dueReminders,
  eventReminders,
  reminderMessage,
  todoReminders,
} from "@/lib/my-space/reminders";

const todo = (over: Partial<Parameters<typeof todoReminders>[0]>) => ({
  id: 7,
  title: "독감주사",
  startOn: null,
  dueOn: null,
  startTime: null,
  doneAt: null,
  ...over,
});

const kst = (s: string) => new Date(`${s}+09:00`);

describe("todoReminders (MYH-258)", () => {
  it("마감일만 있으면 그 날 아침 8시", () => {
    const [r, ...rest] = todoReminders(todo({ dueOn: "2026-10-17" }));
    expect(rest).toHaveLength(0);
    expect(r.at).toEqual(kst("2026-10-17T08:00:00"));
    expect(r.lead).toBe("day");
    expect(r.role).toBe("due");
  });

  it("시작일이 따로 있으면 시작일 아침에도", () => {
    const list = todoReminders(todo({ startOn: "2026-10-15", dueOn: "2026-10-17" }));
    expect(list.map((r) => [r.at, r.role])).toEqual([
      [kst("2026-10-15T08:00:00"), "start"],
      [kst("2026-10-17T08:00:00"), "due"],
    ]);
  });

  it("하루짜리에 시작 시각이 있으면 1시간 · 30분 전", () => {
    const list = todoReminders(todo({ dueOn: "2026-10-16", startTime: "19:00:00" }));
    expect(list.map((r) => [r.lead, r.at])).toEqual([
      ["h1", kst("2026-10-16T18:00:00")],
      ["m30", kst("2026-10-16T18:30:00")],
    ]);
  });

  it("끝냈거나 날이 없으면 없다", () => {
    expect(todoReminders(todo({ dueOn: "2026-10-16", doneAt: new Date() }))).toEqual([]);
    expect(todoReminders(todo({}))).toEqual([]);
  });
});

describe("eventReminders (MYH-258)", () => {
  const base = { key: "abc", title: "가족 모임", location: null, calendar: "가족" };

  it("종일 일정은 첫날 아침 8시", () => {
    const [r] = eventReminders({
      ...base,
      allDay: true,
      start: kst("2026-10-18T00:00:00"),
      end: kst("2026-10-20T00:00:00"),
      startDay: "2026-10-18",
      endDay: "2026-10-20",
    });
    expect(r.at).toEqual(kst("2026-10-18T08:00:00"));
  });

  it("시각 일정은 1시간 · 30분 전", () => {
    const list = eventReminders({
      ...base,
      allDay: false,
      start: kst("2026-10-16T14:00:00"),
      end: kst("2026-10-16T15:00:00"),
      startDay: null,
      endDay: null,
    });
    expect(list.map((r) => r.at)).toEqual([kst("2026-10-16T13:00:00"), kst("2026-10-16T13:30:00")]);
  });
});

describe("dueReminders · reminderMessage (MYH-258)", () => {
  const list = [
    ...todoReminders(todo({ dueOn: "2026-10-16" })),
    ...todoReminders(todo({ id: 8, title: "운동", dueOn: "2026-10-16", startTime: "19:00:00" })),
  ];

  it("때가 지났고 10분 안인 것만", () => {
    expect(dueReminders(list, kst("2026-10-16T07:59:00"))).toHaveLength(0);
    expect(dueReminders(list, kst("2026-10-16T08:00:00"))).toHaveLength(1);
    expect(dueReminders(list, kst("2026-10-16T08:09:00"))).toHaveLength(1);
    expect(dueReminders(list, kst("2026-10-16T08:11:00"))).toHaveLength(0);
    expect(dueReminders(list, kst("2026-10-16T18:30:30")).map((r) => r.lead)).toEqual(["m30"]);
  });

  it("아침 묶음과 시각 알림을 한 글로", () => {
    const text = reminderMessage([
      ...dueReminders(list, kst("2026-10-16T08:00:00")),
      ...dueReminders(list, kst("2026-10-16T18:00:00")),
    ]);
    expect(text).toBe("📅 오늘\n· 독감주사 (할 일 · 마감)\n\n⏰ 1시간 뒤 19:00 · 운동 (할 일)");
  });

  it("열쇠는 무엇 · 몇 분 전 · 보낼 때로 갈린다", () => {
    const keys = list.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toBe("todo:7:day:2026-10-15T23:00Z");
  });
});
