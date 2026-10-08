"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { createGuestbookEntry } from "@/app/blog/comment-actions";
import { clientKey } from "@/lib/auth";
import { getDb, messages } from "@/lib/db";
import { BODY_MAX, NAME_MAX } from "@/lib/message-limits";
import { notifyTelegram } from "@/lib/notify";

/**
 * 방명록 한 칸에서 두 길로 간다(MYH-216). 「나에게만 보내기」 를 고르면
 * 예전 연락 폼처럼 관리 › 메시지로, 아니면 방명록 글로(MYH-191).
 */

const BACK = "/guestbook";

/** 같은 사람이 짧은 시간에 보낼 수 있는 비공개 메시지 수 */
const WINDOW_MINUTES = 30;
const MAX_PER_WINDOW = 3;

export async function leaveNote(formData: FormData) {
  if (formData.get("private") !== "1") return createGuestbookEntry(formData);

  // 봇 함정. 사람에게는 보이지 않는 칸이라 채워져 있으면 봇이다
  if (String(formData.get("website") ?? "") !== "") redirect(`${BACK}?sent=1#comments`);

  const name = String(formData.get("author") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !body) redirect(`${BACK}?ce=required#comments`);
  if (name.length > NAME_MAX || body.length > BODY_MAX || email.length > 200) {
    redirect(`${BACK}?ce=length#comments`);
  }

  const db = getDb();
  const ipHash = await clientKey();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.ipHash, ipHash), gt(messages.createdAt, since)));
  if ((recent?.count ?? 0) >= MAX_PER_WINDOW) redirect(`${BACK}?ce=rate#comments`);

  await db.insert(messages).values({ name, email: email || null, body, ipHash });
  await notifyTelegram(
    [
      "✉️ 새 메시지(나에게만)",
      `이름: ${name}`,
      email ? `메일: ${email}` : null,
      "",
      body.length > 300 ? `${body.slice(0, 300)}…` : body,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  redirect(`${BACK}?sent=1#comments`);
}
