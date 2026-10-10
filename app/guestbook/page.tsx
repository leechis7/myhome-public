import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import ContactRows from "@/components/ContactRows";
import GuestbookForm from "@/components/GuestbookForm";
import DeleteCommentButton from "@/components/blog/DeleteCommentButton";
import { isAdmin } from "@/lib/security/auth";
import { formatDateTime, listGuestbook } from "@/lib/posts/comments";
import { pageMetadata } from "@/lib/site/page-metadata";
import { eq } from "drizzle-orm";
import { getDb, profile } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "방명록",
    description: "한마디를 남기거나, 나에게만 메시지를 보내는 곳입니다.",
    path: "/guestbook",
  });
}

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  required: "이름과 내용을 모두 적어주세요.",
  length: "글자 수 제한을 넘었습니다.",
  rate: "잠시 후에 다시 남겨주세요.",
};

/**
 * 방명록(MYH-191). 글과 상관없는 한마디. 댓글 장치를 그대로 쓴다 - 테이블도
 * 같고(post_id 가 빈 줄) 이름 · 내용 제한, 도배 막기, 알림, 지우기가 같다.
 * 최신 글이 위다. 연락처 화면을 합쳐(MYH-216) 위에 연락 수단을 두고,
 * 「나에게만 보내기」 는 관리 › 메시지로 간다.
 */
export default async function GuestbookPage({
  searchParams,
}: PageProps<"/guestbook">) {
  const params = await searchParams;
  const asked = Number(params.page);
  const page = Number.isInteger(asked) && asked > 0 ? asked : 1;
  const [{ rows, total, lastPage }, admin, [me]] = await Promise.all([
    listGuestbook(page),
    isAdmin(),
    // 연락 수단(MYH-216). 소개 화면과 같은 값이다
    getDb()
      .select({
        email: profile.email,
        workEmail: profile.workEmail,
        phone: profile.phone,
        homepageUrl: profile.homepageUrl,
        githubUrl: profile.githubUrl,
      })
      .from(profile)
      .where(eq(profile.id, 1))
      .limit(1),
  ]);
  const sent = params.sent === "1";
  const code = typeof params.ce === "string" ? params.ce : undefined;
  const pageHref = (n: number) => (n === 1 ? "/guestbook" : `/guestbook?page=${n}`);

  return (
    <Container>
      <PageHeader
        title="방명록"
        description="한마디 남겨 주세요. 나에게만 하실 말씀은 「나에게만 보내기」 로 보내 주시면 확인하는 대로 답장드립니다."
      />

      {/* 연락처 화면을 여기로 합쳤다(MYH-216). 누가 쓰는 곳인지 궁금하면 소개로 */}
      {/* 연락 수단은 소개 화면처럼 가로로 늘어놓는다 - 세로로 쌓으면 자리만 먹는다 */}
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <ContactRows me={me} className="flex flex-wrap gap-x-10 gap-y-3" />
        <Link
          href="/about"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-foreground/5"
        >
          소개 보기
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <section id="comments" aria-label="남기기" className="mt-10 scroll-mt-24">
        {sent ? (
          <p role="status" className="rounded-lg border border-border px-4 py-3 text-sm text-foreground/70">
            보냈습니다. 나에게만 보였고 방명록에는 올라가지 않습니다. 읽고 답장드리겠습니다.
          </p>
        ) : null}
        <GuestbookForm error={code ? errors[code] : undefined} />
      </section>

      <section aria-labelledby="guestbook-heading" className="mt-14">
        <h2 id="guestbook-heading" className="text-lg font-semibold">
          남긴 글
          {total > 0 ? (
            <span className="ml-2 text-sm font-normal text-muted tabular-nums">
              {total}
            </span>
          ) : null}
        </h2>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">첫 한마디를 남겨보세요.</p>
        ) : (
          <ul className="mt-6 space-y-6">
            {rows.map((entry) => (
              <li key={entry.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">{entry.author}</span>
                  <time
                    dateTime={entry.createdAt.toISOString()}
                    className="text-xs text-faint"
                  >
                    {formatDateTime(entry.createdAt)}
                  </time>
                  {admin ? (
                    <DeleteCommentButton id={entry.id} author={entry.author} />
                  ) : null}
                </div>
                {/* 마크다운으로 해석하지 않는다. 그대로 줄바꿈만 살린다 */}
                <p className="mt-2 leading-relaxed whitespace-pre-wrap text-foreground/80">
                  {entry.body}
                </p>
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
              <Link
                href={pageHref(page - 1)}
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                ← 이전
              </Link>
            ) : (
              <span />
            )}
            <span className="text-faint tabular-nums">{`${page} / ${lastPage}`}</span>
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
      </section>
    </Container>
  );
}
