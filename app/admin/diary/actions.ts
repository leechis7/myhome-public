"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { ensureDiary, findDiary, saveDiary } from "@/lib/my-space/diary";
import { isMood, parseDay } from "@/lib/my-space/diary-calendar";
import { addSecretImage, removeSecret } from "@/lib/my-space/secrets";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from "@/lib/uploads/limits";
import type { SecretUploadState } from "@/app/admin/secrets/actions";
import { askAi } from "@/lib/ai";
import { missOf } from "@/lib/ai/gemini";
import { memosOfDay } from "@/lib/my-space/memos";
import { DEFAULT_DIARY_PROMPT, renderDiaryPrompt } from "@/lib/my-space/diary-ai";
import { diaryAiOn, diaryAiPrompt, siteAi } from "@/lib/site/settings";

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

const MISS = {
  quota: "AI 사용 한도를 넘었습니다. 잠시 뒤에 다시 해 주세요.",
  slow: "AI 가 너무 오래 답하지 않습니다. 다시 해 주세요.",
  error: "AI 에게 묻지 못했습니다. 환경설정 › AI 사용 을 확인하세요.",
} as const;

const seoulTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * 그날 메모로 일기 초안(MYH-250). 저장하지 않고 글만 돌려준다 - 화면이 쓰는 칸에
 * 넣고 사람이 고쳐 저장한다. 나만 보는 글이 바깥 AI 로 나가므로 환경설정의
 * 스위치를 켰을 때만.
 */
export async function draftDiaryAction(dayValue: string): Promise<{ text?: string; error?: string }> {
  await requireAdmin();
  const day = parseDay(dayValue);
  if (!day) return { error: "날짜가 맞지 않습니다." };
  if (!(await diaryAiOn())) {
    return { error: "환경설정 › AI 사용 에서 「나만 보는 글을 AI 로 보내기」 를 켜 주세요." };
  }
  const access = await siteAi();
  if (!access) return { error: "쓸 AI 엔진이 없습니다. 환경설정 › AI 사용 에서 켜 주세요." };
  const memos = await memosOfDay(day);
  if (memos.length === 0) return { error: "이 날 적은 메모가 없습니다." };
  const prompt = renderDiaryPrompt((await diaryAiPrompt()) ?? DEFAULT_DIARY_PROMPT, {
    day,
    memos: memos.map((m) => ({ at: seoulTime.format(m.createdAt), text: m.content })),
  });
  try {
    const text = (await askAi(prompt, access, { timeoutMs: 90_000, temperature: 0.6 })).trim();
    return text ? { text } : { error: MISS.error };
  } catch (error) {
    return { error: MISS[missOf(error)] };
  }
}
