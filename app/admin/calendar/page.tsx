import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/Container";
import WeekView from "@/components/admin/calendar/WeekView";
import { isAdmin } from "@/lib/auth";
import { getCalendars, upcomingEvents } from "@/lib/calendar";
import { groupByDay, type CalendarEvent } from "@/lib/calendar-ical";
import {
  dayLabel,
  monthGrid,
  monthLabel,
  parseDay,
  parseMonth,
  shiftMonth,
} from "@/lib/diary-calendar";
import { todayInSeoul } from "@/lib/resume-sections";
import { hasSecretKey } from "@/lib/secret-crypto";

export const metadata: Metadata = {
  title: "일정",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** 달력 칸에 보일 일정 수. 넘치면 「+n」 */
const PER_CELL = 3;

const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";

/** 2026-10-08 의 n 일 앞뒤 */
function shiftDay(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 그 날이 든 주(일 ~ 토) */
function weekOf(day: string) {
  const sunday = shiftDay(day, -new Date(`${day}T00:00:00Z`).getUTCDay());
  return Array.from({ length: 7 }, (_, i) => shiftDay(sunday, i));
}

const time = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function when(event: CalendarEvent) {
  if (event.allDay) return "종일";
  return `${time.format(event.start)}–${time.format(event.end)}`;
}

/**
 * 일정(MYH-214). 구글 캘린더를 읽어 한 달 달력으로 보여 주고(MYH-221), 고른
 * 날의 일정을 아래에 자세히 늘어놓는다. 만들고 고치는 것은 구글에서 한다.
 */
export default async function CalendarPage({
  searchParams,
}: PageProps<"/admin/calendar">) {
  if (!(await isAdmin())) redirect("/admin");
  if (!hasSecretKey()) notFound();

  const params = await searchParams;
  const today = todayInSeoul();
  const picked = parseDay(params.day);
  const month = parseMonth(params.month) ?? picked?.slice(0, 7) ?? today.slice(0, 7);
  // 고른 날이 그 달이 아니면 오늘(그 달이면), 아니면 그 달 1일
  const day =
    picked && picked.startsWith(month)
      ? picked
      : today.startsWith(month)
        ? today
        : `${month}-01`;

  // 월간 · 주간(MYH-224). 고른 보기는 주소에 남긴다
  const view = params.view === "week" ? "week" : "month";
  const weeks = monthGrid(month);
  const weekDays = weekOf(day);
  const cells =
    view === "week" ? weekDays : weeks.flat().filter((d): d is string => d !== null);
  const from = new Date(`${cells[0]}T00:00:00+09:00`);
  const to = new Date(new Date(`${cells.at(-1)}T00:00:00+09:00`).getTime() + 24 * 60 * 60 * 1000);

  const urls = await getCalendars();
  const { events, failed } = urls.length > 0
    ? await upcomingEvents(from, to)
    : { events: [], failed: 0 };
  const byDay = new Map(groupByDay(events, cells).map((g) => [g.day, g.events]));
  const selected = byDay.get(day) ?? [];
  const href = (q: { month?: string; day?: string; view?: string }) =>
    `/admin/calendar?${new URLSearchParams(
      { ...(view === "week" ? { view } : {}), ...q } as Record<string, string>,
    ).toString()}`;
  const dayHref = (d: string) => href({ month: d.slice(0, 7), day: d });

  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">일정</h1>
        <p className="text-sm text-muted">
          구글 캘린더에서 읽어 옵니다(5분마다) ·{" "}
          <Link href="/admin/site#calendar" className="underline underline-offset-4">
            연결 설정
          </Link>
        </p>
      </div>

      {urls.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          아직 캘린더가 연결돼 있지 않습니다.{" "}
          <Link href="/admin/site#calendar" className="underline underline-offset-4">
            관리 › 설정 › 사이트
          </Link>
          에서 구글 캘린더 주소를 넣으세요.
        </p>
      ) : (
        <>
          {failed > 0 ? (
            <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
              캘린더 {failed}개를 읽지 못했습니다. 주소가 바뀌었는지 확인하세요.
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
            <Link
              href={view === "week" ? dayHref(shiftDay(day, -7)) : href({ month: shiftMonth(month, -1) })}
              className={button}
              aria-label={view === "week" ? "이전 주" : "이전 달"}
            >
              ←
            </Link>
            <h2 className="text-lg font-semibold tabular-nums">
              {view === "week"
                ? `${monthLabel(weekDays[0].slice(0, 7))} ${Number(weekDays[0].slice(8))}일 ~ ${
                    weekDays[6].slice(5, 7) === weekDays[0].slice(5, 7) ? "" : `${Number(weekDays[6].slice(5, 7))}월 `
                  }${Number(weekDays[6].slice(8))}일`
                : monthLabel(month)}
            </h2>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="보기" className="flex rounded-lg border border-border p-0.5 text-sm">
                <Link
                  href={`/admin/calendar?${new URLSearchParams({ month, day }).toString()}`}
                  aria-current={view === "month" ? "page" : undefined}
                  className={`rounded-md px-2.5 py-1 ${view === "month" ? "bg-foreground/[0.08] font-medium" : "text-muted"}`}
                >
                  월간
                </Link>
                <Link
                  href={`/admin/calendar?${new URLSearchParams({ view: "week", month, day }).toString()}`}
                  aria-current={view === "week" ? "page" : undefined}
                  className={`rounded-md px-2.5 py-1 ${view === "week" ? "bg-foreground/[0.08] font-medium" : "text-muted"}`}
                >
                  주간
                </Link>
              </div>
              {(view === "week" ? !weekDays.includes(today) : month !== today.slice(0, 7)) ? (
                <Link href={view === "week" ? "/admin/calendar?view=week" : "/admin/calendar"} className={button}>
                  {view === "week" ? "이번 주" : "이번 달"}
                </Link>
              ) : null}
              <Link
                href={view === "week" ? dayHref(shiftDay(day, 7)) : href({ month: shiftMonth(month, 1) })}
                className={button}
                aria-label={view === "week" ? "다음 주" : "다음 달"}
              >
                →
              </Link>
            </div>
          </div>

          {view === "week" ? (
            <WeekView days={weekDays} byDay={byDay} today={today} selected={day} hrefFor={dayHref} />
          ) : (
          <table className="mt-4 w-full table-fixed border-collapse text-sm">
            <caption className="sr-only">{monthLabel(month)} 일정</caption>
            <thead>
              <tr className="text-muted">
                {"일월화수목금토".split("").map((d, i) => (
                  <th key={d} scope="col" className={`py-2 font-normal ${i === 0 ? "text-red-500/80" : ""}`}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, w) => (
                <tr key={w}>
                  {week.map((d, i) => {
                    if (!d) return <td key={i} className="h-20 border border-border/50 bg-foreground/[0.02] sm:h-24" />;
                    const list = byDay.get(d) ?? [];
                    const sorted = [...list].sort((a, b) => Number(b.allDay) - Number(a.allDay));
                    const n = Number(d.slice(8));
                    return (
                      <td key={d} className="h-20 border border-border/50 p-0 align-top sm:h-24">
                        <Link
                          href={href({ month, day: d })}
                          aria-label={`${n}일${list.length ? ` 일정 ${list.length}개` : ""}`}
                          aria-current={d === day ? "date" : undefined}
                          className={`block h-full p-1 transition-colors hover:bg-foreground/5 ${
                            d === day ? "bg-foreground/[0.07]" : ""
                          }`}
                        >
                          <span
                            className={`inline-grid size-6 place-items-center rounded-full text-xs tabular-nums ${
                              d === today
                                ? "bg-foreground font-semibold text-background"
                                : i === 0
                                  ? "text-red-500/80"
                                  : "text-muted"
                            }`}
                          >
                            {n}
                          </span>
                          {/* 넓은 화면: 제목 몇 개 */}
                          <span className="mt-0.5 hidden space-y-0.5 sm:block">
                            {sorted.slice(0, PER_CELL).map((e) => (
                              <span
                                key={e.key}
                                className={`block truncate rounded px-1 text-[11px] leading-4 ${
                                  e.allDay ? "bg-sky-500/15 text-sky-800 dark:text-sky-300" : "text-foreground/80"
                                }`}
                              >
                                {e.allDay ? "" : `${time.format(e.start)} `}
                                {e.title}
                              </span>
                            ))}
                            {sorted.length > PER_CELL ? (
                              <span className="block px-1 text-[11px] text-muted">+{sorted.length - PER_CELL}</span>
                            ) : null}
                          </span>
                          {/* 휴대폰: 점 */}
                          {list.length > 0 ? (
                            <span aria-hidden className="mt-1 flex justify-center gap-0.5 sm:hidden">
                              {list.slice(0, 4).map((e) => (
                                <span key={e.key} className="size-1.5 rounded-full bg-sky-500" />
                              ))}
                            </span>
                          ) : null}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          )}

          <section aria-labelledby="day-heading" className="mt-8">
            <h2 id="day-heading" className="flex items-baseline gap-2 text-sm font-semibold">
              {dayLabel(day).replace(/^\d+년 /, "")}
              {day === today ? (
                <span className="rounded bg-foreground px-1.5 py-0.5 text-xs font-medium text-background">
                  오늘
                </span>
              ) : null}
            </h2>
            {selected.length === 0 ? (
              <p className="mt-2 text-sm text-muted">일정이 없습니다.</p>
            ) : (
              <ul aria-label="고른 날 일정" className="mt-2 divide-y divide-border rounded-xl border border-border">
                {selected.map((event) => (
                  <li key={event.key} className="flex gap-4 px-4 py-2.5 text-sm">
                    <span className="w-24 shrink-0 tabular-nums text-muted">{when(event)}</span>
                    <span className="min-w-0">
                      {event.calendar ? (
                        <span className="mr-2 rounded bg-foreground/[0.06] px-1.5 py-0.5 text-xs text-foreground/60">
                          {event.calendar}
                        </span>
                      ) : null}
                      <span className="font-medium">{event.title}</span>
                      {event.location ? (
                        <span className="block text-xs text-muted">{event.location}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

    </Container>
  );
}
