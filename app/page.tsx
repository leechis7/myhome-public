import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import JsonLd from "@/components/JsonLd";
import { isAdmin } from "@/lib/auth";
import PostCountSelect from "@/components/PostCountSelect";
import NoteSummary from "@/components/blog/NoteSummary";
import PostSummary from "@/components/blog/PostSummary";
import { websiteJsonLd } from "@/lib/jsonld";
import { postCountOf } from "@/lib/post-counts";
import {
  listPopularPosts,
  listRecentNotes,
  listRecentPosts,
  POPULAR_DAYS,
} from "@/lib/posts";
import { getSite } from "@/lib/site-info";

// 루트 레이아웃에서 canonical 을 걷었으므로(MYH-162) 홈도 제 것을 적는다.
// 제목·설명·그림은 루트 것이 곧 홈 것이라 그대로 둔다.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const info = await getSite();
  const params = await searchParams;
  const admin = await isAdmin();
  // 블로그 글 위에서 고른 개수를 짧은 글도 따른다(MYH-184)
  const count = postCountOf(params.posts);
  const [rows, notes, popular] = await Promise.all([
    listRecentPosts(count, "post", admin),
    listRecentNotes(count, admin),
    listPopularPosts(),
  ]);

  return (
    <Container>
      <JsonLd data={websiteJsonLd(info)} />

      <section className="py-6">
        <p className="text-sm font-medium text-muted">안녕하세요 👋</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {info.name}의 홈페이지
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground/70">
          {info.description}
        </p>
        {/* 소개는 위쪽 메뉴에서 뺐으니 첫 화면에 길을 하나 둔다.
            처음 온 사람이 가장 먼저 궁금해하는 것이기도 하다. */}
        <Link
          href="/about"
          className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm transition-colors hover:bg-foreground/5"
        >
          소개 보기
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      {/* 이 사이트에서 늘 새로 생기는 것은 글이다. 홈에서 바로 보여준다. */}
      <section className="mt-12">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-3">
          <h2 className="text-lg font-semibold">최근 글</h2>
          <PostCountSelect />
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            아직 글이 없습니다. 곧 채워집니다.
          </p>
        ) : (
          <ul className="space-y-8">
            {rows.map((post) => (
              <li key={post.id}>
                <PostSummary post={post} />
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/blog"
          className="mt-10 inline-block text-sm text-foreground/60 transition-colors hover:text-foreground"
        >
          블로그 전체 보기 →
        </Link>
      </section>

      {/* 많이 읽은 글(MYH-189). 최근 글과 따로, 한 줄씩. 읽힌 글이 없으면
          절을 내보내지 않는다 */}
      {popular.rows.length > 0 ? (
        <section className="mt-16" aria-labelledby="popular-heading">
          <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-border pb-3">
            <h2 id="popular-heading" className="text-lg font-semibold">
              많이 읽은 글
            </h2>
            <span className="text-xs text-faint">
              {popular.basis === "recent"
                ? `최근 ${POPULAR_DAYS}일 조회`
                : "누적 조회"}
            </span>
          </div>
          <ol className="space-y-1">
            {popular.rows.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/blog/${p.id}`}
                  className="flex items-baseline gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-foreground/[0.03]"
                >
                  <span className="w-5 shrink-0 text-right text-sm tabular-nums text-faint">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {p.title}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-faint">
                    {`조회 ${p.views}`}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* 짧은 글은 블로그 글과 섞지 않고 아래에 따로 둔다. 제목이 있는 것과
          없는 것이라 한 줄의 모양이 다르고, 섞으면 둘 다 읽기 어려워진다.
          아직 쓴 것이 없으면 이 절을 내보내지 않는다 — 첫 화면에 빈 칸을
          두지 않는다. */}
      {notes.length > 0 ? (
        <section className="mt-16">
          <div className="mb-6 border-b border-border pb-3">
            <h2 className="text-lg font-semibold">짧은 글</h2>
          </div>

          <ul className="space-y-8">
            {notes.map((note) => (
              <li key={note.id}>
                <NoteSummary note={note} showTags={false} clamp />
              </li>
            ))}
          </ul>

          <Link
            href="/notes"
            className="mt-10 inline-block text-sm text-foreground/60 transition-colors hover:text-foreground"
          >
            짧은 글 전체 보기 →
          </Link>
        </section>
      ) : null}
    </Container>
  );
}
