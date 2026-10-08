"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { leaveNote } from "@/app/guestbook/actions";
import { AUTHOR_MAX, BODY_MAX as PUBLIC_MAX } from "@/lib/comment-limits";
import { BODY_MAX as PRIVATE_MAX, NAME_MAX } from "@/lib/message-limits";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";

/**
 * 방명록 · 연락 한 칸(MYH-216). 「나에게만 보내기」 를 고르면 방명록에
 * 올라가지 않고 주인에게만 간다(관리 › 메시지). 그때만 답장받을 메일을 묻는다.
 */
export default function GuestbookForm({ error }: { error?: string }) {
  const [only, setOnly] = useState(false);
  return (
    <form action={leaveNote} aria-label="남기기" className="mt-8 space-y-3">
      {/* 봇 함정. 사람 눈에는 보이지 않는다 */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">홈페이지</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          name="author"
          aria-label="이름"
          placeholder="이름"
          maxLength={only ? NAME_MAX : AUTHOR_MAX}
          required
          className={`${field} sm:max-w-56`}
        />
        {only ? (
          <input
            name="email"
            type="email"
            aria-label="답장받을 메일"
            placeholder="답장받을 메일 (비워도 됩니다)"
            maxLength={200}
            className={`${field} sm:max-w-72`}
          />
        ) : null}
      </div>
      <textarea
        name="body"
        aria-label="내용"
        placeholder={only ? "나에게만 보이는 메시지입니다" : "한마디 남겨주세요"}
        rows={only ? 7 : 4}
        maxLength={only ? PRIVATE_MAX : PUBLIC_MAX}
        required
        className={field}
      />

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="private"
          value="1"
          checked={only}
          onChange={(e) => setOnly(e.target.checked)}
        />
        🔒 나에게만 보내기
        <span className="text-xs text-faint">
          {only ? "방명록에 올라가지 않고 주인에게만 갑니다" : "체크하지 않으면 방명록에 보입니다"}
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton label={only ? "보내기" : "남기기"} />
        <span className="text-xs text-faint">
          이름 {only ? NAME_MAX : AUTHOR_MAX}자, 내용 {only ? PRIVATE_MAX : PUBLIC_MAX}자까지
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
      {pending ? "보내는 중…" : label}
    </button>
  );
}
