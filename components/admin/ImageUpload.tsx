"use client";

import { useActionState, useEffect, useState } from "react";
import ImagePicker from "@/components/admin/ImagePicker";
import { uploadImage, type UploadState } from "@/app/admin/posts/actions";

/**
 * 본문에 넣을 이미지를 올린다.
 * 올리고 나면 마크다운 한 줄을 보여주고, 눌러서 복사할 수 있게 한다.
 *
 * 그림은 글에 매달린다(MYH-145). 새 글이면 아직 번호가 없으므로 서버가 빈
 * 초안을 만들어 번호를 돌려주고, 그 번호를 `onCreated` 로 화면에 넘긴다 —
 * 그래야 저장할 때 새 글을 또 만들지 않는다. 비밀글이 먼저 쓰던 길이다.
 */
export default function ImageUpload({
  postId = null,
  kind = "post",
  onCreated,
}: {
  postId?: number | null;
  /** 빈 초안을 만들 때 블로그 글인지 짧은 글인지 */
  kind?: "post" | "note";
  onCreated?: (id: number) => void;
} = {}) {
  // 서버 액션을 그대로 넘긴다. 클로저로 감싸면 폼이 액션 참조를 잃어
  // 자바스크립트가 없을 때 전송되지 않는다.
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadImage,
    {},
  );
  const [copied, setCopied] = useState(false);

  // 새 글에서 올렸으면 그때 생긴 번호를 폼에 알린다
  useEffect(() => {
    if (state.postId !== undefined) onCreated?.(state.postId);
  }, [state.postId, onCreated]);

  async function copy() {
    if (!state.markdown) return;
    try {
      await navigator.clipboard.writeText(state.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드가 막힌 환경에서는 직접 선택해 복사하면 된다
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <p className="text-sm font-medium text-foreground/70">이미지 올리기</p>

      <form action={formAction}>
        {postId === null ? null : (
          <input type="hidden" name="postId" value={postId} />
        )}
        <input type="hidden" name="kind" value={kind} />
        <ImagePicker />
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
          <p className="mt-2 text-xs text-muted">
            본문에 붙여 넣으세요.
            {state.note ? ` 용량을 줄였습니다${state.note}.` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
