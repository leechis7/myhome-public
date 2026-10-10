/**
 * 일기장(MYH-213)의 날짜 · 달력 · 기분. DB 를 보지 않는 순수한 것들이라
 * 따로 두고 시험한다.
 */

export const MOODS = {
  good: { emoji: "😄", label: "좋음" },
  okay: { emoji: "🙂", label: "괜찮음" },
  meh: { emoji: "😐", label: "그저 그럼" },
  sad: { emoji: "😢", label: "슬픔" },
  angry: { emoji: "😠", label: "화남" },
  tired: { emoji: "😴", label: "피곤" },
} as const;

export type Mood = keyof typeof MOODS;

export function isMood(value: unknown): value is Mood {
  return typeof value === "string" && Object.hasOwn(MOODS, value);
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^(\d{4})-(\d{2})$/;

/** 2026-10-08 처럼 실제로 있는 날인가. 2026-02-30 은 아니다 */
export function parseDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(DAY);
  if (!m) return null;
  const [y, mo, d] = m.slice(1).map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
    ? value
    : null;
}

/** 2026-10 처럼 맞는 달인가 */
export function parseMonth(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(MONTH);
  if (!m) return null;
  const mo = Number(m[2]);
  return mo >= 1 && mo <= 12 ? value : null;
}

/** 2026-10 에서 n 달 옮긴 달. -1 이면 2026-09 */
export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** 그 달의 첫날과 다음 달 첫날. SQL 범위에 쓴다 */
export function monthRange(month: string) {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}

/**
 * 달력 칸. 일요일부터 한 주 일곱 칸, 그 달이 아닌 칸은 null 이다.
 * 2026-10 이면 첫 줄이 [null, null, null, null, "2026-10-01", …].
 */
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(first).fill(null),
    ...Array.from(
      { length: days },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** 2026-10-08 → 2026년 10월 8일 (목) */
export function dayLabel(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const week = "일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일 (${week})`;
}

/** 2026-10 → 2026년 10월 */
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}
