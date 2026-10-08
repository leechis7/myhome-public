"use client";

import { useActionState } from "react";
import { setupAdmin } from "@/app/admin/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-limits";

const field =
  "mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";

/**
 * 처음 관리자 비밀번호 정하기(MYH-172). 빈 DB 로 처음 띄워 비밀번호가 아직
 * 없을 때 로그인 대신 나온다. 설치 코드는 앱을 띄운 로그에 찍혀 있다.
 */
export default function SetupForm() {
  const [state, action, pending] = useActionState(setupAdmin, {});
  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        관리자 비밀번호 정하기
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-foreground/60">
        처음 띄웠습니다. 관리 화면에 들어갈 비밀번호를 정하세요. 설치 코드는
        앱이 뜰 때 로그에 찍혀 있습니다(
        <code className="font-mono text-xs">docker compose logs app</code>).
      </p>
      <form action={action} className="mt-6 space-y-4">
        <label className="block text-sm">
          설치 코드
          <input
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            className={`${field} font-mono uppercase tracking-widest`}
          />
        </label>
        <label className="block text-sm">
          새 비밀번호
          <input
            name="next"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className={field}
          />
        </label>
        <label className="block text-sm">
          한 번 더
          <input
            name="again"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className={field}
          />
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "정하는 중…" : "정하고 들어가기"}
        </button>
      </form>
      <p className="mt-4 text-xs text-faint">
        {MIN_PASSWORD_LENGTH}자 이상. 정한 뒤에는 관리 › 설정 › 암호에서 바꾸고,
        패스키도 등록할 수 있습니다.
      </p>
    </div>
  );
}
