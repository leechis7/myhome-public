import ICAL from "ical.js";

/**
 * iCal(.ics) 글에서 일정을 꺼낸다(MYH-214). 네트워크 · DB 를 보지 않아
 * 따로 시험한다.
 *
 * - 시간대: 캘린더에 실린 VTIMEZONE 을 먼저 등록해 TZID 를 바르게 읽는다
 * - 종일 일정: 날짜만(DTSTART;VALUE=DATE). 끝 날은 그 날을 넣지 않는다(iCal 규칙)
 * - 반복: RRULE 을 창 안에서 펼친다. 한 번만 바꾼 회차(RECURRENCE-ID)와
 *   뺀 회차(EXDATE)도 따른다
 */

export type CalendarEvent = {
  /** 같은 일정의 회차를 가르는 열쇠 */
  key: string;
  title: string;
  location: string | null;
  allDay: boolean;
  /** 시각 일정: 시작 · 끝 순간. 종일 일정: 그 날 0시(한국)로 맞춘 값 */
  start: Date;
  end: Date;
  /** 종일 일정의 첫날 · 끝날 다음 날(YYYY-MM-DD). 시각 일정은 null */
  startDay: string | null;
  endDay: string | null;
};

/** 펼치다 멈출 횟수. 잘못 만든 RRULE 이 끝없이 돌지 않게 */
const MAX_OCCURRENCES = 2000;

function dayString(t: ICAL.Time) {
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}

function seoulMidnight(day: string) {
  return new Date(`${day}T00:00:00+09:00`);
}

function toEvent(
  event: ICAL.Event,
  start: ICAL.Time,
  end: ICAL.Time,
  key: string,
): CalendarEvent {
  const allDay = start.isDate;
  const startDay = allDay ? dayString(start) : null;
  const endDay = allDay ? dayString(end) : null;
  return {
    key,
    title: event.summary?.trim() || "(제목 없음)",
    location: event.location?.trim() || null,
    allDay,
    start: allDay ? seoulMidnight(startDay!) : start.toJSDate(),
    end: allDay ? seoulMidnight(endDay!) : end.toJSDate(),
    startDay,
    endDay,
  };
}

function overlaps(e: CalendarEvent, from: Date, to: Date) {
  // 끝이 시작과 같은(0분) 일정도 그 순간이 창 안이면 넣는다
  return e.start < to && (e.end > from || (e.end.getTime() === e.start.getTime() && e.start >= from));
}

/** .ics 글에서 [from, to) 창에 걸치는 일정을 시작순으로 */
export function eventsBetween(ics: string, from: Date, to: Date): CalendarEvent[] {
  const root = new ICAL.Component(ICAL.parse(ics));

  for (const tz of root.getAllSubcomponents("vtimezone")) {
    const zone = new ICAL.Timezone(tz);
    if (zone.tzid && !ICAL.TimezoneService.has(zone.tzid)) {
      ICAL.TimezoneService.register(zone);
    }
  }

  const all = root.getAllSubcomponents("vevent").map((c) => new ICAL.Event(c));
  // 한 회차만 바꾼 것(RECURRENCE-ID)은 본 일정에 붙인다
  const masters = new Map<string, ICAL.Event>();
  for (const e of all) if (!e.isRecurrenceException()) masters.set(e.uid, e);
  for (const e of all) {
    if (e.isRecurrenceException()) masters.get(e.uid)?.relateException(e);
  }

  const out: CalendarEvent[] = [];
  const toTime = ICAL.Time.fromJSDate(to, true);
  for (const event of masters.values()) {
    if (!event.startDate) continue;
    // 취소된 일정은 뺀다
    if (event.component.getFirstPropertyValue("status") === "CANCELLED") continue;

    if (!event.isRecurring()) {
      const e = toEvent(event, event.startDate, event.endDate ?? event.startDate, event.uid);
      if (overlaps(e, from, to)) out.push(e);
      continue;
    }

    const it = event.iterator();
    for (let i = 0, next = it.next(); next && i < MAX_OCCURRENCES; i += 1, next = it.next()) {
      if (next.compare(toTime) >= 0) break;
      const d = event.getOccurrenceDetails(next);
      const e = toEvent(d.item, d.startDate, d.endDate, `${event.uid}@${next.toString()}`);
      if (d.item.component.getFirstPropertyValue("status") === "CANCELLED") continue;
      if (overlaps(e, from, to)) out.push(e);
    }
  }

  return out.sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() ||
      Number(b.allDay) - Number(a.allDay) ||
      a.title.localeCompare(b.title, "ko"),
  );
}

/**
 * 일정을 한국 날짜별로 묶는다. 여러 날 걸친 일정은 걸친 날마다 넣는다.
 * days 는 보여 줄 날들(YYYY-MM-DD)이다.
 */
export function groupByDay<T extends CalendarEvent>(events: T[], days: string[]) {
  return days.map((day) => {
    const from = seoulMidnight(day);
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    return { day, events: events.filter((e) => overlaps(e, from, to)) };
  });
}
