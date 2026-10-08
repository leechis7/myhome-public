import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import CommentForm from "@/components/blog/CommentForm";
import DeleteCommentButton from "@/components/blog/DeleteCommentButton";
import { isAdmin } from "@/lib/auth";
import { formatDateTime, listGuestbook } from "@/lib/comments";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "방명록",
    description: "글과 상관없는 한마디를 남기는 곳입니다.",
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
 * 최신 글이 위다.
 */
export default async function GuestbookPage({
  searchParams,
}: PageProps<"/guestbook">) {
  const params = await searchParams;
  const asked = Number(params.page);
  const page = Number.isInteger(asked) && asked > 0 ? asked : 1;
  const [{ rows, total, lastPage }, admin] = await Promise.all([
    listGuestbook(page),
    isAdmin(),
  ]);
  const code = typeof params.ce === "string" ? params.ce : undefined;
  const pageHref = (n: number) => (n === 1 ? "/guestbook" : `/guestbook?page=${n}`);

  return (
    <Container>
      <PageHeader
        title="방명록"
        description="글과 상관없는 한마디를 남겨 주세요."
      />

      <section id="comments" aria-label="남기기">
        <CommentForm error={code ? errors[code] : undefined} />
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
