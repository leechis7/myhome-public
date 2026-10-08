"use client";

import { useActionState, useEffect, useState } from "react";
import ImagePicker from "@/components/admin/ImagePicker";
import {
  uploadSecretImage,
  type SecretUploadState,
} from "@/app/admin/secrets/actions";

/**
 * 비밀글 본문에 넣을 이미지.
 *
 * 올리면 붙여 넣을 마크다운 한 줄을 준다. 블로그 쪽(ImageUpload)과 생김새는
 * 같지만, 나오는 주소가 관리자만 받을 수 있는 길이고 이미지도 암호화해서 둔다.
 *
 * 새 글에서도 올릴 수 있다. 그때는 담아 둘 자리가 없으므로 서버가 빈 초안을
 * 만들어 번호를 돌려주고, 그 번호를 `onCreated` 로 화면에 넘긴다.
 */
export default function SecretImageUpload({
  secretId,
  onCreated,
}: {
  secretId: number | null;
  onCreated?: (id: number) => void;
}) {
  const [state, formAction, pending] = useActionState<
    SecretUploadState,
    FormData
  >(uploadSecretImage, {});
  const [copied, setCopied] = useState(false);

  // 새 글에서 올렸으면 그때 생긴 번호를 폼에 알린다
  useEffect(() => {
    if (state.secretId !== undefined) onCreated?.(state.secretId);
  }, [state.secretId, onCreated]);

  async function copy() {
    if (!state.markdown) return;
    try {
      await navigator.clipboard.writeText(state.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드가 막힌 환경에서는 직접 골라 복사하면 된다
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <p className="text-sm font-medium text-foreground/70">이미지 올리기</p>

      <form action={formAction}>
        {secretId === null ? null : (
          <input type="hidden" name="secretId" value={secretId} />
        )}
        <ImagePicker note="암호화해서 저장됩니다" />
        <button
          type="submit"
          disabled={pending}
          className="mt-3 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          {/* 그냥 "올리기" 로 두면 짧은 글 화면에서 글을 내는 단추와
              이름이 같아진다. 눈으로도 화면 낭독기로도 갈라지지 않는다. */}
          {pending ? "올리는 중…" : "이미지 올리기"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      {state.markdown ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-foreground/[0.07] px-2 py-1 font-mono text-xs break-all">
              {state.markdown}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-foreground/5"
            >
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">본문에 붙여 넣으세요.</p>
        </div>
      ) : null}
    </div>
  );
}
