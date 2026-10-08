"use client";

import { useFormStatus } from "react-dom";
import {
  createComment,
  createGuestbookEntry,
} from "@/app/blog/comment-actions";
import { AUTHOR_MAX, BODY_MAX } from "@/lib/comment-limits";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";

export default function CommentForm({
  postId,
  error,
}: {
  /** 비우면 방명록(MYH-191)에 남긴다 */
  postId?: number;
  error?: string;
}) {
  const guestbook = postId === undefined;
  const what = guestbook ? "내용" : "댓글";
  return (
    <form
      action={guestbook ? createGuestbookEntry : createComment}
      className="mt-8 space-y-3"
    >
      {guestbook ? null : <input type="hidden" name="postId" value={postId} />}

      {/* 봇 함정. 사람 눈에는 보이지 않는다 */}
      <div
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="website">홈페이지</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <input
        name="author"
        aria-label="이름"
        placeholder="이름"
        maxLength={AUTHOR_MAX}
        required
        className={`${field} sm:max-w-56`}
      />
      <textarea
        name="body"
        aria-label={what}
        placeholder={guestbook ? "한마디 남겨주세요" : "댓글을 남겨주세요"}
        rows={4}
        maxLength={BODY_MAX}
        required
        className={field}
      />

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton label={guestbook ? "남기기" : "댓글 남기기"} />
        <span className="text-xs text-faint">
          이름 {AUTHOR_MAX}자, {what} {BODY_MAX}자까지
        </span>
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "등록 중…" : label}
    </button>
  );
}
