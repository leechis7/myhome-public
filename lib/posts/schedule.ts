/**
 * 예약 발행 시각(MYH-194)을 화면 칸과 주고받는다.
 *
 * 칸은 <input type="datetime-local"> 이라 「2026-10-03T09:00」 처럼 시간대 없이
 * 온다. 이 사이트는 한국 시간으로 쓰므로 그렇게 읽고 그렇게 채운다 - 글을
 * 다른 나라에서 써도 적은 시각은 한국 시각이다. 날짜를 보이는 다른 곳
 * (formatDate · formatDateTime)도 Asia/Seoul 이다.
 */

const OFFSET = "+09:00";
const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** 칸의 값을 시각으로. 비었거나 모양이 틀리면 null */
export function parseSchedule(raw: string): Date | null {
  const value = raw.trim();
  if (!LOCAL.test(value)) return null;
  const at = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** 앞날인가. 지난 시각이나 지금은 예약이 아니다 - 그냥 지금 낸다 */
export function futureSchedule(raw: string, now = new Date()): Date | null {
  const at = parseSchedule(raw);
  return at && at.getTime() > now.getTime() ? at : null;
}

/** 시각을 칸에 넣을 모양으로. 2026-10-03T09:00 */
export function toScheduleInput(at: Date) {
  const kst = new Date(at.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}
