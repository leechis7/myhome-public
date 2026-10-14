import { saveMorePromptAction } from "@/app/admin/settings/actions";
import { MORE_PROMPTS as PROMPTS } from "@/lib/site/more-prompts";
import { envSetting, promptSetting } from "@/lib/site/settings";

const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 그 밖의 AI 프롬프트: 책 한 줄 평 · 분류(MYH-251), 스팸 판정(MYH-252). .env 가 있으면 그것이 먼저라 잠근다. 비우거나
 * 「처음 값으로」 면 코드의 처음 값을 쓴다. 다른 프롬프트처럼 하나씩 접어 둔다.
 */
export default async function MorePromptSettings({ notice }: { notice: (anchor: string) => string | undefined }) {
  const names = Object.keys(PROMPTS) as (keyof typeof PROMPTS)[];
  const storedAll = await Promise.all(names.map((name) => promptSetting(name)));
  return (
    <>
      {names.map((name, i) => {
        const p = PROMPTS[name];
        const stored = storedAll[i];
        const env = envSetting(name);
        const saved = notice(p.id) === "saved";
        return (
          <div key={name} id={p.id} className="scroll-mt-24">
            <details open={saved} className="rounded-lg border border-border px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">
                {p.title}
                <span className="ml-2 text-xs font-normal text-muted">
                  {env ? "● .env" : stored ? "● 바꾼 프롬프트" : "○ 처음 값"}
                </span>
              </summary>
              <p className="mt-1 text-xs text-muted">{p.hint}</p>
              {saved ? (
                <p role="status" className="mt-2 text-sm text-foreground/80">
                  저장했습니다.
                </p>
              ) : null}
              {env ? (
                <>
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">● .env 의 {p.env} 를 씁니다</p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border p-3 text-xs text-muted">
                    {stored}
                  </pre>
                </>
              ) : (
                <form action={saveMorePromptAction} aria-label={p.title} className="mt-3 space-y-2">
                  <input type="hidden" name="name" value={name} />
                  <textarea
                    name="prompt"
                    rows={8}
                    defaultValue={stored ?? p.fallback}
                    aria-label={`${p.title} 글`}
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-foreground/40"
                  />
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
      })}
    </>
  );
}
