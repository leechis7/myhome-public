/**
 * 할 일의 기간(MYH-228). DB 를 보지 않는 순수한 것들이라 따로 두고 시험한다.
 * 날짜는 모두 서울 날 "2026-10-15" 글자다 - 글자 차례가 날 차례와 같다.
 */

export type TodoRange = {
  startOn: string | null;
  dueOn: string | null;
  /**
   * 시각 "19:00"(MYH-245). 시작 시각은 첫날(시작일, 없으면 마감일), 끝 시각은
   * 마지막 날(마감일)의 것. 둘 다 비울 수 있다
   */
  startTime?: string | null;
  endTime?: string | null;
};

/** 거꾸로 적었으면 바로잡는다(DB 의 todos_range 가 막기 전에) */
export function orderRange({ startOn, dueOn }: TodoRange): TodoRange {
  if (startOn && dueOn && startOn > dueOn) return { startOn: dueOn, dueOn: startOn };
  return { startOn, dueOn };
}

/** 2026-10-08 → 10.8 */
export function shortDay(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${m}.${d}`;
}

/**
 * 목록에 적는 기간. 「10.12 ~ 10.15」 · 「10.12 부터」 · 「10.15」 · 같은 날이면 하나.
 * 시각이 있으면 뒤에 붙인다(「10.15 19:00」 · 「10.15 19:00~21:00」 · 「10.15 ~21:00」)
 */
export function rangeLabel({ startOn, dueOn, startTime, endTime }: TodoRange) {
  const days =
    startOn && dueOn
      ? startOn === dueOn
        ? shortDay(dueOn)
        : `${shortDay(startOn)} ~ ${shortDay(dueOn)}`
      : dueOn
        ? shortDay(dueOn)
        : startOn
          ? `${shortDay(startOn)} 부터`
          : null;
  const at = timeLabel(startTime, endTime);
  return days && at ? `${days} ${at}` : (days ?? at);
}

/**
 * 오늘에 견준 처지. 마감을 넘겼나(late) · 오늘이 마감인가(today) ·
 * 기간 안인가(ongoing) · 아직 시작 전인가(upcoming). 오늘 마감인데 시각(끝 시각,
 * 없으면 시작 시각)까지 지났으면(now 를 주면) 넘김이다.
 */
export function rangeState(
  { startOn, dueOn, startTime, endTime }: TodoRange,
  today: string,
  now?: string,
) {
  if (dueOn && dueOn < today) return "late";
  if (dueOn === today) {
    const until = endTime ?? startTime;
    return until && now && hhmm(until) < now ? "late" : "today";
  }
  if (startOn && startOn > today) return "upcoming";
  if (startOn && startOn <= today) return "ongoing";
  return "plain";
}

/* ───────────────── 글 속의 날짜 읽기(MYH-229) ───────────────── */

/**
 * 텔레그램으로 온 할 일 글에서 날짜를 읽는다. 읽은 말은 제목에서 뺀다.
 *
 *   날 하나          2026-10-15 · 2026.10.15 · 10/15 · 10.15 · 10월 15일
 *                    오늘 · 내일 · 모레 · 글피 · (이번 주 · 다음 주) 금요일
 *   기간             10/12~10/15 · 10/12 부터 10/15 까지 · 10/12-10/15
 *   하나만 있으면    마감일. 「… 부터」 가 붙으면 시작일
 *
 * 해가 없으면 올해, 이미 지난 날이면 내년으로 본다. 기간의 끝이 시작보다
 * 앞이면 끝을 다음 해로 넘긴다(12/30~1/2). 없는 날(2/30)은 날짜로 보지 않는다.
 */
export function readTodoDates(text: string, today: string) {
  const found = [...text.matchAll(DATE_EXPR)]
    .map((m) => ({ m, day: toDay(m, today) }))
    .filter((x): x is { m: RegExpExecArray; day: string } => x.day !== null);
  if (found.length === 0) return { title: text.trim(), startOn: null, dueOn: null };

  const [a, b] = found;
  let startOn: string | null = null;
  let dueOn: string | null = null;
  let cut: [number, number];

  const aEnd = a.m.index + a.m[0].length;
  const between = b ? text.slice(aEnd, b.m.index) : "";
  if (b && RANGE_JOIN.test(between)) {
    startOn = a.day;
    // 해를 안 적은 끝이 시작보다 앞이면 다음 해다
    dueOn = b.day < a.day && !b.m.groups?.y ? addYears(b.day, 1) : b.day;
    cut = [a.m.index, b.m.index + b.m[0].length];
  } else {
    cut = [a.m.index, aEnd];
    if (/^\s*부터/.test(text.slice(aEnd))) startOn = a.day;
    else dueOn = a.day;
  }

  // 뒤에 붙은 「까지 · 부터 · 에 · 에는 · 까지는」 도 같이 뺀다
  const tail = text.slice(cut[1]).match(/^\s*(?:까지는?|부터는?|에는?|중으로|중에)?/);
  cut[1] += tail?.[0].length ?? 0;
  const title = `${text.slice(0, cut[0])} ${text.slice(cut[1])}`
    .replace(/\s+/g, " ")
    .replace(/^[\s,·:\-]+|[\s,·:\-]+$/g, "")
    .trim();
  return { title: title || text.trim(), startOn, dueOn };
}

const NUM_BEFORE = String.raw`(?<![A-Za-z\d./-])`;
const NUM_AFTER = String.raw`(?![\d]|\.\d|[A-Za-z%])`;

const DATE_EXPR = new RegExp(
  [
    // 2026-10-15 · 2026.10.15 · 2026/10/15
    String.raw`${NUM_BEFORE}(?<y>\d{4})[-./](?<m1>\d{1,2})[-./](?<d1>\d{1,2})${NUM_AFTER}`,
    // 10월 15일
    String.raw`${NUM_BEFORE}(?<m2>\d{1,2})\s*월\s*(?<d2>\d{1,2})\s*일`,
    // 10/15 · 10.15
    String.raw`${NUM_BEFORE}(?<m3>\d{1,2})[./](?<d3>\d{1,2})${NUM_AFTER}`,
    // 오늘 · 내일 · 모레 · 글피
    String.raw`(?<rel>오늘|내일|모레|글피)`,
    // (이번 주 · 다음 주 · 담주) 금요일
    String.raw`(?:(?<week>이번\s*주|다음\s*주|담주)\s*)?(?<wd>[월화수목금토일])요일`,
  ].join("|"),
  "gu",
);

/** 기간을 잇는 말 */
const RANGE_JOIN = /^\s*(?:~|〜|-|–|부터|에서)\s*$/;

const REL_DAYS: Record<string, number> = { 오늘: 0, 내일: 1, 모레: 2, 글피: 3 };
const WEEKDAYS = "일월화수목금토";

function toDay(m: RegExpMatchArray, today: string): string | null {
  const g = m.groups ?? {};
  if (g.rel) return addDays(today, REL_DAYS[g.rel]);
  if (g.wd) return weekday(today, WEEKDAYS.indexOf(g.wd), g.week?.replace(/\s/g, ""));
  const month = Number(g.m1 ?? g.m2 ?? g.m3);
  const day = Number(g.d1 ?? g.d2 ?? g.d3);
  if (g.y) return realDay(Number(g.y), month, day);
  const year = Number(today.slice(0, 4));
  const thisYear = realDay(year, month, day);
  if (!thisYear) return null;
  return thisYear < today ? realDay(year + 1, month, day) : thisYear;
}

function realDay(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, n: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function addYears(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  return realDay(y + n, m, d) ?? day;
}

/**
 * 요일. 주는 월요일에 시작한다.
 *   그냥 「금요일」   오늘이거나 오늘 뒤의 가장 가까운 금요일
 *   「이번 주 금요일」 이번 주(월~일)의 금요일
 *   「다음 주 금요일」 다음 주의 금요일
 */
function weekday(today: string, target: number, week?: string) {
  const now = new Date(`${today}T00:00:00Z`).getUTCDay();
  if (!week) return addDays(today, (target - now + 7) % 7);
  const fromMonday = (d: number) => (d + 6) % 7;
  const monday = addDays(today, -fromMonday(now));
  const offset = week === "이번주" ? 0 : 7;
  return addDays(monday, offset + fromMonday(target));
}

/* ───────────────── 시각(MYH-245) ───────────────── */

/** "19:00:00"(DB) · "19:00" → "19:00" */
export function hhmm(time: string) {
  return time.slice(0, 5);
}

/** 「19:00」 · 「19:00~21:00」 · 「~21:00」. 둘 다 없으면 null */
export function timeLabel(startTime?: string | null, endTime?: string | null) {
  if (startTime && endTime) return `${hhmm(startTime)}~${hhmm(endTime)}`;
  if (startTime) return hhmm(startTime);
  if (endTime) return `~${hhmm(endTime)}`;
  return null;
}

/** 서울의 지금 시각 "19:05" */
export function seoulTime(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

/** 폼 · AI 가 준 시각을 "HH:MM" 으로. 아니면 null */
export function parseTime(value: unknown) {
  const m = typeof value === "string" ? value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/) : null;
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? `${String(h).padStart(2, "0")}:${m[2]}` : null;
}

/** 시각만 있고 날이 없으면 오늘 할 일이다 */
export function withTimeDay<T extends TodoRange>(range: T, today: string): T {
  if ((range.startTime || range.endTime) && !range.startOn && !range.dueOn) {
    return { ...range, dueOn: today };
  }
  return range;
}

type Clock = { h: number; min: number; ap?: string; hh: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const clock = ({ h, min }: { h: number; min: number }) => `${pad(h)}:${pad(min)}`;

/** 오전 · 오후 같은 말을 따라 24시간으로 */
function to24({ h, min, ap }: Clock) {
  if (ap === "오후" || ap === "저녁" || ap === "밤") {
    if (h < 12) h += 12;
    else if (ap === "밤" && h === 12) h = 0;
  } else if (ap === "낮") {
    if (h <= 6) h += 12;
  } else if (ap === "오전" || ap === "아침" || ap === "새벽") {
    if (h === 12) h = 0;
  }
  return { h: h === 24 ? 0 : h, min };
}

function toClock(m: RegExpMatchArray): Clock | null {
  const g = m.groups ?? {};
  const h = Number(g.h ?? g.h2);
  const min = g.half ? 30 : Number(g.min ?? g.m2 ?? 0);
  if (h > 24 || min > 59 || (g.h2 && h > 23)) return null;
  return { h, min, ap: g.ap, hh: Boolean(g.h2) };
}

/**
 * 글 속의 시각을 읽는다. 읽은 말은 제목에서 뺀다.
 *
 *   오후 7시 · 저녁 7시 · 밤 11시 · 낮 2시   → 19:00 · 19:00 · 23:00 · 14:00
 *   오전 9시 · 아침 7시 · 새벽 2시           → 09:00 · 07:00 · 02:00
 *   19시 · 7시 반 · 7시 30분 · 19:30         → 19:00 · 07:30 · 07:30 · 19:30
 *   오후 7시~9시 · 7시부터 9시까지 · 19:00-21:00   시작 ~ 끝
 *   오후 6시까지                              끝 시각만
 *
 * 오전 · 오후 없이 1 ~ 11시만 쓴 시작 시각은, 그날(day)이 오늘이고 그 시각이
 * 이미 지났으면 오후로 본다(오후 5시에 받은 「7시 운동」 → 19:00). 끝에 오전 ·
 * 오후가 없으면 시작의 것을 따르고, 그래도 시작보다 앞이면 오후로 넘긴다
 * (11시~1시 → 11:00~13:00). 「3시간」 은 시각이 아니다.
 */
export function readTodoTime(
  text: string,
  { day, today, now }: { day: string; today: string; now: string },
) {
  const none = { title: text.trim(), startTime: null, endTime: null };
  const found = [...text.matchAll(TIME_EXPR)]
    .map((m) => ({ m, c: toClock(m) }))
    .filter((x): x is { m: RegExpExecArray; c: Clock } => x.c !== null);
  if (found.length === 0) return none;

  const [a, b] = found;
  const aEnd = a.m.index + a.m[0].length;
  const isRange = b && RANGE_JOIN.test(text.slice(aEnd, b.m.index));
  const cut: [number, number] = isRange ? [a.m.index, b.m.index + b.m[0].length] : [a.m.index, aEnd];

  let start = to24(a.c);
  // 오전 · 오후 없는 1 ~ 11시: 오늘 이미 지났으면 오후
  if (!a.c.ap && !a.c.hh && a.c.h >= 1 && a.c.h <= 11 && day === today && clock(start) <= now) {
    start = { h: start.h + 12, min: start.min };
  }
  let startTime: string | null = clock(start);
  let endTime: string | null = null;
  if (isRange) {
    let end = to24({ ...b.c, ap: b.c.ap ?? a.c.ap });
    if (clock(end) <= startTime && end.h < 12) end = { h: end.h + 12, min: end.min };
    endTime = clock(end);
  }

  // 뒤에 붙은 말. 「까지」 하나만 붙은 시각은 끝 시각이다(오후 6시까지 보고서)
  const tail = text.slice(cut[1]).match(/^\s*(?:에는?|까지는?|부터는?)?/)?.[0] ?? "";
  if (!isRange && /까지/.test(tail)) {
    endTime = startTime;
    startTime = null;
  }
  cut[1] += tail.length;
  const title = `${text.slice(0, cut[0])} ${text.slice(cut[1])}`
    .replace(/\s+/g, " ")
    .replace(/^[\s,·:\-]+|[\s,·:\-]+$/g, "")
    .trim();
  return { title: title || text.trim(), startTime, endTime };
}

const TIME_EXPR = new RegExp(
  [
    // (오후) 7시 · 7시 반 · 7시 30분. 「3시간」 은 빼고
    String.raw`(?:(?<ap>오전|오후|아침|저녁|밤|낮|새벽)\s*)?(?<![\d:.])(?<h>\d{1,2})\s*시(?!간)(?:\s*(?<half>반)|\s*(?<min>\d{1,2})\s*분)?`,
    // 19:30
    String.raw`(?<![\d:./])(?<h2>\d{1,2}):(?<m2>\d{2})(?![\d:])`,
  ].join("|"),
  "gu",
);

/**
 * 날짜와 시각을 함께 읽는다(텔레그램 할 일). 시각만 있고 날이 없으면 오늘.
 * now 는 서울의 지금 시각 "17:05".
 */
export function readTodo(text: string, today: string, now: string) {
  const dated = readTodoDates(text, today);
  const day = dated.startOn ?? dated.dueOn ?? today;
  const timed = readTodoTime(dated.title, { day, today, now });
  return withTimeDay(
    {
      title: timed.title,
      startOn: dated.startOn,
      dueOn: dated.dueOn,
      startTime: timed.startTime as string | null,
      endTime: timed.endTime as string | null,
    },
    today,
  );
}
