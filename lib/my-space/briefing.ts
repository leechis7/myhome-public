/**
 * 대시보드의 「🔊 오늘 듣기」(MYH-272) 로 읽을 글. 대시보드가 이미 모은 것(할 일 ·
 * 일정 · 새 메시지)만으로 만든다 - AI 없이, 바깥으로 아무것도 보내지 않는다.
 * 소리로 들으니 짧게, 숫자는 말하기 좋게.
 */

const MAX_ITEMS = 5;

const clock = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** 오후 3:00 → 오후 3시, 오후 3:30 → 오후 3시 30분 */
export function spokenTime(d: Date) {
  return clock
    .format(d)
    .replace(/(\d+):00$/, "$1시")
    .replace(/(\d+):(\d+)$/, "$1시 $2분");
}

function list(items: string[]) {
  const head = items.slice(0, MAX_ITEMS).join(", ");
  return items.length > MAX_ITEMS ? `${head}, 그 밖에 ${items.length - MAX_ITEMS}개` : head;
}

export function briefingText({
  dayLabel,
  late,
  today,
  events,
  unread,
}: {
  /** 「10월 20일 화요일」 */
  dayLabel: string;
  /** 마감을 넘긴 할 일 제목 */
  late: string[];
  /** 오늘 할 일(오늘 마감 · 진행 중), 시각이 있으면 「오후 7시 운동」 */
  today: string[];
  /** 오늘 일정, 시각이 있으면 붙여서 */
  events: string[];
  unread: number;
}) {
  const parts = [`오늘은 ${dayLabel}입니다.`];
  if (today.length) parts.push(`오늘 할 일은 ${today.length}개, ${list(today)}.`);
  else parts.push("오늘 마감인 할 일은 없습니다.");
  if (late.length) parts.push(`마감을 넘긴 할 일이 ${late.length}개 있습니다. ${list(late)}.`);
  if (events.length) parts.push(`일정은 ${events.length}개, ${list(events)}.`);
  else parts.push("오늘 일정은 없습니다.");
  if (unread) parts.push(`읽지 않은 메시지가 ${unread}개 있습니다.`);
  return parts.join(" ");
}
