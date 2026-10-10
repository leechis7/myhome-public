"use client";

import { useRef, useState } from "react";
import {
  attachSecretFile,
  detachSecretFile,
} from "@/app/admin/secrets/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { MAX_ATTACHMENT_BYTES, formatBytes } from "@/lib/uploads/limits";

export type SecretAttachmentRow = {
  id: number;
  filename: string | null;
  size: number;
};

/**
 * 비밀글에 붙인 파일.
 *
 * 공개 글의 첨부(AttachmentEditor)와 생김새는 같지만 다른 자리다. 이쪽은
 * 파일 내용도 암호화해서 두고, 형식을 가리지 않는다 — 남에게 내려주는 파일이
 * 아니라서 브라우저가 열어 줄 필요가 없다.
 *
 * 이름이 복호화되지 않으면(열쇠가 바뀌었을 때) "열 수 없음" 으로 보여준다.
 * 목록에서 지울 수는 있어야 하므로 줄 자체는 남긴다.
 */
export default function SecretAttachmentEditor({
  secretId,
  rows,
}: {
  secretId: number;
  rows: SecretAttachmentRow[];
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
              {row.filename ? (
                <a
                  href={`/admin/secrets/files/${row.id}`}
                  className="text-sm underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  {row.filename}
                </a>
              ) : (
                <span className="text-sm text-red-600 dark:text-red-400">
                  열 수 없음
                </span>
              )}
              <span className="text-xs text-faint">
                {formatBytes(row.size)}
              </span>
              <form action={detachSecretFile} className="ml-auto">
                <input type="hidden" name="id" value={row.id} />
                <DeleteButton
                  aria-label="첨부파일 삭제"
                  className="text-xs text-faint transition-colors hover:text-red-600 dark:hover:text-red-400"
                  confirmMessage={`"${row.filename ?? "이 파일"}" 을 지울까요? 파일도 함께 지워집니다.`}
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
        action={attachSecretFile}
        className="mt-4 flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="secretId" value={secretId} />
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
