import { apiAuthorized, logApi, unauthorized } from "@/lib/api/auth";
import { upcomingEvents } from "@/lib/my-space/calendar";
import { parseDay } from "@/lib/my-space/diary-calendar";
import { todayInSeoul } from "@/lib/profile/resume-sections";

/**
 * 홈페이지 API · 일정(MYH-247). 내 공간 › 일정 과 같은 구글 캘린더를 읽기만 한다.
 *
 *   GET  ?from=2026-10-13&days=7(최대 62). 비우면 오늘부터 7일
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await apiAuthorized(request))) return unauthorized();
  const params = new URL(request.url).searchParams;
  const day = parseDay(params.get("from")) ?? todayInSeoul();
  const days = Math.min(Math.max(Number(params.get("days")) || 7, 1), 62);
  const from = new Date(`${day}T00:00:00+09:00`);
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  logApi(request, `${day} +${days}d`);
  const { events, failed } = await upcomingEvents(from, to);
  return Response.json({
    from: day,
    days,
    failedCalendars: failed,
    events: events.map((e) => ({
      title: e.title,
      location: e.location,
      allDay: e.allDay,
      start: e.allDay ? e.startDay : e.start.toISOString(),
      end: e.allDay ? e.endDay : e.end.toISOString(),
      calendar: e.calendar,
    })),
  });
}
