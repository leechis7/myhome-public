import Link from "next/link";

type Episode = { id: number; title: string };

/**
 * 연재 상자(MYH-187). 그 연재의 편을 모두 보이고 앞뒤 편으로 잇는다. 연재인지
 * 먼저 알 수 있게 본문 앞에 둔다(MYH-283). 다 읽은 뒤 넘어갈 곳은 본문 끝의
 * SeriesNav 가 맡는다. 아래의 「이전 글 · 다음 글」 은 모든 글의 순서라 따로 있다.
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

  return (
    <nav
      aria-label={`연재 ${name}`}
      className="mt-8 rounded-xl border border-border p-5"
    >
      <p className="text-sm font-medium">
        <span className="text-faint">연재 · </span>
        {name}
        <span className="text-faint">{` (${at + 1}/${episodes.length})`}</span>
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
      <SeriesSteps episodes={episodes} at={at} className="mt-4 border-t border-border pt-3" />
    </nav>
  );
}

/** 본문 끝의 이전 편 · 다음 편(MYH-283). 다 읽고 바로 넘어갈 수 있게 */
export function SeriesNav({
  episodes,
  current,
}: {
  episodes: Episode[];
  current: number;
}) {
  if (episodes.length < 2) return null;
  return (
    <nav aria-label="이전 편 · 다음 편" className="mt-14">
      <SeriesSteps
        episodes={episodes}
        at={episodes.findIndex((e) => e.id === current)}
        className="rounded-xl border border-border px-5 py-3"
      />
    </nav>
  );
}

function SeriesSteps({
  episodes,
  at,
  className,
}: {
  episodes: Episode[];
  at: number;
  className: string;
}) {
  const previous = episodes[at - 1];
  const next = episodes[at + 1];
  if (!previous && !next) return null;
  return (
    <div className={`flex justify-between gap-4 text-sm ${className}`}>
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
  );
}
