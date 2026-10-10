import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/page-metadata";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import AdminLinkButton from "@/components/admin/AdminLinkButton";
import BlogFilters from "@/components/blog/BlogFilters";
import PostSummary from "@/components/blog/PostSummary";
import { isAdmin } from "@/lib/security/auth";
import { countCommentsByPost } from "@/lib/posts/comments";
import { listPublishedPosts, listTags } from "@/lib/posts";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
  title: "블로그",
  description: "개발하면서 배운 것들을 기록합니다.",
  path: "/blog",
});
}

export const dynamic = "force-dynamic";

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const params = await searchParams;
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const q =
    typeof params.q === "string" ? params.q.trim() || undefined : undefined;

  const page = Math.max(1, Number(params.page) || 1);

  // 나만 보는 글은 로그인했을 때만 목록에 함께 선다
  const admin = await isAdmin();
  const [result, tags, commentCounts] = await Promise.all([
    listPublishedPosts({ tag, q, page, admin }),
    listTags("post", admin),
    countCommentsByPost(),
  ]);

  const { rows, total, lastPage } = result;
  const filtered = tag !== undefined || q !== undefined;

  /** 지금 조건을 유지한 채 쪽만 바꾸는 주소 */
  function pageHref(target: number) {
    const next = new URLSearchParams();
    if (tag) next.set("tag", tag);
    if (q) next.set("q", q);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `/blog?${query}` : "/blog";
  }

  return (
    <Container>
      <PageHeader
        title="블로그"
        description="개발하면서 배운 것들을 기록합니다."
        action={<AdminLinkButton href="/admin/posts/new" label="새 글" />}
      />

      <BlogFilters tags={tags} activeTag={tag} q={q} />

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {filtered
            ? "조건에 맞는 글이 없습니다."
            : "아직 글이 없습니다. 곧 채워집니다."}
        </p>
      ) : (
        <>
          {filtered ? (
            <p className="mb-6 text-sm text-muted">
              {`${total}개의 글`}
              {q ? ` · "${q}" 검색` : ""}
              {tag ? ` · 태그 ${tag}` : ""}
            </p>
          ) : null}

          <ul className="space-y-8">
            {rows.map((post) => (
              <li key={post.id}>
                <PostSummary
                  post={post}
                  commentCount={commentCounts.get(post.id)}
                  showTags
                />
              </li>
            ))}
          </ul>

          {lastPage > 1 ? (
            <nav
              aria-label="쪽 넘기기"
              className="mt-12 flex items-center justify-between border-t border-border pt-6 text-sm"
            >
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="text-foreground/60 transition-colors hover:text-foreground"
                >
                  ← 이전
                </Link>
              ) : (
                <span />
              )}

              <span className="text-faint tabular-nums">
                {`${page} / ${lastPage}`}
              </span>

              {page < lastPage ? (
                <Link
                  href={pageHref(page + 1)}
                  className="text-foreground/60 transition-colors hover:text-foreground"
                >
                  다음 →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </Container>
  );
}
