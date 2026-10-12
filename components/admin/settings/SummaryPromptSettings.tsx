import { saveSummaryPromptAction } from "@/app/admin/settings/actions";
import { DEFAULT_SUMMARY_PROMPT } from "@/lib/books/summary";
import { envSetting, summaryPrompt } from "@/lib/site/settings";

const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 책 소개 요약 프롬프트(MYH-233). .env 의 BOOK_SUMMARY_PROMPT 가 있으면 그것이
 * 먼저라 잠근다. 비우거나 「처음 값으로」 면 코드의 처음 값을 쓴다.
 */
export default async function SummaryPromptSettings({ notice }: { notice?: string }) {
  const stored = await summaryPrompt();
  const env = envSetting("bookSummaryPrompt");
  return (
    <div id="summary" className="scroll-mt-24">
      <h4 className="text-sm font-medium">책 소개 요약 프롬프트</h4>
      <p className="mt-1 text-xs text-muted">
        책 찾기로 고른 책의 소개를 요약할 때 Gemini 에게 보내는 글입니다. {"{제목}"} ·{" "}
        {"{지은이}"} · {"{소개글}"} 자리에 그 책의 것이 들어갑니다({"{소개글}"} 을 빼면 맨
        끝에 붙습니다).
      </p>
      {notice === "saved" ? (
        <p role="status" className="mt-2 text-sm text-foreground/80">
          저장했습니다.
        </p>
      ) : null}
      {env ? (
        <>
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            ● .env 의 BOOK_SUMMARY_PROMPT 를 씁니다
          </p>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border p-3 text-xs text-muted">
            {stored}
          </pre>
        </>
      ) : (
        <form action={saveSummaryPromptAction} aria-label="책 소개 요약 프롬프트" className="mt-3 space-y-2">
          <textarea
            name="prompt"
            rows={9}
            defaultValue={stored ?? DEFAULT_SUMMARY_PROMPT}
            aria-label="요약 프롬프트"
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-foreground/40"
          />
          <p className="text-xs text-muted">{stored ? "● 바꾼 프롬프트를 씁니다" : "○ 처음 값을 씁니다"}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primary}>
              프롬프트 저장
            </button>
            {stored ? (
              <button type="submit" name="reset" value="1" className={button}>
                처음 값으로
              </button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
