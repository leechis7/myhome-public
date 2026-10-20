import { saveMeetingAiAction } from "@/app/admin/settings/actions";
import { readWakeWords } from "@/lib/ai/meeting-summary";
import { envSetting, meetingAiOn, storedSetting } from "@/lib/site/settings";

const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 회의 받아쓰기(MYH-265). 켜면 내 공간 › 회의 에서 녹음을 30초씩 Gemini 로 보내
 * 받아쓴다. 참석자의 목소리가 나가므로 처음 끔. 회의 중 비서를 부르는 호출어
 * (MYH-267)도 여기서 정한다. .env 의 MEETING_AI · MEETING_WAKE_WORDS 가 먼저다.
 */
export default async function MeetingAiSettings({ notice }: { notice?: string }) {
  const on = await meetingAiOn();
  const env = envSetting("meetingAi");
  const wakeEnv = envSetting("meetingWakeWords");
  const wake = (await storedSetting("meetingWakeWords")) ?? "";
  const words = readWakeWords(wakeEnv ?? wake);
  return (
    <div id="meeting-ai" className="mt-6 scroll-mt-24">
      <h4 className="text-sm font-medium">회의 받아쓰기</h4>
      <p className="mt-1 text-xs text-muted">
        켜면 내 공간 › 회의 에서 녹음하며 30초씩 받아씁니다. 받아쓰기는 Gemini 가 해서 참석자의
        목소리가 Google 로 나갑니다. 소리는 남기지 않고 받아쓴 글만 암호화해 둡니다. 녹음한다는 것을
        참석자에게 알려 주세요.
      </p>
      {notice === "saved" ? (
        <p role="status" className="mt-2 text-sm text-foreground/80">
          저장했습니다.
        </p>
      ) : null}
      {env ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          ● .env 의 MEETING_AI 를 씁니다 ({on ? "켬" : "끔"})
        </p>
      ) : null}
      {wakeEnv ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          ● .env 의 MEETING_WAKE_WORDS 를 씁니다 ({words.join(", ")})
        </p>
      ) : null}
      {env && wakeEnv ? null : (
        <form action={saveMeetingAiAction} aria-label="회의 받아쓰기" className="mt-3 space-y-3">
          {env ? null : (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="on" value="1" defaultChecked={on} />
              회의 녹음을 받아쓴다
            </label>
          )}
          {wakeEnv ? null : (
            <label className="block text-sm">
              호출어
              <span className="ml-2 text-xs text-muted">
                회의 중에 이 이름을 부르면(「푸딩아, 이거 할 일로 넣어」) 그 자리에서 카드를 띄웁니다. 쉼표로 여러
                개. 「아 · 야 · 님」 은 붙이지 않아도 됩니다. 비우면 「비서」
              </span>
              <input
                name="wake"
                defaultValue={wake}
                placeholder="비서"
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
            </label>
          )}
          <button type="submit" className={primary}>
            저장
          </button>
        </form>
      )}
    </div>
  );
}
