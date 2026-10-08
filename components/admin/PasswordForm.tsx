"use client";

import { useActionState } from "react";
import { changePassword, type ActionState } from "@/app/admin/actions";

const field =
  "mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";
const label = "block text-sm font-medium";

export default function PasswordForm({ minLength }: { minLength: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    changePassword,
    {},
  );

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor="current" className={label}>
          지금 비밀번호
        </label>
        <input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </div>

      <div>
        <label htmlFor="next" className={label}>
          새 비밀번호
        </label>
        <input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          required
          minLength={minLength}
          className={field}
        />
        <p className="mt-1.5 text-xs text-muted">{minLength}자 이상.</p>
      </div>

      <div>
        <label htmlFor="again" className={label}>
          새 비밀번호 다시
        </label>
        <input
          id="again"
          name="again"
          type="password"
          autoComplete="new-password"
          required
          minLength={minLength}
          className={field}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-muted">{state.ok}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "바꾸는 중…" : "비밀번호 바꾸기"}
      </button>
    </form>
  );
}
