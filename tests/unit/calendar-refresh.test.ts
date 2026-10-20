import { afterEach, describe, expect, it, vi } from "vitest";

const ICS = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR\n";

async function load() {
  vi.resetModules();
  return import("@/lib/my-space/calendar");
}

describe("구글 캘린더 새로 고침 (MYH-262)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("5분 안에는 담아 둔 것을 쓰고, 버리면 바로 받아 온다. 30초 안에는 버리지 않는다", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_ICAL", "개인 https://calendar.example/basic.ics");
    const fetchMock = vi.fn(async () => new Response(ICS));
    vi.stubGlobal("fetch", fetchMock);
    const cal = await load();
    const from = new Date("2026-10-19T00:00:00+09:00");
    const to = new Date("2026-10-20T00:00:00+09:00");

    await cal.upcomingEvents(from, to);
    await cal.upcomingEvents(from, to);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cal.calendarsFetchedAt()).toBeInstanceOf(Date);

    // 막 받아 온 것은 새로 고침해도 그대로(자꾸 누르면 구글이 막는다)
    cal.forgetCalendars(Date.now() + 10_000);
    await cal.upcomingEvents(from, to);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    cal.forgetCalendars(Date.now() + cal.REFRESH_GAP_MS);
    expect(cal.calendarsFetchedAt()).toBeNull();
    await cal.upcomingEvents(from, to);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
