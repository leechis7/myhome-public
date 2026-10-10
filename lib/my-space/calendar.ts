import { eq } from "drizzle-orm";
import { getDb, siteSettings } from "@/lib/db";
import { eventsBetween, type CalendarEvent } from "@/lib/my-space/calendar-ical";
import { decryptText, encryptText } from "@/lib/security/secret-crypto";

/**
 * 일정(MYH-214). 구글 캘린더의 iCal 비공개 주소를 읽어 보여 준다. 일정을
 * 만들고 고치는 것은 구글에서 한다 — 여기는 읽기만이다.
 *
 * 주소는 암호화해서 사이트 설정에 둔다. 주소만 알면 누구나 일정을 읽으니
 * 비밀번호처럼 다룬다 — 화면에 다시 보여 주지 않는다.
 */

/** 구글에서 새로 받아 오는 간격 */
const FRESH_MS = 5 * 60 * 1000;

/** 캘린더 하나. 이름은 일정 옆에 붙는 표시(개인 · 회사 같은 것), 비울 수 있다 */
export type CalendarSource = { name: string; url: string };

/**
 * 한 줄을 읽는다: 「회사 https://…/basic.ics」 처럼 앞은 이름, 끝은 주소.
 * 주소만 있어도 된다. 주소가 없으면 null.
 */
export function parseCalendarLine(line: string): CalendarSource | null {
  const m = line.trim().match(/^(.*?)\s*((?:https|webcal):\/\/\S+)$/);
  if (!m || !isIcalUrl(m[2])) return null;
  return { name: m[1].trim().slice(0, 20), url: m[2] };
}

/** 저장된 캘린더들. 없거나 열 수 없으면 빈 배열 */
export async function getCalendars(): Promise<CalendarSource[]> {
  const [row] = await getDb()
    .select({ calendarIcal: siteSettings.calendarIcal })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!row?.calendarIcal) return [];
  try {
    const parsed: unknown = JSON.parse(decryptText(row.calendarIcal));
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): CalendarSource[] => {
      if (typeof item === "string") return [{ name: "", url: item }];
      if (item && typeof item === "object" && "url" in item) {
        const { name, url } = item as { name?: unknown; url?: unknown };
        return [{ name: String(name ?? ""), url: String(url) }];
      }
      return [];
    });
  } catch {
    return [];
  }
}

/** iCal 주소처럼 생겼는가. https 만, 구글이 아닌 캘린더(.ics)도 받는다 */
export function isIcalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "webcal:";
  } catch {
    return false;
  }
}

/** 캘린더들을 암호화해 둔다. 빈 배열이면 지운다 */
export async function saveCalendars(list: CalendarSource[]) {
  const value = list.length > 0 ? encryptText(JSON.stringify(list)) : null;
  await getDb()
    .insert(siteSettings)
    .values({ id: 1, calendarIcal: value })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { calendarIcal: value, updatedAt: new Date() },
    });
  cache.clear();
}

/** 받은 글을 잠깐 담아 둔다(서버 안에만). 주소마다 하나 */
const cache = new Map<string, { at: number; text: string }>();

async function fetchIcs(url: string) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.text;
  const res = await fetch(url.replace(/^webcal:/, "https:"), {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("iCal 이 아닙니다");
  cache.set(url, { at: Date.now(), text });
  return text;
}

/**
 * [from, to) 창의 일정을 모든 캘린더에서 모아 시작순으로. 한 캘린더가
 * 실패해도 나머지는 보여 주고, 실패한 수를 알린다(주소는 알리지 않는다).
 */
export async function upcomingEvents(from: Date, to: Date) {
  const list = await getCalendars();
  const results = await Promise.allSettled(
    list.map(async ({ name, url }) =>
      eventsBetween(await fetchIcs(url), from, to).map((e) => ({
        ...e,
        calendar: name || null,
      })),
    ),
  );
  const events: (CalendarEvent & { calendar: string | null })[] = [];
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") events.push(...r.value);
    else failed += 1;
  }
  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { events, calendars: list.length, failed };
}
