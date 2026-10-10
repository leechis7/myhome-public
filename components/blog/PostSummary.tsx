import Link from "next/link";
import { needsBadge, stateLabel } from "@/lib/posts/state";
import { formatDate, revisionInfo } from "@/lib/posts";

export type PostSummaryRow = {
  id: number;

  title: string;
  summary: string | null;
  tags: string[];
  published: boolean;
  private: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  version: string | null;
  revisedAt: Date | null;
  viewCount: number;
};

/**
 * 목록에 쓰는 글 한 줄. 블로그 목록과 홈이 같이 쓴다.
 *
 * 홈은 짧게 보여주면 되므로 태그와 댓글 수를 넘기지 않는다. 두 곳에 같은
 * 마크업을 두면 한쪽만 고쳐 놓고 어긋난다.
 */
export default function PostSummary({
  post,
  commentCount,
  showTags = false,
}: {
  post: PostSummaryRow;
  commentCount?: number;
  showTags?: boolean;
}) {
  const revision = revisionInfo(post);

  return (
    <>
      <p className="text-sm text-muted">
        <time dateTime={post.publishedAt?.toISOString()}>
          {formatDate(post.publishedAt)}
        </time>
        {/* 나만 보는 글 · 예약 글은 목록에서도 밝힌다. 관리자에게만 목록에 선다 */}
        {needsBadge(post) ? (
          <span className="ml-3 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
            {stateLabel(post)}
          </span>
        ) : null}
        {/* 목록에서도 개정·고침을 알 수 있게 한다. 글 화면과 같은 규칙이다 */}
        {revision ? (
          <time dateTime={revision.at.toISOString()} className="ml-3">
            {revision.label}
          </time>
        ) : null}
        {/* 문서 버전은 테두리를 둘러 눈에 띄게. 태그와 헷갈리지 않게 앞에
            "버전" 을 붙인다 */}
        {post.version ? (
          <span className="ml-3 rounded border border-border px-2 py-0.5 text-xs tabular-nums">
            {`버전 ${post.version}`}
          </span>
        ) : null}
        {post.viewCount > 0 ? (
          <span className="ml-3">{`조회 ${post.viewCount}`}</span>
        ) : null}
        {commentCount ? (
          <span className="ml-3">{`댓글 ${commentCount}`}</span>
        ) : null}
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">
        <Link
          href={`/blog/${post.id}`}
          className="transition-opacity hover:opacity-70"
        >
          {post.title}
        </Link>
      </h2>
      {post.summary ? (
        <p className="mt-2 leading-relaxed text-foreground/60">
          {post.summary}
        </p>
      ) : null}
      {showTags && post.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <li key={t}>
              <Link
                href={`/blog?tag=${encodeURIComponent(t)}`}
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
