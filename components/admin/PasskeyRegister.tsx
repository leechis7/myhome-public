"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  finishPasskeyRegistration,
  startPasskeyRegistration,
} from "@/app/admin/passkey-actions";
import { MAX_PASSKEY_LABEL } from "@/lib/passkey-limits";

export default function PasskeyRegister() {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const supported = useWebAuthnSupport();

  async function run() {
    setError(undefined);
    setOk(undefined);

    if (!label.trim()) {
      setError("기기 이름을 적어 주세요.");
      return;
    }

    setBusy(true);
    try {
      const started = await startPasskeyRegistration();
      if ("error" in started) {
        setError(started.error);
        return;
      }

      // 여기서 얼굴·지문을 묻고 기기가 열쇠를 만든다
      const response = await startRegistration({ optionsJSON: started.options });

      startTransition(async () => {
        const result = await finishPasskeyRegistration(label, response);
        if (result.error) setError(result.error);
        if (result.ok) {
          setOk(result.ok);
          setLabel("");
        }
      });
    } catch (e) {
      if (e instanceof Error && e.name === "NotAllowedError") return;
      // 같은 패스키로 또 등록하려 하면 브라우저가 여기서 막는다
      if (e instanceof Error && e.name === "InvalidStateError") {
        setError(
          "이미 등록된 패스키입니다. 안드로이드·크롬은 패스키를 구글 계정에 " +
            "담아 기기끼리 나눠 쓰므로, 다른 기기에서 눌러도 폰에 있는 것이 " +
            "잡힐 수 있습니다. 목록을 보고 이름을 확인하세요. 이 기기에 따로 " +
            "만들려면 확인 창에서 '이 기기' 쪽을 고르세요.",
        );
        return;
      }
      setError("이 기기에서 패스키를 쓸 수 없습니다.");
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  if (!supported) {
    return (
      <p className="text-sm text-muted">
        이 브라우저는 패스키를 쓸 수 없습니다.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <p className="mb-3 text-sm font-medium text-foreground/70">새 기기 등록</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="passkey-label" className="block text-sm font-medium">
            기기 이름
          </label>
          <input
            id="passkey-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={MAX_PASSKEY_LABEL}
            placeholder="아이폰"
            className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
          />
          <p className="mt-1.5 text-xs text-muted">
            나중에 어느 기기인지 알아볼 이름입니다.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {ok ? <p className="text-sm text-muted">{ok}</p> : null}

        <button
          type="button"
          onClick={run}
          disabled={working}
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {working ? "등록하는 중…" : "이 기기 등록"}
        </button>
      </div>
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
