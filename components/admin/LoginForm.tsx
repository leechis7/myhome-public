"use client";

import { useFormStatus } from "react-dom";
import { login } from "@/app/admin/actions";
import PasskeyLoginButton from "@/components/admin/PasskeyLoginButton";

export default function LoginForm({
  error,
  passkeyReady,
}: {
  error?: string;
  /** 등록된 기기가 하나도 없으면 패스키 단추를 내도 누를 것이 없다 */
  passkeyReady: boolean;
}) {
  /**
   * 비밀번호 칸은 접어 둔다. 패스키가 앞이다.
   *
   * 다만 접힌 채로 두면 안 되는 때가 있다. 등록한 기기가 아직 없으면
   * 패스키로는 들어올 방법이 없고, 비밀번호가 틀렸다는 말은 그 칸이 보여야
   * 읽힌다. `details` 로 접은 것은 자바스크립트가 없어도 열리기 때문이다 —
   * 비밀번호는 마지막 뒷문이라 어떤 환경에서도 닫히면 안 된다.
   */
  const openPassword = !passkeyReady || Boolean(error);

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">관리자 로그인</h1>
      <p className="mt-2 text-sm text-foreground/60">
        {passkeyReady
          ? "등록한 기기의 얼굴·지문으로 들어옵니다."
          : "소개 내용을 수정하려면 로그인하세요."}
      </p>

      {passkeyReady ? <PasskeyLoginButton /> : null}

      <details open={openPassword} className="group mt-6">
        <summary className="cursor-pointer list-none text-sm text-muted transition-colors hover:text-foreground">
          비밀번호로 로그인
        </summary>

        <form action={login} className="mt-5">
          <label htmlFor="password" className="block text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
          />

          {error ? (
            <p
              role="alert"
              className="mt-3 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </details>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 w-full rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground/40 disabled:opacity-50"
    >
      {pending ? "확인 중…" : "로그인"}
    </button>
  );
}
