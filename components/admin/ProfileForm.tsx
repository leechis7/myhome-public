"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";
import { saveProfile } from "@/app/admin/profile/actions";
import type { Profile } from "@/lib/db";

const field =
  "mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";
const label = "block text-sm font-medium";

/** 이름 · 한 줄 소개 · 소개글. 연락 수단은 ContactInfoForm 이 따로 저장한다(MYH-222) */
export default function ProfileForm({ me }: { me: Profile | undefined }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveProfile,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className={label}>
          이름
        </label>
        <input
          id="name"
          name="name"
          defaultValue={me?.name ?? ""}
          required
          className={field}
        />
      </div>

      <div>
        <label htmlFor="headline" className={label}>
          한 줄 소개
        </label>
        <input
          id="headline"
          name="headline"
          defaultValue={me?.headline ?? ""}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="bio" className={label}>
          소개글
        </label>
        <p className="mt-1 text-xs text-muted">빈 줄로 단락을 나눕니다.</p>
        <textarea
          id="bio"
          name="bio"
          rows={10}
          defaultValue={me?.bio ?? ""}
          required
          className={`${field} font-mono leading-relaxed`}
        />
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
