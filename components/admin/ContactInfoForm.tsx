"use client";

import { useActionState } from "react";
import { saveContacts, type ActionState } from "@/app/admin/actions";
import type { Profile } from "@/lib/db";

const field =
  "mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";
const label = "block text-sm font-medium";

/**
 * 연락 수단(MYH-222). 프로필 칸에서 떼어 따로 저장한다 — 소개 · 방명록에
 * 그대로 나오고, 비우면 그 줄이 없어진다.
 */
export default function ContactInfoForm({ me }: { me: Profile | undefined }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveContacts,
    {},
  );

  return (
    <form action={formAction} aria-label="연락 수단" className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={label}>
            개인 메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={me?.email ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="workEmail" className={label}>
            회사 메일
          </label>
          <input
            id="workEmail"
            name="workEmail"
            type="email"
            defaultValue={me?.workEmail ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="phone" className={label}>
            휴대폰
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={me?.phone ?? ""}
            placeholder="010-0000-0000"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="homepageUrl" className={label}>
            홈페이지 주소
          </label>
          <input
            id="homepageUrl"
            name="homepageUrl"
            type="url"
            defaultValue={me?.homepageUrl ?? ""}
            placeholder="https://"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="githubUrl" className={label}>
            GitHub 주소
          </label>
          <input
            id="githubUrl"
            name="githubUrl"
            type="url"
            defaultValue={me?.githubUrl ?? ""}
            placeholder="https://"
            className={field}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        {state.ok ? (
          <span className="text-sm text-foreground/60">{state.ok}</span>
        ) : null}
        {state.error ? (
          <span role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
