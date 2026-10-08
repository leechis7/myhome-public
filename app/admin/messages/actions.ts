"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, messages } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * 읽음으로 표시하거나 되돌린다.
 *
 * read_at 칸은 연락 폼을 만들 때부터 있었는데 채우는 화면이 없어, 모든
 * 메시지가 영원히 "안 읽음" 이었다. 대시보드의 "안 읽은 메시지" 가 쌓이기만
 * 하는 것을 보고 알았다(2026-09-10).
 *
 * 되돌리기를 같이 두는 이유: 잘못 누를 수 있고, 다시 답장할 것으로 돌려
 * 놓고 싶을 때도 있다.
 */
export async function setMessageRead(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const read = formData.get("read") === "1";
  await getDb()
    .update(messages)
    .set({ readAt: read ? new Date() : null })
    .where(eq(messages.id, id));
  revalidatePath("/admin/messages");
}

export async function deleteMessage(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await getDb().delete(messages).where(eq(messages.id, id));
  revalidatePath("/admin/messages");
}
