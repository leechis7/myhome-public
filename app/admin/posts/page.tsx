import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Container from "@/components/Container";
import { isAdmin } from "@/lib/security/auth";
import { getDb, posts } from "@/lib/db";
import { countCommentsByPost } from "@/lib/posts/comments";
import { isScheduled, stateLabel } from "@/lib/posts/state";
import { formatDate } from "@/lib/posts";

export const metadata: Metadata = {
  title: "블로그 관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  if (!(await isAdmin())) redirect("/admin");

  const [rows, commentCounts] = await Promise.all([
    // 짧은 글도 같은 테이블에 있다. 종류를 걸지 않으면 여기 섞여 나온다.
    getDb()
      .select()
      .from(posts)
      .where(eq(posts.kind, "post"))
      .orderBy(desc(posts.updatedAt)),
    countCommentsByPost(),
  ]);

  return (
    <Container>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">블로그 관리</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          새 글
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          아직 글이 없습니다. 오른쪽 위 &ldquo;새 글&rdquo;로 시작하세요.
        </p>
      ) : (
        <ul className="mt-10 space-y-3">
          {rows.map((post) => (
            <li
              key={post.id}
              className="rounded-xl border border-border px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="font-medium transition-opacity hover:opacity-70"
                >
                  {/* 그림만 올리고 떠나면 제목 없는 초안이 남는다(MYH-145).
                      빈 글자를 그대로 두면 누를 데가 없어 지우지도 못한다. */}
                  {post.title || "제목 없음"}
                </Link>
                {isScheduled(post) ? (
                  // 냈지만 아직 시각이 오지 않았다(MYH-194). 방문자에게는 없는 글이다
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {stateLabel(post)}
                  </span>
                ) : post.published ? (
                  <span className="rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60">
                    발행 {formatDate(post.publishedAt)}
                  </span>
                ) : (
                  // 내려 둔 글과 아직 낸 적 없는 글을 구분한다
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {post.publishedAt
                      ? `내려둠 (발행 ${formatDate(post.publishedAt)})`
                      : "임시저장"}
                  </span>
                )}
                {/* 낸 글 중 나만 보는 것. 공개된 줄 알고 쓰면 안 된다 */}
                {post.private ? (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                    나만 보기
                  </span>
                ) : null}
                {post.published ? (
                  <Link
                    href={`/blog/${post.id}`}
                    className="ml-auto text-sm text-muted transition-colors hover:text-foreground"
                  >
                    보기 ↗
                  </Link>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-faint">
                /blog/{post.id}
                {commentCounts.get(post.id) ? (
                  <span className="ml-3 font-sans">
                    댓글 {commentCounts.get(post.id)}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
