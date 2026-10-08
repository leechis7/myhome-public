import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import AdminLinkButton from "@/components/admin/AdminLinkButton";
import AttachmentList from "@/components/blog/AttachmentList";
import Comments from "@/components/blog/Comments";
import Markdown from "@/components/blog/Markdown";
import ViewCounter from "@/components/blog/ViewCounter";
import { listAttachments } from "@/lib/attachments";
import { isAdmin } from "@/lib/auth";
import { noteTitle } from "@/lib/notes";
import { postState } from "@/lib/post-state";
import { findPublishedPost, formatDate, revisionInfo } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/notes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const admin = await isAdmin();
  const note = await findPublishedPost(Number(id), "note", admin);
  // 지워진 글 주소가 구글에 남아 있으면 404 가 검색 결과에 뜬다.
  // 색인에 담길 자리가 아니다(MYH-162).
  if (!note)
    return { title: "짧은 글을 찾을 수 없습니다", robots: { index: false, follow: false } };

  // 제목이 없으니 본문 첫 줄을 제목처럼 쓴다
  const title = noteTitle(note.content);

  // 나만 보는 글은 검색엔진에 알리지 않는다
  if (note.private) {
    return { title, robots: { index: false, follow: false } };
  }
  return {
    title,
    description: title,
    alternates: { canonical: `/notes/${note.id}` },
    robots: { index: true, follow: true },
  };
}

/**
 * 짧은 글 한 편. 댓글을 받으려고 글마다 화면이 하나씩 있다.
 * 제목이 없어 날짜가 제목 자리에 온다.
 */
export default async function NotePage({
  params,
  searchParams,
}: PageProps<"/notes/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const admin = await isAdmin();
  const note = await findPublishedPost(Number(id), "note", admin);
  if (!note) notFound();

  const commentError = typeof query.ce === "string" ? query.ce : undefined;
  const revision = revisionInfo(note);

  return (
    <Container>
      <article>
        {/* 제목이 없어 날짜가 제목 자리다. 고치기는 그 줄 오른쪽에 둔다.
            짧은 글은 고치는 화면이 따로 없어 관리 목록의 그 자리로 보낸다. */}
        <div className="flex items-start justify-between gap-4">
          <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
            <time
              dateTime={note.publishedAt?.toISOString()}
              className="text-base font-medium text-foreground"
            >
              {formatDate(note.publishedAt)}
            </time>
            {revision ? (
              <time dateTime={revision.at.toISOString()}>{revision.label}</time>
            ) : null}
            <span>{`조회 ${note.viewCount}`}</span>
            {/* 나만 보는 글임을 밝힌다 */}
            {note.private ? (
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                {postState(note)}
              </span>
            ) : null}
          </p>
          <AdminLinkButton href={`/admin/notes#note-${note.id}`} label="고치기" />
        </div>

        <div className="mt-4 leading-relaxed">
          <Markdown>{note.content}</Markdown>
        </div>

        {note.tags.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/notes?tag=${encodeURIComponent(tag)}`}
                  className="rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60 transition-colors hover:text-foreground"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      <AttachmentList rows={await listAttachments(note.id)} />

      <ViewCounter postId={note.id} />

      <Comments postId={note.id} errorCode={commentError} />

      <p className="mt-16 border-t border-border pt-6 text-sm">
        <Link
          href="/notes"
          className="text-foreground/60 transition-colors hover:text-foreground"
        >
          ← 짧은 글 목록으로
        </Link>
      </p>
    </Container>
  );
}
