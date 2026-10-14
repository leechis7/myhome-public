import { setCommentHiddenAction } from "@/app/blog/comment-actions";

/**
 * 숨기기 ↔ 보이기(MYH-252). 관리자에게만 보인다. 숨긴 글이면 「🚫 숨김 · 까닭」 을
 * 함께 적는다 - 방문자에게는 숨긴 글이 아예 오지 않는다.
 */
export default function HideCommentButton({
  id,
  postId,
  hiddenAt,
  reason,
}: {
  id: number;
  /** 비우면 방명록 글이다 */
  postId?: number;
  hiddenAt: Date | null;
  reason: string | null;
}) {
  const hidden = hiddenAt !== null;
  return (
    <form action={setCommentHiddenAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {postId === undefined ? null : <input type="hidden" name="postId" value={postId} />}
      <input type="hidden" name="hide" value={hidden ? "0" : "1"} />
      {hidden ? (
        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-700 dark:text-red-300">
          🚫 숨김{reason ? ` · ${reason}` : ""}
        </span>
      ) : null}
      <button type="submit" className="text-xs text-faint transition-colors hover:text-foreground">
        {hidden ? "보이기" : "숨기기"}
      </button>
    </form>
  );
}
