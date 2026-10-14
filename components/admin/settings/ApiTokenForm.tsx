"use client";

import { useActionState } from "react";
import { createApiTokenAction, deleteApiTokenAction } from "@/app/admin/settings/actions";

const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 홈페이지 API 토큰 만들기 · 지우기(MYH-247). 만든 토큰은 이 자리에서 한 번만
 * 보인다 - 서버에는 sha256 만 남는다.
 */
export default function ApiTokenForm({ exists }: { exists: boolean }) {
  const [state, create, pending] = useActionState(createApiTokenAction, { token: null as string | null });
  return (
    <div className="mt-3 space-y-3">
      {state.token ? (
        <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <p className="font-medium">새 토큰입니다. 지금만 보입니다 - 복사해 두세요.</p>
          <code className="mt-2 block break-all rounded bg-foreground/[0.06] px-2 py-1 font-mono text-xs">
            {state.token}
          </code>
          <p className="mt-2 text-xs text-muted">
            예전 토큰은 더 쓰지 못합니다. 오픈클로에 넣었으면 새것으로 바꿔 주세요.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <form action={create}>
          <button type="submit" disabled={pending} className={primary}>
            {exists || state.token ? "토큰 새로 만들기" : "토큰 만들기"}
          </button>
        </form>
        {exists && !state.token ? (
          <form action={deleteApiTokenAction}>
            <button type="submit" className={`${button} text-red-600 dark:text-red-400`}>
              토큰 지우기
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
