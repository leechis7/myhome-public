import Link from "next/link";
import type { CalendarEvent } from "@/lib/my-space/calendar-ical";

type Event = CalendarEvent & { calendar?: string | null };

/** 한 시간 칸의 높이(px) */
const HOUR = 44;

const hm = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 그 날 0시(한국)부터 몇 분인가. 그 날 밖이면 0 · 1440 으로 자른다 */
function minutesInDay(at: Date, day: string) {
  const start = new Date(`${day}T00:00:00+09:00`).getTime();
  return Math.min(1440, Math.max(0, Math.round((at.getTime() - start) / 60000)));
}

/**
 * 겹치는 일정을 나란히 놓는다. 시작순으로 보며 비어 있는 첫 줄(lane)에 넣고,
 * 겹침 묶음 안에서 가장 많은 줄 수로 폭을 나눈다.
 */
function layout(events: Event[], day: string) {
  const items = events
    .map((e) => ({ e, top: minutesInDay(e.start, day), bottom: Math.max(minutesInDay(e.end, day), minutesInDay(e.start, day) + 20) }))
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom);
  const placed: { e: Event; top: number; bottom: number; lane: number; lanes: number }[] = [];
  let group: typeof placed = [];
  let groupEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1));
    for (const g of group) g.lanes = lanes;
    group = [];
  };
  for (const it of items) {
    if (it.top >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    const used = new Set(group.filter((g) => g.bottom > it.top).map((g) => g.lane));
    let lane = 0;
    while (used.has(lane)) lane += 1;
    const p = { ...it, lane, lanes: 1 };
    group.push(p);
    placed.push(p);
    groupEnd = Math.max(groupEnd, it.bottom);
  }
  flush();
  return placed;
}

/**
 * 일정의 주간 보기(MYH-224). 일 ~ 토 일곱 열, 위에 종일 일정, 아래 시간 칸.
 * 시간 칸은 7시 ~ 23시를 기본으로, 그 밖에 일정이 있으면 넓힌다.
 * 날 머리를 누르면 그 날을 고른다(아래 목록).
 */
export default function WeekView({
  days,
  byDay,
  today,
  selected,
  hrefFor,
}: {
  days: string[];
  byDay: Map<string, Event[]>;
  today: string;
  selected: string;
  hrefFor: (day: string) => string;
}) {
  const timed = days.flatMap((d) => (byDay.get(d) ?? []).filter((e) => !e.allDay).map((e) => ({ e, d })));
  const first = Math.min(7, ...timed.map(({ e, d }) => Math.floor(minutesInDay(e.start, d) / 60)));
  const last = Math.max(23, ...timed.map(({ e, d }) => Math.ceil(minutesInDay(e.end, d) / 60)));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const hasAllDay = days.some((d) => (byDay.get(d) ?? []).some((e) => e.allDay));

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[640px]">
        {/* 날 머리 */}
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-border text-sm">
          <span />
          {days.map((d, i) => {
            const n = Number(d.slice(8));
            const week = "일월화수목금토"[i];
            return (
              <Link
                key={d}
                href={hrefFor(d)}
                aria-current={d === selected ? "date" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-t-md py-1.5 transition-colors hover:bg-foreground/5 ${
                  d === selected ? "bg-foreground/[0.07]" : ""
                }`}
              >
                <span className={`text-xs ${i === 0 ? "text-red-500/80" : "text-muted"}`}>{week}</span>
                <span
                  className={`inline-grid size-7 place-items-center rounded-full tabular-nums ${
                    d === today ? "bg-foreground font-semibold text-background" : ""
                  }`}
                >
                  {n}
                </span>
              </Link>
            );
          })}
        </div>

        {/* 종일 */}
        {hasAllDay ? (
          <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-border">
            <span className="py-1 pr-1 text-right text-[11px] text-muted">종일</span>
            {days.map((d) => (
              <div key={d} className="space-y-0.5 border-l border-border/50 p-0.5">
                {(byDay.get(d) ?? [])
                  .filter((e) => e.allDay)
                  .map((e) => (
                    <p
                      key={e.key}
                      title={e.title}
                      className="truncate rounded bg-sky-500/15 px-1 text-[11px] leading-5 text-sky-800 dark:text-sky-300"
                    >
                      {e.title}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        ) : null}

        {/* 시간 칸 */}
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR }} className="pr-1 text-right text-[11px] leading-none text-muted">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d}
              className={`relative border-l border-border/50 ${d === today ? "bg-foreground/[0.02]" : ""}`}
              style={{ height: hours.length * HOUR }}
            >
              {hours.map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t border-border/40" style={{ top: i * HOUR }} />
              ))}
              {layout((byDay.get(d) ?? []).filter((e) => !e.allDay), d).map(({ e, top, bottom, lane, lanes }) => (
                <div
                  key={e.key}
                  title={`${hm.format(e.start)}–${hm.format(e.end)} ${e.title}${e.location ? ` · ${e.location}` : ""}`}
                  className="absolute overflow-hidden rounded border border-sky-500/40 bg-sky-500/10 px-1 text-[11px] leading-4"
                  style={{
                    top: ((top - first * 60) / 60) * HOUR,
                    height: Math.max(18, ((bottom - top) / 60) * HOUR - 2),
                    left: `calc(${(lane / lanes) * 100}% + 1px)`,
                    width: `calc(${100 / lanes}% - 2px)`,
                  }}
                >
                  <span className="tabular-nums text-muted">{hm.format(e.start)}</span>{" "}
                  <span className="font-medium">{e.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
