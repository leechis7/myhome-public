import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Container from "@/components/Container";
import { isAdmin } from "@/lib/security/auth";
import { getDb, posts } from "@/lib/db";
import { countCommentsByPost } from "@/lib/posts/comments";
import { isScheduled, postState, stateLabel, type PostState } from "@/lib/posts/state";
import { formatDate } from "@/lib/posts";

export const metadata: Metadata = {
  title: "블로그 관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATES: PostState[] = ["공개", "임시저장", "나만 보기", "예약"];

const chipOn = "rounded-md border border-foreground/40 px-3 py-1 text-sm font-medium";
const chipOff =
  "rounded-md border border-border px-3 py-1 text-sm text-foreground/60 transition-colors hover:text-foreground";
const field =
  "rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";

/** 주소의 거르기를 하나만 바꾼 링크 */
function filterHref(state: string | null, q: string) {
  const params = new URLSearchParams();
  if (state) params.set("state", state);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/admin/posts?${query}` : "/admin/posts";
}

/**
 * 블로그 관리. 상태(공개 · 임시저장 · 나만 보기 · 예약)와 제목 · 본문 낱말로
 * 거른다(MYH-244). 거르기는 주소에 남는다.
 */
export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/posts">) {
  if (!(await isAdmin())) redirect("/admin");
  const params = await searchParams;
  const state = STATES.find((x) => x === params.state) ?? null;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";

  const [rows, commentCounts] = await Promise.all([
    // 짧은 글도 같은 테이블에 있다. 종류를 걸지 않으면 여기 섞여 나온다.
    getDb()
      .select()
      .from(posts)
      .where(eq(posts.kind, "post"))
      .orderBy(desc(posts.updatedAt)),
    countCommentsByPost(),
  ]);
  const now = new Date();
  const count = (x: PostState) => rows.filter((post) => postState(post, now) === x).length;
  const needle = q.toLowerCase();
  const shown = rows.filter(
    (post) =>
      (!state || postState(post, now) === state) &&
      (!needle ||
        post.title.toLowerCase().includes(needle) ||
        post.content.toLowerCase().includes(needle)),
  );

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

      {rows.length > 0 ? (
        <div className="mt-8 space-y-3">
          <nav aria-label="상태별 보기" className="flex flex-wrap gap-2">
            <Link href={filterHref(null, q)} className={state ? chipOff : chipOn}>
              전체 <span className="ml-1 text-xs text-faint tabular-nums">{rows.length}</span>
            </Link>
            {STATES.map((x) => (
              <Link
                key={x}
                href={filterHref(x, q)}
                aria-current={state === x ? "page" : undefined}
                className={state === x ? chipOn : chipOff}
              >
                {x} <span className="ml-1 text-xs text-faint tabular-nums">{count(x)}</span>
              </Link>
            ))}
          </nav>
          <form action="/admin/posts" aria-label="글 검색" className="flex flex-wrap gap-2">
            {state ? <input type="hidden" name="state" value={state} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="제목 · 본문 검색"
              aria-label="글 검색어"
              className={`${field} min-w-0 flex-1`}
            />
            <button type="submit" className={chipOff}>
              검색
            </button>
            {state || q ? (
              <Link href="/admin/posts" className={chipOff}>
                전체 보기
              </Link>
            ) : null}
          </form>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          아직 글이 없습니다. 오른쪽 위 &ldquo;새 글&rdquo;로 시작하세요.
        </p>
      ) : shown.length === 0 ? (
        <p className="mt-8 text-sm text-muted">조건에 맞는 글이 없습니다.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {shown.map((post) => (
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
