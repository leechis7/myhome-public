import Link from "next/link";
import Markdown from "@/components/blog/Markdown";
import ClampedText from "@/components/blog/ClampedText";
import { postState } from "@/lib/posts/state";
import { formatDate, revisionInfo } from "@/lib/posts";

export type NoteSummaryRow = {
  id: number;

  content: string;
  tags: string[];
  published: boolean;
  private: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  version: string | null;
  revisedAt: Date | null;
};

/**
 * 목록에 쓰는 짧은 글 한 줄. 짧은 글 목록과 홈이 같이 쓴다.
 *
 * 제목이 없어 날짜가 제목 자리에 오고 본문을 그대로 펼친다. 블로그 글은
 * PostSummary 가 따로 있다 — 한 줄의 모양이 달라 한 컴포넌트로 묶으면
 * 분기만 늘어난다.
 */
export default function NoteSummary({
  note,
  commentCount,
  showTags = true,
  clamp = false,
}: {
  note: NoteSummaryRow;
  commentCount?: number;
  showTags?: boolean;
  /** 몇 줄만 보이고 나머지는 그 글에서 본다. 홈에서 쓴다(MYH-184) */
  clamp?: boolean;
}) {
  const revision = revisionInfo(note);

  return (
    <>
      <p className="text-sm text-muted">
        <Link
          href={`/notes/${note.id}`}
          className="transition-colors hover:text-foreground"
        >
          <time dateTime={note.publishedAt?.toISOString()}>
            {formatDate(note.publishedAt)}
          </time>
        </Link>
        {revision ? (
          <time dateTime={revision.at.toISOString()} className="ml-3">
            {revision.label}
          </time>
        ) : null}
        {note.private ? (
          <span className="ml-3 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
            {postState(note)}
          </span>
        ) : null}
        {commentCount ? (
          <span className="ml-3">{`댓글 ${commentCount}`}</span>
        ) : null}
      </p>

      <div className="mt-2 leading-relaxed">
        {clamp ? (
          <ClampedText href={`/notes/${note.id}`}>
            <Markdown>{note.content}</Markdown>
          </ClampedText>
        ) : (
          <Markdown>{note.content}</Markdown>
        )}
      </div>

      {showTags && note.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {note.tags.map((t) => (
            <li key={t}>
              <Link
                href={`/notes?tag=${encodeURIComponent(t)}`}
                className="rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60 transition-colors hover:text-foreground"
              >
                {t}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
