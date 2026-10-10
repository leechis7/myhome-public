import CommentForm from "./CommentForm";
import DeleteCommentButton from "./DeleteCommentButton";
import { formatDateTime, listComments } from "@/lib/posts/comments";
import { isAdmin } from "@/lib/security/auth";

const errors: Record<string, string> = {
  required: "이름과 댓글을 모두 적어주세요.",
  length: "글자 수 제한을 넘었습니다.",
  rate: "잠시 후에 다시 남겨주세요.",
};

export default async function Comments({
  postId,
  errorCode,
}: {
  postId: number;
  errorCode?: string;
}) {
  const [rows, admin] = await Promise.all([listComments(postId), isAdmin()]);

  return (
    <section id="comments" className="mt-16 border-t border-border pt-10">
      <h2 className="text-lg font-semibold">
        댓글
        {rows.length > 0 ? (
          <span className="ml-2 text-sm font-normal text-muted tabular-nums">
            {rows.length}
          </span>
        ) : null}
      </h2>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {rows.map((comment) => (
            <li key={comment.id}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">{comment.author}</span>
                <time
                  dateTime={comment.createdAt.toISOString()}
                  className="text-xs text-faint"
                >
                  {formatDateTime(comment.createdAt)}
                </time>
                {admin ? (
                  <DeleteCommentButton
                    id={comment.id}
                    postId={postId}
                    author={comment.author}
                  />
                ) : null}
              </div>
              {/* 마크다운으로 해석하지 않는다. 본문 그대로 줄바꿈만 살린다 */}
              <p className="mt-2 leading-relaxed whitespace-pre-wrap text-foreground/80">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <CommentForm
        postId={postId}
        error={errorCode ? errors[errorCode] : undefined}
      />
    </section>
  );
}
