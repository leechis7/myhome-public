import { getCalendars, upcomingEvents } from "@/lib/my-space/calendar";
import { listTodos } from "@/lib/my-space/todos";
import { rangeLabel } from "@/lib/my-space/todo-dates";

/**
 * AI 비서(MYH-260). 대화창이 AI 에 물을 때 앞에 붙이는 시스템 글을 만든다 -
 * 오늘 날짜 · 남은 할 일(번호와 함께) · 7일 안의 일정, 그리고 넣고 싶을 때
 * ```myhome 블록으로 적으라는 약속(lib/ai/assistant-actions.ts).
 *
 * 나만 보는 할 일 · 일정이 AI 엔진으로 나가므로 환경설정의 스위치를 켰을 때만 쓴다.
 */

const MAX_TODOS = 40;
const MAX_EVENTS = 40;

const dayFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const eventFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const RULES = `너는 이 홈페이지 주인의 비서다. 아래 할 일 · 일정을 보고 답한다. 없는 것을 지어내지 않는다.
할 일 · 메모를 넣거나 할 일을 끝내 달라고 하면, 답 끝에 아래 꼴의 블록을 붙인다. 너는 직접 넣지 못한다 -
화면에 단추가 생기고 주인이 누르면 그때 넣어진다. 그러니 「넣었다」 가 아니라 「아래 단추로 넣을 수 있다」 고 말한다.
날짜는 YYYY-MM-DD, 시각은 HH:MM(24시). 모르는 것은 null. 여러 개면 JSON 배열.
\`\`\`myhome
{"action":"todo","title":"운동","startOn":null,"dueOn":"2026-10-20","startTime":"19:00","endTime":null}
\`\`\`
\`\`\`myhome
{"action":"memo","text":"적을 글"}
\`\`\`
\`\`\`myhome
{"action":"done","id":12,"title":"끝낼 할 일 제목"}
\`\`\`
done 의 id 는 아래 할 일 목록의 [번호] 다.`;

export async function assistantSystem(now = new Date()) {
  const [{ open }, calendars] = await Promise.all([listTodos(), getCalendars()]);
  const todoLines = open.slice(0, MAX_TODOS).map((t) => {
    const when = rangeLabel(t);
    return `- [${t.id}] ${t.title ?? "열 수 없음"}${when ? ` · ${when}` : ""}`;
  });
  let eventLines: string[] = [];
  if (calendars.length > 0) {
    const { events } = await upcomingEvents(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    eventLines = events.slice(0, MAX_EVENTS).map((e) => {
      const when = e.allDay ? `${e.startDay} 종일` : eventFmt.format(e.start);
      return `- ${when} · ${e.title}${e.calendar ? ` (${e.calendar})` : ""}`;
    });
  }
  return [
    RULES,
    `지금: ${dayFmt.format(now)} (한국 시각)`,
    `남은 할 일(${open.length}개${open.length > MAX_TODOS ? `, 앞의 ${MAX_TODOS}개만` : ""}):`,
    todoLines.length ? todoLines.join("\n") : "- 없음",
    "앞으로 7일 일정:",
    eventLines.length ? eventLines.join("\n") : "- 없음",
  ].join("\n\n");
}
