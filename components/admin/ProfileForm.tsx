"use client";

import { useActionState } from "react";
import { saveProfile, type ActionState } from "@/app/admin/actions";
import type { Profile } from "@/lib/db";

const field =
  "mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";
const label = "block text-sm font-medium";

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

      {/* 여기 적은 것이 소개·연락처에 그대로 나온다. 비우면 그 줄이 없어진다 */}
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
