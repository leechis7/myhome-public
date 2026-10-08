"use client";

import { deleteComment } from "@/app/blog/comment-actions";
import DeleteButton from "@/components/admin/DeleteButton";

/** 관리자에게만 보인다 */
export default function DeleteCommentButton({
  id,
  postId,
  author,
}: {
  id: number;
  /** 비우면 방명록 글이다 */
  postId?: number;
  author: string;
}) {
  return (
    <form action={deleteComment}>
      <input type="hidden" name="id" value={id} />
      {postId === undefined ? null : (
        <input type="hidden" name="postId" value={postId} />
      )}
      <DeleteButton
        className="text-xs text-faint transition-colors hover:text-red-600 dark:hover:text-red-400"
        confirmMessage={`${author} 님의 ${postId === undefined ? "방명록 글" : "댓글"}을 지울까요? 되돌릴 수 없습니다.`}
      />
    </form>
  );
}
