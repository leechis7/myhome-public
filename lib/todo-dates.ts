/**
 * 할 일의 기간(MYH-228). DB 를 보지 않는 순수한 것들이라 따로 두고 시험한다.
 * 날짜는 모두 서울 날 "2026-10-15" 글자다 - 글자 차례가 날 차례와 같다.
 */

export type TodoRange = { startOn: string | null; dueOn: string | null };

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

/** 목록에 적는 기간. 「10.12 ~ 10.15」 · 「10.12 부터」 · 「10.15」 · 같은 날이면 하나 */
export function rangeLabel({ startOn, dueOn }: TodoRange) {
  if (startOn && dueOn) {
    return startOn === dueOn ? shortDay(dueOn) : `${shortDay(startOn)} ~ ${shortDay(dueOn)}`;
  }
  if (dueOn) return shortDay(dueOn);
  if (startOn) return `${shortDay(startOn)} 부터`;
  return null;
}

/**
 * 오늘에 견준 처지. 마감을 넘겼나(late) · 오늘이 마감인가(today) ·
 * 기간 안인가(ongoing) · 아직 시작 전인가(upcoming).
 */
export function rangeState({ startOn, dueOn }: TodoRange, today: string) {
  if (dueOn && dueOn < today) return "late";
  if (dueOn === today) return "today";
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
