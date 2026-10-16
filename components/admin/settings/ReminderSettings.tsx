import { saveRemindersAction } from "@/app/admin/settings/actions";
import { envSetting, remindersOn } from "@/lib/site/settings";

const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 할 일 · 일정 미리 알림(MYH-258). 위의 봇 · 대화방으로 보낸다. 처음 끔.
 * .env 의 TELEGRAM_REMINDERS 가 있으면 그것이 먼저라 잠근다.
 */
export default async function ReminderSettings({ notice }: { notice?: string }) {
  const on = await remindersOn();
  const env = envSetting("telegramReminders");
  return (
    <div id="reminders" className="mt-6 scroll-mt-24">
      <h4 className="text-sm font-medium">미리 알림</h4>
      <p className="mt-1 text-xs text-muted">
        할 일과 구글 캘린더 일정을 텔레그램으로 미리 알립니다. 날만 있는 것은 그 날 아침 8시(할 일은
        마감일, 시작일이 따로 있으면 시작일에도), 시각이 있는 것은 1시간 전 · 30분 전입니다.
        텔레그램 받기를 끈 서버(TELEGRAM_INBOX=off)에서는 보내지 않습니다.
      </p>
      {notice === "saved" ? (
        <p role="status" className="mt-2 text-sm text-foreground/80">
          저장했습니다.
        </p>
      ) : null}
      {env ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          ● .env 의 TELEGRAM_REMINDERS 를 씁니다 ({on ? "켬" : "끔"})
        </p>
      ) : (
        <form action={saveRemindersAction} aria-label="미리 알림" className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="on" value="1" defaultChecked={on} />
            할 일 · 일정을 미리 알린다
          </label>
          <button type="submit" className={primary}>
            저장
          </button>
        </form>
      )}
    </div>
  );
}
