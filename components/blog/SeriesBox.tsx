import Link from "next/link";

type Episode = { id: number; title: string };

/**
 * 연재 상자(MYH-187). 본문 끝에서 그 연재의 편을 모두 보이고 앞뒤 편으로
 * 잇는다. 아래의 「이전 글 · 다음 글」 은 모든 글의 순서라 따로 있다.
 *
 * 편이 하나뿐이면 그리지 않는다 - 이을 곳이 없다.
 */
export default function SeriesBox({
  name,
  episodes,
  current,
}: {
  name: string;
  episodes: Episode[];
  current: number;
}) {
  if (episodes.length < 2) return null;
  const at = episodes.findIndex((e) => e.id === current);
  const previous = episodes[at - 1];
  const next = episodes[at + 1];

  return (
    <nav
      aria-label={`연재 ${name}`}
      className="mt-14 rounded-xl border border-border p-5"
    >
      <p className="text-sm font-medium">
        <span className="text-faint">연재 · </span>
        {name}
      </p>
      <ol className="mt-3 space-y-1.5 text-sm">
        {episodes.map((e, i) => (
          <li key={e.id} className="flex gap-2">
            <span className="w-6 shrink-0 text-right tabular-nums text-faint">
              {i + 1}.
            </span>
            {e.id === current ? (
              <span aria-current="page" className="font-medium">
                {e.title}
                <span className="ml-2 text-xs text-faint">지금 글</span>
              </span>
            ) : (
              <Link
                href={`/blog/${e.id}`}
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                {e.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {previous || next ? (
        <div className="mt-4 flex justify-between gap-4 border-t border-border pt-3 text-sm">
          {previous ? (
            <Link
              href={`/blog/${previous.id}`}
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              ← 이전 편
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/blog/${next.id}`}
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              다음 편 →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </nav>
  );
}
