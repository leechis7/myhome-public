import Link from "next/link";

type Tag = { tag: string; count: number };

/** 검색창과 태그 목록. 상태는 전부 주소(쿼리스트링)에 담는다. */
export default function BlogFilters({
  tags,
  activeTag,
  q,
}: {
  tags: Tag[];
  activeTag?: string;
  q?: string;
}) {
  return (
    <div className="mb-10 space-y-4">
      <form action="/blog" className="flex gap-2">
        {activeTag ? (
          <input type="hidden" name="tag" value={activeTag} />
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="제목·본문 검색"
          aria-label="글 검색"
          className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-foreground/5"
        >
          검색
        </button>
      </form>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href={q ? `/blog?q=${encodeURIComponent(q)}` : "/blog"}
              className={
                activeTag
                  ? "rounded-md border border-border px-3 py-1 text-sm text-foreground/60 transition-colors hover:text-foreground"
                  : "rounded-md border border-foreground/40 px-3 py-1 text-sm font-medium"
              }
            >
              전체
            </Link>
          </li>
          {tags.map(({ tag, count }) => {
            const params = new URLSearchParams();
            params.set("tag", tag);
            if (q) params.set("q", q);
            return (
              <li key={tag}>
                <Link
                  href={`/blog?${params.toString()}`}
                  className={
                    activeTag === tag
                      ? "rounded-md border border-foreground/40 px-3 py-1 text-sm font-medium"
                      : "rounded-md border border-border px-3 py-1 text-sm text-foreground/60 transition-colors hover:text-foreground"
                  }
                >
                  {tag}
                  <span className="ml-1.5 text-xs text-faint tabular-nums">
                    {count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
