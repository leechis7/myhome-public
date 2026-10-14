import { saveDiaryAiAction } from "@/app/admin/settings/actions";
import { envSetting, diaryAiOn } from "@/lib/site/settings";

const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 나만 보는 글을 AI 로 보내도 되나(MYH-250). 메모 · 일기는 암호화해 두는 글인데,
 * 그날 메모로 일기 초안을 만들려면 그 글이 AI 엔진(Gemini · OpenAI …)으로 나간다.
 * 처음은 끔. .env 의 DIARY_AI 가 있으면 그것이 먼저라 잠근다.
 */
export default async function DiaryAiSettings({ notice }: { notice?: string }) {
  const on = await diaryAiOn();
  const env = envSetting("diaryAi");
  return (
    <div id="diary-ai" className="scroll-mt-24">
      <h4 className="text-sm font-medium">나만 보는 글을 AI 로 보내기</h4>
      <p className="mt-1 text-xs text-muted">
        켜면 일기 쓰기 화면의 「그날 메모로 초안」 이 그날 메모를 위의 AI 엔진으로 보냅니다. 메모 ·
        일기는 암호화해 두는 글이지만, 보내는 동안에는 그 엔진(Google · OpenAI 등)이 글을 읽습니다.
      </p>
      {notice === "saved" ? (
        <p role="status" className="mt-2 text-sm text-foreground/80">
          저장했습니다.
        </p>
      ) : null}
      {env ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          ● .env 의 DIARY_AI 를 씁니다 ({on ? "켬" : "끔"})
        </p>
      ) : (
        <form action={saveDiaryAiAction} aria-label="나만 보는 글을 AI 로 보내기" className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="on" value="1" defaultChecked={on} />
            그날 메모로 일기 초안 만들기를 쓴다
          </label>
          <button type="submit" className={primary}>
            저장
          </button>
        </form>
      )}
    </div>
  );
}
