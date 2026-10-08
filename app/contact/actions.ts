"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb, messages } from "@/lib/db";
import { clientKey } from "@/lib/auth";
import { notifyTelegram } from "@/lib/notify";
import { NAME_MAX, BODY_MAX } from "@/lib/message-limits";

/** 같은 사람이 짧은 시간에 몇 개까지 보낼 수 있는지 */
const WINDOW_MINUTES = 30;
const MAX_PER_WINDOW = 3;

export async function sendMessage(formData: FormData) {
  // 봇 함정. 사람에게는 보이지 않는 칸이라 채워져 있으면 봇이다.
  if (String(formData.get("website") ?? "") !== "") {
    redirect("/contact?sent=1");
  }

  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!name || !body) redirect("/contact?e=required");
  if (name.length > NAME_MAX || body.length > BODY_MAX) {
    redirect("/contact?e=length");
  }

  const db = getDb();
  const ipHash = await clientKey();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.ipHash, ipHash), gt(messages.createdAt, since)));

  if ((recent?.count ?? 0) >= MAX_PER_WINDOW) {
    redirect("/contact?e=rate");
  }

  await db.insert(messages).values({
    name,
    email: email || null,
    body,
    ipHash,
  });

  await notifyTelegram(
    [
      "✉️ 새 메시지",
      `이름: ${name}`,
      email ? `메일: ${email}` : null,
      "",
      body.length > 300 ? `${body.slice(0, 300)}…` : body,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  redirect("/contact?sent=1");
}
