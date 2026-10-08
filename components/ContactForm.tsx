"use client";

import { useFormStatus } from "react-dom";
import { sendMessage } from "@/app/contact/actions";
import { BODY_MAX, NAME_MAX } from "@/lib/message-limits";

const field =
  "mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";
const label = "block text-sm font-medium";

export default function ContactForm({ error }: { error?: string }) {
  return (
    <form action={sendMessage} className="space-y-5">
      {/* 봇 함정. 사람 눈에는 보이지 않는다 */}
      <div
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="website">홈페이지</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>
            이름
          </label>
          <input
            id="name"
            name="name"
            maxLength={NAME_MAX}
            required
            className={field}
          />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            답장받을 메일
          </label>
          {/* 안내를 칸 밖에 두면 그 줄만큼 아래가 밀려 이름 칸과 높이가
              어긋난다. placeholder 로 칸 안에 넣는다. */}
          <input
            id="email"
            name="email"
            type="email"
            placeholder="비워두셔도 됩니다"
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="body" className={label}>
          내용
        </label>
        <textarea
          id="body"
          name="body"
          rows={7}
          maxLength={BODY_MAX}
          required
          className={field}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "보내는 중…" : "보내기"}
    </button>
  );
}
