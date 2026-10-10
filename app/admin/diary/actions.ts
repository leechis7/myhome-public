"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { ensureDiary, findDiary, saveDiary } from "@/lib/my-space/diary";
import { isMood, parseDay } from "@/lib/my-space/diary-calendar";
import { addSecretImage, removeSecret } from "@/lib/my-space/secrets";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from "@/lib/uploads/limits";
import type { SecretUploadState } from "@/app/admin/secrets/actions";

/**
 * 일기장(MYH-213)을 쓰고 지운다. 암호화는 lib/my-space/diary.ts · lib/my-space/secrets.ts
 * 가 한다 — 여기서 오가는 것은 평문이다.
 */

function refresh(day: string) {
  revalidatePath("/admin/diary");
  revalidatePath(`/admin/diary/${day}`);
}

export async function saveDiaryAction(formData: FormData) {
  await requireAdmin();
  const day = parseDay(formData.get("day"));
  if (!day) redirect("/admin/diary");

  const content = String(formData.get("content") ?? "").trim();
  const mood = formData.get("mood");
  await saveDiary(day, { content, mood: isMood(mood) ? mood : null });
  refresh(day);
  redirect(`/admin/diary/${day}`);
}

export async function deleteDiaryAction(formData: FormData) {
  await requireAdmin();
  const day = parseDay(formData.get("day"));
  if (!day) return;
  const diary = await findDiary(day);
  // 그림 · 첨부도 디스크에서 함께 지운다
  if (diary) await removeSecret(diary.id);
  refresh(day);
  redirect(`/admin/diary?month=${day.slice(0, 7)}`);
}

/**
 * 본문에 넣을 그림. 비밀글 그림과 같은 자리에 암호화해 둔다. 저장하기 전이면
 * 그 날의 줄을 먼저 만든다 — 날짜가 열쇠라 번호를 화면이 이어받을 일이 없다.
 */
export async function uploadDiaryImage(
  _prev: SecretUploadState,
  formData: FormData,
): Promise<SecretUploadState> {
  await requireAdmin();
  const day = parseDay(formData.get("day"));
  const file = formData.get("file");
  if (!day) return { error: "날짜가 맞지 않습니다." };
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
  const id = await ensureDiary(day);
  const { markdown } = await addSecretImage(id, file);
  refresh(day);
  return { markdown, secretId: id };
}
