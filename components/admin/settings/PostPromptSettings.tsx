import { savePostPromptAction } from "@/app/admin/settings/actions";
import { DEFAULT_POST_PROMPT } from "@/lib/posts/ai-meta";
import { envSetting, postAiPrompt } from "@/lib/site/settings";

const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 글 요약 · 태그 프롬프트(MYH-249). 블로그의 「AI 로 채우기」 · 짧은 글의 「태그 제안」 이
 * 쓴다. .env 의 POST_AI_PROMPT 가 있으면 그것이 먼저라 잠근다. 비우거나 「처음 값으로」
 * 면 코드의 처음 값을 쓴다.
 */
export default async function PostPromptSettings({ notice }: { notice?: string }) {
  const stored = await postAiPrompt();
  const env = envSetting("postAiPrompt");
  return (
    <div id="post-prompt" className="scroll-mt-24">
      {/* 프롬프트가 늘어 길어서 하나씩 접어 둔다. 저장한 뒤 · #주소로 오면 편다 */}
      <details open={notice === "saved"} className="rounded-lg border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">
          글 요약 · 태그 프롬프트
          <span className="ml-2 text-xs font-normal text-muted">
            {env ? "● .env" : stored ? "● 바꾼 프롬프트" : "○ 처음 값"}
          </span>
        </summary>
        <p className="mt-1 text-xs text-muted">
          블로그 쓰기 화면의 「AI 로 채우기」 와 짧은 글의 「태그 제안」 이 AI 엔진에게 보내는 글입니다.
          {"{종류}"}(블로그 글 · 짧은 글) · {"{제목}"} · {"{태그}"}(이미 쓰던 태그) · {"{글}"}(본문 앞부분)
          자리가 채워집니다({"{글}"} 을 빼면 맨 끝에 붙습니다). 받는 꼴(요약 · 태그)은 바뀌지 않습니다.
        </p>
        {notice === "saved" ? (
          <p role="status" className="mt-2 text-sm text-foreground/80">
            저장했습니다.
          </p>
        ) : null}
        {env ? (
          <>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
              ● .env 의 POST_AI_PROMPT 를 씁니다
            </p>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border p-3 text-xs text-muted">
              {stored}
            </pre>
          </>
        ) : (
          <form action={savePostPromptAction} aria-label="글 요약 · 태그 프롬프트" className="mt-3 space-y-2">
            <textarea
              name="prompt"
              rows={10}
              defaultValue={stored ?? DEFAULT_POST_PROMPT}
              aria-label="글 요약 · 태그 프롬프트 글"
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
      </details>
    </div>
  );
}
