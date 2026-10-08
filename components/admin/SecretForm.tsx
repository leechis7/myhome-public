"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteButton from "@/components/admin/DeleteButton";
import SecretAttachmentEditor, {
  type SecretAttachmentRow,
} from "@/components/admin/SecretAttachmentEditor";
import ImageList, { type ImageRow } from "@/components/admin/ImageList";
import SecretImageUpload from "@/components/admin/SecretImageUpload";
import MarkdownField from "@/components/admin/markdown/MarkdownField";
import {
  addSecret,
  deleteSecret,
  deleteSecretImage,
  rotateSecretImageAction,
  saveSecret,
  uploadSecretImage,
} from "@/app/admin/secrets/actions";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";

export type SecretDraft = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  writtenAt: Date;
};

/**
 * 비밀글 쓰기·고치기.
 *
 * 블로그 글과 달리 요약·발행 상태가 없다. 남에게 보여줄 것이 아니라
 * 공개/비공개를 고를 일이 없다 — 전부 나만 본다.
 *
 * 태그는 있다. 쌓이면 찾을 길이 필요하고, 태그도 암호화해서 저장한다.
 *
 * 이미지는 블로그처럼 맨 위에 두고 저장 전에도 올릴 수 있다. 새 글에서
 * 올리면 서버가 빈 초안을 만들어 번호를 주고, 이 화면이 그 번호를 이어받아
 * 저장할 때 새로 만들지 않고 그 글을 고친다.
 *
 * 첨부는 저장 단추 **위**에 둔다. 파일은 고르는 즉시 붙고 저장은 제목과
 * 본문만 담는다 — 아래에 두면 "저장을 눌러야 파일도 붙나" 하고 헷갈린다.
 */
export default function SecretForm({
  secret,
  attachments,
  images = [],
}: {
  secret?: SecretDraft;
  attachments?: SecretAttachmentRow[];
  images?: ImageRow[];
}) {
  // 새 글에서 이미지를 올리면 그때 번호가 생긴다. 그 뒤의 저장은 만들기가
  // 아니라 고치기다 — 안 그러면 이미지가 딸린 빈 글이 따로 남는다.
  const [id, setId] = useState(secret?.id ?? null);

  const formId = "secret-form";
  const day = (secret?.writtenAt ?? new Date()).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* 이미지 올리기는 자체 폼이라 글 폼 바깥에 둔다.
          폼 안에 폼을 넣으면 브라우저가 안쪽 폼을 버린다. */}
      <SecretImageUpload secretId={id} onCreated={setId} />

      <ImageList
        rows={images}
        deleteAction={deleteSecretImage}
        rotateAction={rotateSecretImageAction}
        bodyForm={formId}
      />

      <form
        id={formId}
        action={id === null ? addSecret : saveSecret}
        className="space-y-4"
      >
        {id === null ? null : <input type="hidden" name="id" value={id} />}

        <label className="block text-sm text-muted">
          제목
          <input
            name="title"
            required
            defaultValue={secret?.title ?? ""}
            className={`${field} mt-1 text-base`}
          />
        </label>

        <label className="block text-sm text-muted">
          태그
          <input
            name="tags"
            defaultValue={secret?.tags.join(", ") ?? ""}
            placeholder="쉼표로 구분"
            className={`${field} mt-1`}
          />
        </label>

        <label className="block text-sm text-muted">
          날짜
          <input
            type="date"
            name="writtenAt"
            defaultValue={day}
            className={`${field} mt-1`}
          />
        </label>

        <MarkdownField
          id="secret-content"
          name="content"
          rows={18}
          required
          defaultValue={secret?.content ?? ""}
          placeholder="마크다운으로 씁니다. 여기 적은 것은 암호화해서 저장됩니다."
          textareaClassName={`${field} font-mono leading-relaxed`}
          // 붙여넣거나 끌어놓은 그림도 담아서(암호화) 저장한다(MYH-192)
          imageUpload={{
            action: uploadSecretImage,
            idField: "secretId",
            id,
            onCreated: setId,
          }}
        />
      </form>

      {secret ? (
        <SecretAttachmentEditor secretId={secret.id} rows={attachments ?? []} />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          첨부파일은 한 번 저장한 뒤에 붙일 수 있습니다. 본문에 넣을 이미지는
          지금도 올릴 수 있습니다.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" form={formId} className={primary}>
          저장
        </button>
        <Link href="/admin/secrets" className={button}>
          목록
        </Link>

        {secret ? (
          <form action={deleteSecret} className="ml-auto">
            <input type="hidden" name="id" value={secret.id} />
            <DeleteButton
              className="text-sm text-faint transition-colors hover:text-red-600 dark:hover:text-red-400"
              confirmMessage="이 비밀글을 지울까요? 붙인 파일도 함께 지워집니다. 되돌릴 수 없습니다."
            >
              삭제
            </DeleteButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
