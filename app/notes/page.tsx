import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import AdminLinkButton from "@/components/admin/AdminLinkButton";
import NoteSummary from "@/components/blog/NoteSummary";
import { isAdmin } from "@/lib/auth";
import { countCommentsByPost } from "@/lib/comments";
import { listPublishedNotes, listTags } from "@/lib/posts";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
  title: "짧은 글",
  description: "길게 쓸 것은 아니지만 남겨 두고 싶은 것들.",
  path: "/notes",
});
}

export const dynamic = "force-dynamic";

/**
 * 짧은 글 목록. 블로그와 달리 제목이 없어 본문을 그대로 펼친다.
 * 댓글은 글마다 따로 있는 화면에서 받는다.
 */
export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const params = await searchParams;
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const admin = await isAdmin();
  const [result, tags, commentCounts] = await Promise.all([
    listPublishedNotes({ tag, page, admin }),
    listTags("note", admin),
    countCommentsByPost(),
  ]);
  const { rows, lastPage } = result;

  function pageHref(target: number) {
    const next = new URLSearchParams();
    if (tag) next.set("tag", tag);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `/notes?${query}` : "/notes";
  }

  return (
    <Container>
      <PageHeader
        title="짧은 글"
        description="길게 쓸 것은 아니지만 남겨 두고 싶은 것들입니다."
        action={<AdminLinkButton href="/admin/notes" label="새 글" />}
      />

      {tags.length > 0 ? (
        <ul className="mb-8 flex flex-wrap gap-2">
          <li>
            <Link
              href="/notes"
              aria-current={tag ? undefined : "page"}
              className={
                tag
                  ? "rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60 transition-colors hover:text-foreground"
                  : "rounded bg-foreground/[0.12] px-2 py-0.5 text-xs font-medium"
              }
            >
              전체
            </Link>
          </li>
          {tags.map((row) => (
            <li key={row.tag}>
              <Link
                href={`/notes?tag=${encodeURIComponent(row.tag)}`}
                aria-current={tag === row.tag ? "page" : undefined}
                className={
                  tag === row.tag
                    ? "rounded bg-foreground/[0.12] px-2 py-0.5 text-xs font-medium"
                    : "rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60 transition-colors hover:text-foreground"
                }
              >
                {`${row.tag} ${row.count}`}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {tag ? "그 태그가 붙은 짧은 글이 없습니다." : "아직 쓴 것이 없습니다."}
        </p>
      ) : (
        <ul className="space-y-10">
          {rows.map((note) => (
            <li key={note.id} className="border-b border-border pb-8 last:border-0">
              <NoteSummary
                note={note}
                commentCount={commentCounts.get(note.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 ? (
        <nav
          aria-label="쪽 넘기기"
          className="mt-12 flex items-center justify-between border-t border-border pt-6 text-sm"
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-foreground/60 transition-colors hover:text-foreground">
              ← 이전
            </Link>
          ) : (
            <span />
          )}
          <span className="text-faint tabular-nums">{`${page} / ${lastPage}`}</span>
          {page < lastPage ? (
            <Link href={pageHref(page + 1)} className="text-foreground/60 transition-colors hover:text-foreground">
              다음 →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </Container>
  );
}
