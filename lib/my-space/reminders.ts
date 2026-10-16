import type { CalendarEvent } from "@/lib/my-space/calendar-ical";
import { hhmm } from "@/lib/my-space/todo-dates";

/**
 * 할 일 · 일정 미리 알림(MYH-258). 언제 무엇을 알릴지만 셈한다 - DB · 네트워크를
 * 보지 않아 따로 시험한다. 보내는 일은 reminder-ticker.ts.
 *
 * - 날만 있는 것(종일): 그 날 아침 8시(한국). 할 일은 마감일, 시작일이 따로
 *   있으면 시작일에도. 여러 날 일정은 첫날만
 * - 시각이 있는 것: 시작 1시간 전 · 30분 전
 */

export type ReminderLead = "day" | "h1" | "m30";

export type Reminder = {
  /** 두 번 보내지 않게 남기는 열쇠 */
  key: string;
  /** 보낼 때 */
  at: Date;
  lead: ReminderLead;
  kind: "todo" | "event";
  title: string;
  /** 시각 일정의 시작. 종일이면 null */
  start: Date | null;
  /** 할 일의 어느 날인가(시작 · 마감). 일정이면 null */
  role: "start" | "due" | null;
  /** 일정이 실린 캘린더 이름 */
  calendar: string | null;
};

/**
 * 이만큼 지난 알림까지는 보낸다. 5분마다 돌므로 그보다 길어야 하고, 앱이 잠깐
 * 꺼졌다 떠도 놓치지 않게 넉넉히 둔다. 더 지난 것은 버린다
 */
export const GRACE_MS = 10 * 60 * 1000;

const LEADS: { lead: ReminderLead; ms: number }[] = [
  { lead: "h1", ms: 60 * 60 * 1000 },
  { lead: "m30", ms: 30 * 60 * 1000 },
];

/** 그 날 아침 8시(한국) */
function morningOf(day: string) {
  return new Date(`${day}T08:00:00+09:00`);
}

function keyOf(kind: string, ref: string, lead: ReminderLead, at: Date) {
  return `${kind}:${ref}:${lead}:${at.toISOString().slice(0, 16)}Z`;
}

function timed(base: Omit<Reminder, "key" | "at" | "lead">, ref: string, start: Date): Reminder[] {
  return LEADS.map(({ lead, ms }) => {
    const at = new Date(start.getTime() - ms);
    return { ...base, key: keyOf(base.kind, ref, lead, at), at, lead };
  });
}

/** 안 끝낸 할 일 하나의 알림들. 끝냈거나 날이 없으면 없다 */
export function todoReminders(todo: {
  id: number;
  title: string | null;
  startOn: string | null;
  dueOn: string | null;
  startTime: string | null;
  doneAt: Date | null;
}): Reminder[] {
  if (todo.doneAt) return [];
  const first = todo.startOn ?? todo.dueOn;
  const last = todo.dueOn ?? todo.startOn;
  if (!first || !last) return [];
  const base = {
    kind: "todo" as const,
    title: todo.title ?? "열 수 없음",
    calendar: null,
  };
  const ref = String(todo.id);
  // 하루짜리에 시작 시각이 있으면 시각 알림
  if (first === last && todo.startTime) {
    const start = new Date(`${first}T${hhmm(todo.startTime)}:00+09:00`);
    return timed({ ...base, start, role: null }, ref, start);
  }
  const days: { day: string; role: "start" | "due" }[] = [];
  if (todo.startOn && todo.startOn !== last) days.push({ day: todo.startOn, role: "start" });
  days.push({ day: last, role: todo.dueOn ? "due" : "start" });
  return days.map(({ day, role }) => {
    const at = morningOf(day);
    return { ...base, start: null, role, key: keyOf("todo", ref, "day", at), at, lead: "day" };
  });
}

/** 캘린더 일정 하나의 알림들 */
export function eventReminders(event: CalendarEvent & { calendar?: string | null }): Reminder[] {
  const base = {
    kind: "event" as const,
    title: event.title,
    calendar: event.calendar ?? null,
    role: null,
  };
  const ref = `${event.calendar ?? ""}/${event.key}`;
  if (event.allDay && event.startDay) {
    const at = morningOf(event.startDay);
    return [{ ...base, start: null, key: keyOf("event", ref, "day", at), at, lead: "day" }];
  }
  return timed({ ...base, start: event.start }, ref, event.start);
}

/** 지금 보낼 것: 보낼 때가 지났고 GRACE_MS 안인 것 */
export function dueReminders(list: Reminder[], now: Date) {
  const t = now.getTime();
  return list.filter((r) => r.at.getTime() <= t && r.at.getTime() > t - GRACE_MS);
}

function seoulClock(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

function line(r: Reminder) {
  const where = r.kind === "todo" ? "할 일" : r.calendar || "일정";
  const role = r.role === "due" ? " · 마감" : r.role === "start" ? " · 시작" : "";
  return `${r.title} (${where}${role})`;
}

/** 한 번에 보낼 글 하나. 아침 묶음이 먼저, 시각 알림은 시작순 */
export function reminderMessage(list: Reminder[]) {
  const day = list.filter((r) => r.lead === "day");
  const soon = list
    .filter((r) => r.lead !== "day")
    .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  const parts: string[] = [];
  if (day.length) {
    parts.push(["📅 오늘", ...day.map((r) => `· ${line(r)}`)].join("\n"));
  }
  for (const r of soon) {
    const lead = r.lead === "h1" ? "1시간 뒤" : "30분 뒤";
    parts.push(`⏰ ${lead} ${r.start ? seoulClock(r.start) : ""} · ${line(r)}`);
  }
  return parts.join("\n\n");
}
