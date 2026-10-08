import Link from "next/link";

type Adjacent = { id: number; title: string } | undefined;

/** 글 아래에서 앞뒤 글로 이어 준다 */
export default function AdjacentPosts({
  previous,
  next,
}: {
  previous: Adjacent;
  next: Adjacent;
}) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="다른 글"
      className="mt-14 grid gap-3 border-t border-border pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <Link
          href={`/blog/${previous.id}`}
          className="rounded-xl border border-border p-4 transition-colors hover:bg-foreground/[0.03]"
        >
          <span className="text-xs text-faint">이전 글</span>
          <p className="mt-1 text-sm font-medium">{previous.title}</p>
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link
          href={`/blog/${next.id}`}
          className="rounded-xl border border-border p-4 text-right transition-colors hover:bg-foreground/[0.03] sm:text-right"
        >
          <span className="text-xs text-faint">다음 글</span>
          <p className="mt-1 text-sm font-medium">{next.title}</p>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
