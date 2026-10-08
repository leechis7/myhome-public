import DeleteButton from "@/components/admin/DeleteButton";
import {
  clearCalendarAction,
  saveCalendarAction,
} from "@/app/admin/calendar/actions";
import { getCalendars } from "@/lib/calendar";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

const notices: Record<string, string> = {
  saved: "캘린더 주소를 저장했습니다.",
  cleared: "캘린더 주소를 지웠습니다.",
  empty: "주소를 한 줄 이상 넣어 주세요.",
  invalid: "줄마다 「이름 https://…」 또는 「https://…」 로 적어 주세요. http 는 받지 않습니다.",
};

/**
 * 구글 캘린더 연결(MYH-214). 관리 › 설정 › 사이트 안에 둔다 — 설정은 설정
 * 자리에서 고친다. 일정 화면(/admin/calendar)은 보기만 한다.
 */
export default async function CalendarSettings({ notice }: { notice?: string }) {
  const urls = await getCalendars();
  const message = notice ? notices[notice] : undefined;
  return (
    <section id="calendar" aria-labelledby="google-heading" className="mt-16 max-w-xl scroll-mt-24 border-t border-border pt-8">
      <h2 id="google-heading" className="text-lg font-semibold">
        구글 캘린더 연결
      </h2>
      {message ? (
        <p role="status" className="mt-3 text-sm text-foreground/80">
          {message}
        </p>
      ) : null}
      <p className="mt-3 text-sm text-muted">
        {urls.length > 0
          ? `● 설정됨 · 캘린더 ${urls.length}개${
              urls.some((c) => c.name) ? `(${urls.map((c) => c.name || "이름 없음").join(", ")})` : ""
            }. 주소는 암호화해서 저장했고 다시 보여 주지 않습니다.`
          : "○ 설정 안 됨"}
      </p>
      <details className="mt-4" open={urls.length === 0}>
        <summary className="cursor-pointer text-sm">
          {urls.length > 0 ? "주소 바꾸기" : "주소 넣기"}
        </summary>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted">
          <li>구글 캘린더 → 설정 → 왼쪽에서 캘린더 고르기</li>
          <li>「캘린더 통합」 → 「iCal 형식의 비공개 주소」 복사</li>
          <li>
            아래에 붙여넣기. 캘린더가 여럿이면 줄마다 하나. 앞에 이름을 붙이면 일정 옆에
            표시됩니다(예: <code>회사 https://…/basic.ics</code>)
          </li>
        </ol>
        <form action={saveCalendarAction} aria-label="캘린더 주소" className="mt-3 space-y-2">
          <textarea
            name="urls"
            rows={3}
            required
            aria-label="iCal 주소"
            placeholder={"개인 https://calendar.google.com/calendar/ical/…/basic.ics\n회사 https://calendar.google.com/calendar/ical/…/basic.ics"}
            className={`${field} font-mono text-xs`}
          />
          <p className="text-xs text-muted">
            저장하면 지금 있는 주소를 모두 바꿉니다. 이 주소를 아는 사람은 일정을 볼 수
            있으니 남에게 보이지 마세요.
          </p>
          <button type="submit" className={primary}>
            캘린더 연결
          </button>
        </form>
      </details>
      {urls.length > 0 ? (
        <form action={clearCalendarAction} className="mt-4">
          <DeleteButton
            aria-label="캘린더 주소 지우기"
            className={`${button} text-red-600 dark:text-red-400`}
            confirmMessage="캘린더 연결을 끊을까요?"
          >
            연결 끊기
          </DeleteButton>
        </form>
      ) : null}
    </section>
  );
}
