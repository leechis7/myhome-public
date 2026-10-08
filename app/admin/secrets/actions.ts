"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  addSecretAttachment,
  addSecretImage,
  createDraftSecret,
  createSecret,
  removeSecret,
  removeSecretAttachment,
  removeSecretImage,
  rotateSecretImage,
  updateSecret,
} from "@/lib/secrets";
import {
  ALLOWED_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_UPLOAD_BYTES,
} from "@/lib/upload-limits";

export type SecretUploadState = {
  error?: string;
  markdown?: string;
  /** 새 글에서 올렸을 때 만들어진 글 번호. 화면이 이것을 이어받는다 */
  secretId?: number;
};

/**
 * 비밀글을 담고 고치고 지운다.
 *
 * 여기서 오가는 것은 평문이다. 암호화는 lib/secrets.ts 가 한다 —
 * 이 파일에서 암호화를 부르기 시작하면 빠뜨리는 자리가 생긴다.
 *
 * 화면 새로 고침(revalidatePath)은 /admin/secrets 아래만 한다. 이 글은
 * 공개 화면 어디에도 나오지 않으므로 다른 길은 건드릴 것이 없다.
 */

function parse(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const writtenRaw = String(formData.get("writtenAt") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  // 날짜 칸은 <input type="date"> 라 "2026-09-15" 로 온다. 시각이 없으면
  // 자정(UTC)으로 읽혀 하루 밀려 보이므로 그 날의 정오로 맞춘다.
  const written = writtenRaw ? new Date(`${writtenRaw}T12:00:00`) : new Date();

  return {
    title,
    content,
    tags,
    writtenAt: Number.isNaN(written.getTime()) ? new Date() : written,
  };
}

export async function addSecret(formData: FormData) {
  await requireAdmin();

  const values = parse(formData);
  if (!values.title || !values.content) {
    redirect("/admin/secrets/new?e=required");
  }

  const id = await createSecret(values);
  revalidatePath("/admin/secrets");
  redirect(`/admin/secrets/${id}`);
}

export async function saveSecret(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const values = parse(formData);
  if (!values.title || !values.content) {
    redirect(`/admin/secrets/${id}/edit?e=required`);
  }

  await updateSecret(id, values);
  revalidatePath("/admin/secrets");
  revalidatePath(`/admin/secrets/${id}`);
  redirect(`/admin/secrets/${id}`);
}

export async function deleteSecret(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await removeSecret(id);
  revalidatePath("/admin/secrets");
  redirect("/admin/secrets");
}

export async function attachSecretFile(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("secretId"));
  const file = formData.get("file");
  if (!Number.isInteger(id) || !(file instanceof File) || file.size === 0) {
    return;
  }
  // 형식은 가리지 않는다. 남에게 내려주는 파일이 아니라 나만 받는 것이고,
  // 내려줄 때도 브라우저가 열지 않게 첨부로 준다.
  if (file.size > MAX_ATTACHMENT_BYTES) {
    redirect(`/admin/secrets/${id}/edit?e=too-big`);
  }

  await addSecretAttachment(id, file);
  revalidatePath(`/admin/secrets/${id}`);
  revalidatePath(`/admin/secrets/${id}/edit`);
}

export async function detachSecretFile(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const secretId = await removeSecretAttachment(id);
  if (secretId) {
    revalidatePath(`/admin/secrets/${secretId}`);
    revalidatePath(`/admin/secrets/${secretId}/edit`);
  }
}

/**
 * 본문에 넣은 그림을 목록에서 지운다(MYH-148).
 *
 * 첨부를 떼는 것(detachSecretFile)과 하는 일은 같다 — 줄과 암호화한 파일을
 * 함께 지운다. 비밀글 파일은 이름이 난수라 딴 글이 같은 것을 가리킬 수
 * 없어서, 블로그처럼 "아무도 안 볼 때만" 을 따질 것이 없다.
 *
 * 본문에 쓰고 있어도 막지 않는다. 목록이 어디에 쓰는지 보여 주고
 * 지울지는 사람이 정한다. 지우면 본문에서도 그 그림을 뺀다(MYH-197).
 */
export async function deleteSecretImage(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const secretId = await removeSecretImage(id);
  if (secretId) {
    revalidatePath(`/admin/secrets/${secretId}`);
    revalidatePath(`/admin/secrets/${secretId}/edit`);
  }
}

/** 비밀글 본문 그림을 90도 돌린다(MYH-151) */
export async function rotateSecretImageAction(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const turn = formData.get("turn") === "left" ? "left" : "right";
  const secretId = await rotateSecretImage(id, turn);
  if (secretId) {
    revalidatePath(`/admin/secrets/${secretId}`);
    revalidatePath(`/admin/secrets/${secretId}/edit`);
  }
}

/**
 * 본문에 넣을 그림을 올린다. 올리고 나면 붙여 넣을 마크다운 한 줄을 준다.
 *
 * 블로그 쪽(uploadImage)과 하는 일은 같지만 두는 자리가 다르다. 이쪽은
 * 암호화해서 비밀글 첨부와 같은 곳에 두고, 주소도 관리자만 받는 길로 준다.
 */
export async function uploadSecretImage(
  _prev: SecretUploadState,
  formData: FormData,
): Promise<SecretUploadState> {
  await requireAdmin();

  const given = Number(formData.get("secretId"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "파일을 선택하세요." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "PNG, JPEG, GIF, WebP, AVIF 만 올릴 수 있습니다." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `파일이 너무 큽니다. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB까지 됩니다.`,
    };
  }

  // 새 글이면 아직 번호가 없다. 담아 둘 자리를 먼저 만든다.
  //
  // 칸이 아예 없으면 Number(null) 이 0 이 된다. 0 도 정수라 그대로 통과해
  // 없는 글에 붙이려다 터진다. 있는 번호인지까지 본다.
  const secretId =
    Number.isInteger(given) && given > 0 ? given : await createDraftSecret();

  const { markdown } = await addSecretImage(secretId, file);
  revalidatePath("/admin/secrets");
  revalidatePath(`/admin/secrets/${secretId}`);
  revalidatePath(`/admin/secrets/${secretId}/edit`);
  return { markdown, secretId };
}
