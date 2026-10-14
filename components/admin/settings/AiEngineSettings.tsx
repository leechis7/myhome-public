import { saveAiEnginesAction } from "@/app/admin/settings/actions";
import { AI_ENGINES, readEngines } from "@/lib/ai/engines";
import { envSetting, siteConfig } from "@/lib/site/settings";

const small =
  "rounded-md border border-border px-2 py-0.5 text-xs transition-colors hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * AI 엔진의 차례 · 사용(MYH-246). 위에 있는 엔진부터 묻고, 안 되면 다음 것으로.
 * 필요한 값(오픈클로는 주소 · 토큰, Gemini 는 키)이 없는 엔진은 켜 두어도 건너뛴다
 * (그렇다고 적는다). 엔진 목록은 lib/ai/engines.ts 하나에서 온다.
 */
export default async function AiEngineSettings({ notice }: { notice?: string }) {
  const c = await siteConfig();
  const list = readEngines(c.aiEngines);
  const ready = { openclaw: Boolean(c.openclawUrl && c.openclawToken), gemini: Boolean(c.geminiApiKey) };
  return (
    <div>
      <h4 className="text-sm font-medium">쓰는 엔진과 차례</h4>
      <p className="mt-1 text-xs text-muted">
        책 소개 요약 · 할 일 · 메모 분류를 위에 있는 엔진부터 묻고, 안 되면 다음 것으로
        넘어갑니다. 다 안 되면 AI 없이(소개 앞부분 줄이기 · 규칙) 합니다.
      </p>
      {envSetting("aiEngines") ? (
        <>
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            ● .env 의 AI_ENGINES 를 씁니다
          </p>
          <ol className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
            {list.map(({ engine, on }, i) => (
              <li key={engine} className="flex gap-3 px-3 py-2">
                <span className="w-4 text-xs text-muted tabular-nums">{i + 1}</span>
                <span className={on ? "" : "text-muted line-through"}>{AI_ENGINES[engine].label}</span>
                {on ? null : <span className="text-xs text-muted">끔</span>}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {envSetting("aiEngines") ? null : notice === "saved" ? (
        <p role="status" className="mt-2 text-sm text-foreground/80">
          저장했습니다.
        </p>
      ) : null}
      {envSetting("aiEngines") ? null : (
      <form action={saveAiEnginesAction} aria-label="AI 엔진" className="mt-3">
        <ol className="divide-y divide-border rounded-lg border border-border">
          {list.map(({ engine, on }, i) => {
            const meta = AI_ENGINES[engine];
            return (
              <li key={engine} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input type="hidden" name="order" value={engine} />
                <span className="w-4 text-xs text-muted tabular-nums">{i + 1}</span>
                <label className="flex flex-1 items-center gap-2">
                  <input type="checkbox" name="on" value={engine} defaultChecked={on} />
                  <span>{meta.label}</span>
                  {!ready[engine] ? (
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      {meta.needs} 없음 · 건너뜀
                    </span>
                  ) : null}
                </label>
                <button
                  type="submit"
                  name="move"
                  value={`${engine}:up`}
                  disabled={i === 0}
                  aria-label={`${meta.label} 위로`}
                  className={small}
                >
                  ↑
                </button>
                <button
                  type="submit"
                  name="move"
                  value={`${engine}:down`}
                  disabled={i === list.length - 1}
                  aria-label={`${meta.label} 아래로`}
                  className={small}
                >
                  ↓
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="submit"
          className="mt-3 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          엔진 차례 저장
        </button>
      </form>
      )}
    </div>
  );
}
