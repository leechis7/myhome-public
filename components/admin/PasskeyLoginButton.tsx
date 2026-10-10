"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import {
  finishPasskeyLogin,
  startPasskeyLogin,
} from "@/app/admin/security/passkey-actions";

export default function PasskeyLoginButton() {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const supported = useWebAuthnSupport();

  if (!supported) {
    // 단추를 내밀어 봐야 눌리지 않는다. 아래 비밀번호로 가라고 일러 준다.
    return (
      <p className="mt-6 text-sm text-muted">
        이 브라우저는 패스키를 쓸 수 없습니다. 아래에서 비밀번호로 들어오세요.
      </p>
    );
  }

  async function run() {
    setError(undefined);
    setBusy(true);
    try {
      const started = await startPasskeyLogin();
      if ("error" in started) {
        setError(started.error);
        return;
      }

      // 여기서 얼굴·지문을 묻는다
      const response = await startAuthentication({
        optionsJSON: started.options,
      });

      // 들어가지면 이 안에서 화면이 넘어간다
      startTransition(async () => {
        const result = await finishPasskeyLogin(response);
        if (result?.error) setError(result.error);
      });
    } catch (e) {
      // 그만두기를 누른 것은 잘못이 아니다. 조용히 둔다.
      if (e instanceof Error && e.name === "NotAllowedError") return;
      setError("이 기기에서 패스키를 쓸 수 없습니다.");
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={run}
        disabled={working}
        autoFocus
        className="w-full rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {working ? "확인 중…" : "패스키로 로그인"}
      </button>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 이 브라우저가 패스키를 쓸 수 있는가.
 *
 * 서버는 알 수 없으니 일단 쓸 수 있다고 그려 두고, 브라우저에서 확인한 뒤
 * 아니면 지운다. useEffect 로 하면 그린 뒤에 또 그리게 된다.
 */
function useWebAuthnSupport() {
  return useSyncExternalStore(
    () => () => {},
    () => browserSupportsWebAuthn(),
    () => true,
  );
}
