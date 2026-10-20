import { saveAssistantAction } from "@/app/admin/settings/actions";
import { envSetting, assistantOn } from "@/lib/site/settings";

const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * AI 비서(MYH-260). 켜면 AI 대화창이 남은 할 일 · 7일 일정을 AI 엔진에 함께 보내
 * 그것을 보고 답하고, 할 일 · 메모를 넣을 단추를 제안한다. 처음 끔.
 * .env 의 AI_ASSISTANT 가 있으면 그것이 먼저라 잠근다.
 */
export default async function AssistantSettings({ notice }: { notice?: string }) {
  const on = await assistantOn();
  const env = envSetting("aiAssistant");
  return (
    <div id="ai-assistant" className="mt-6 scroll-mt-24">
      <h4 className="text-sm font-medium">AI 비서</h4>
      <p className="mt-1 text-xs text-muted">
        켜면 AI 대화창이 남은 할 일과 7일 안의 일정을 위의 AI 엔진으로 함께 보내, 그것을 보고
        답합니다(「이번 주 뭐 있어?」). 「내일 7시 운동 넣어줘」 처럼 말하면 넣을 단추를 보여 주고,
        누를 때만 넣습니다. 할 일은 암호화해 두는 글이지만, 보내는 동안에는 그 엔진이 읽습니다.
      </p>
      {notice === "saved" ? (
        <p role="status" className="mt-2 text-sm text-foreground/80">
          저장했습니다.
        </p>
      ) : null}
      {env ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          ● .env 의 AI_ASSISTANT 를 씁니다 ({on ? "켬" : "끔"})
        </p>
      ) : (
        <form action={saveAssistantAction} aria-label="AI 비서" className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="on" value="1" defaultChecked={on} />
            AI 대화창에서 할 일 · 일정을 보고 넣는다
          </label>
          <button type="submit" className={primary}>
            저장
          </button>
        </form>
      )}
    </div>
  );
}
