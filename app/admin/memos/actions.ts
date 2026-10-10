"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { addMemo, moveMemoToDiary, removeMemo, updateMemo } from "@/lib/my-space/memos";
import { asTodo } from "@/lib/telegram/inbox";
import { addTodo } from "@/lib/my-space/todos";
import {
  connectWebhook,
  currentWebhook,
  inboxReady,
  disconnectWebhook,
  webhookUrl,
} from "@/lib/telegram/bot";

/** 빠른 메모(MYH-215) 화면의 일. 암호화는 lib/my-space/memos.ts 가 한다 */

const BACK = "/admin/memos";

function id(formData: FormData) {
  const n = Number(formData.get("id"));
  return Number.isInteger(n) && n > 0 ? n : null;
}

function text(formData: FormData) {
  return String(formData.get("content") ?? "").trim();
}

export async function addMemoAction(formData: FormData) {
  await requireAdmin();
  const content = text(formData);
  if (content) await addMemo(content, "web");
  revalidatePath(BACK);
  redirect(BACK);
}

export async function saveMemoAction(formData: FormData) {
  await requireAdmin();
  const memo = id(formData);
  const content = text(formData);
  if (memo && content) await updateMemo(memo, content);
  revalidatePath(BACK);
  redirect(BACK);
}

export async function deleteMemoAction(formData: FormData) {
  await requireAdmin();
  const memo = id(formData);
  if (memo) await removeMemo(memo);
  revalidatePath(BACK);
}

export async function moveMemoAction(formData: FormData) {
  await requireAdmin();
  const memo = id(formData);
  const day = memo ? await moveMemoToDiary(memo) : null;
  revalidatePath(BACK);
  if (day) {
    revalidatePath("/admin/diary");
    revalidatePath(`/admin/diary/${day}`);
  }
  redirect(day ? `${BACK}?moved=${day}` : BACK);
}

/**
 * 텔레그램에 웹훅을 건다. 다른 주소(같은 봇을 쓰는 다른 서버)에 걸려 있으면
 * 「옮기기」 를 체크해야 건다 — 그쪽은 받지 못하게 된다.
 */
export async function connectTelegramAction(formData: FormData) {
  await requireAdmin();
  // 받기를 끈 서버(개발기)에서는 걸지 않는다 - 운영의 웹훅을 빼앗는다
  if (!(await inboxReady())) redirect("/admin/settings#telegram");
  const now = await currentWebhook();
  if (now.url && now.url !== webhookUrl() && formData.get("takeOver") !== "1") {
    redirect("/admin/settings?tg=elsewhere#telegram");
  }
  const result = await connectWebhook();
  redirect(`/admin/settings?tg=${result.ok ? "connected" : "failed"}#telegram`);
}

export async function disconnectTelegramAction() {
  await requireAdmin();
  const now = await currentWebhook();
  // 다른 서버에 걸린 것을 여기서 풀지 않는다
  if (now.url === webhookUrl()) await disconnectWebhook();
  redirect("/admin/settings?tg=disconnected#telegram");
}

export type QuickMemoState = { ok?: boolean; error?: string; todo?: boolean };

/**
 * 어느 화면에서나 띄우는 메모 창(MYH-223). 화면을 옮기지 않고 결과만 돌려준다.
 */
export async function quickMemoAction(
  _prev: QuickMemoState,
  formData: FormData,
): Promise<QuickMemoState> {
  await requireAdmin();
  const content = text(formData);
  if (!content) return { error: "글을 적어 주세요." };
  // 텔레그램처럼 「할일 …」 로 시작하면 할 일로 넣는다
  const todo = asTodo(content);
  if (todo) {
    await addTodo(todo.slice(0, 8000));
    revalidatePath("/admin/todos");
    return { ok: true, todo: true };
  }
  await addMemo(content.slice(0, 8000), "web");
  revalidatePath(BACK);
  return { ok: true };
}
