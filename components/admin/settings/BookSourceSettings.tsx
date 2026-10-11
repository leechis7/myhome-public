import { saveBookSourcesAction } from "@/app/admin/settings/actions";
import { bookSources, calibreAccess, kakaoKey } from "@/lib/books/lookup-key";
import { BOOK_SOURCES } from "@/lib/books/sources";
import { envSetting } from "@/lib/site/settings";

const small =
  "rounded-md border border-border px-2 py-0.5 text-xs transition-colors hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * 책 찾기 출처의 차례 · 사용(MYH-226). 위에 있는 것을 먼저 묻고, 같은 ISBN 은
 * 위의 것을 남긴다. 키 · 계정이 없는 출처는 켜 두어도 건너뛴다(그렇다고 적는다).
 * 출처 목록은 lib/books/sources.ts 하나에서 온다 - 새 출처가 생기면 저절로 나온다.
 */
export default async function BookSourceSettings({ notice }: { notice?: string }) {
  const [list, key, calibre] = await Promise.all([bookSources(), kakaoKey(), calibreAccess()]);
  const ready = { kakao: Boolean(key), calibre: Boolean(calibre), openlibrary: true };
  return (
    <div>
      <h4 className="text-sm font-medium">찾는 곳과 차례</h4>
      <p className="mt-1 text-xs text-muted">
        위에 있는 곳부터 찾아 그 차례로 보입니다. 같은 ISBN 은 한 줄로 합치고 위의 것을
        남깁니다.
      </p>
      {envSetting("bookSources") ? (
        <>
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            ● .env 의 BOOK_SOURCES 를 씁니다
          </p>
          <ol className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
            {list.map(({ source, on }, i) => (
              <li key={source} className="flex gap-3 px-3 py-2">
                <span className="w-4 text-xs text-muted tabular-nums">{i + 1}</span>
                <span className={on ? "" : "text-muted line-through"}>{BOOK_SOURCES[source].label}</span>
                {on ? null : <span className="text-xs text-muted">끔</span>}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {envSetting("bookSources") ? null : notice === "saved" ? (
        <p role="status" className="mt-2 text-sm text-foreground/80">
          저장했습니다.
        </p>
      ) : null}
      {envSetting("bookSources") ? null : (
      <form action={saveBookSourcesAction} aria-label="책 찾기 출처" className="mt-3">
        <ol className="divide-y divide-border rounded-lg border border-border">
          {list.map(({ source, on }, i) => {
            const meta = BOOK_SOURCES[source];
            return (
              <li key={source} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input type="hidden" name="order" value={source} />
                <span className="w-4 text-xs text-muted tabular-nums">{i + 1}</span>
                <label className="flex flex-1 items-center gap-2">
                  <input type="checkbox" name="on" value={source} defaultChecked={on} />
                  <span>{meta.label}</span>
                  {meta.needs && !ready[source] ? (
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      {meta.needs} 없음 · 건너뜀
                    </span>
                  ) : null}
                </label>
                <button
                  type="submit"
                  name="move"
                  value={`${source}:up`}
                  disabled={i === 0}
                  aria-label={`${meta.label} 위로`}
                  className={small}
                >
                  ↑
                </button>
                <button
                  type="submit"
                  name="move"
                  value={`${source}:down`}
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
          찾는 곳 저장
        </button>
      </form>
      )}
    </div>
  );
}
