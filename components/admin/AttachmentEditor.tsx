"use client";

import { useRef, useState } from "react";
import { attachFile, detachFile } from "@/app/admin/attachment-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { MAX_ATTACHMENT_BYTES, formatBytes } from "@/lib/upload-limits";

export type AttachmentRow = {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * 글에 붙인 파일을 다루는 자리.
 *
 * 저장 폼과 **따로** 둔다. 저장 단추를 누르지 않아도 붙고 떨어지게 하려는
 * 것이다 — 파일을 붙였는데 저장을 안 해서 사라지면 그것만큼 허무한 일이 없다.
 * 폼 안에 폼을 둘 수 없기도 하다.
 *
 * 그래서 이 자리는 글이 이미 저장된 뒤에만 나온다. 새 글은 한 번 저장하고
 * 나서 붙인다.
 */
export default function AttachmentEditor({
  postId,
  rows,
}: {
  postId: number;
  rows: AttachmentRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="rounded-xl border border-border p-4">
      <p className="text-sm font-medium">첨부파일</p>

      {rows.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3">
              <a
                href={`/attachments/${row.id}`}
                className="text-sm underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
              >
                {row.filename}
              </a>
              <span className="text-xs text-faint">{formatBytes(row.size)}</span>
              <form action={detachFile} className="ml-auto">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="postId" value={postId} />
                {/* 한 화면에 "삭제" 가 둘이다(글 삭제·첨부 삭제). 눈에는
                    같게 보이되 읽어 주는 이름은 갈라 둔다. 시험도 이 이름으로
                    가른다. */}
                <DeleteButton
                  aria-label="첨부파일 삭제"
                  className="text-xs text-faint transition-colors hover:text-red-600 dark:hover:text-red-400"
                  confirmMessage={`"${row.filename}" 을 지울까요? 파일도 함께 지워집니다.`}
                >
                  삭제
                </DeleteButton>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">아직 붙인 파일이 없습니다.</p>
      )}

      <form
        ref={formRef}
        action={attachFile}
        className="mt-4 flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="postId" value={postId} />
        <input
          type="file"
          name="file"
          aria-label="붙일 파일"
          className="text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-transparent file:px-3 file:py-2 file:text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setError(null);
            if (!file) return;
            if (file.size > MAX_ATTACHMENT_BYTES) {
              setError(
                `파일이 너무 큽니다 (최대 ${formatBytes(MAX_ATTACHMENT_BYTES)})`,
              );
              event.target.value = "";
              return;
            }
            // 고르면 바로 올린다. 단추를 한 번 더 누르게 할 이유가 없다.
            formRef.current?.requestSubmit();
          }}
        />
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
