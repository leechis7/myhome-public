import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { askAi } from "@/lib/ai";
import { comments, getDb } from "@/lib/db";
import { DEFAULT_SPAM_PROMPT, readSpam, renderSpamPrompt, SPAM_SCHEMA } from "@/lib/posts/spam";
import { promptSetting, siteAi } from "@/lib/site/settings";
import { notifyTelegram } from "@/lib/telegram/notify";

/**
 * 새 방명록 · 댓글을 AI 가 본다(MYH-252). 응답을 보낸 뒤에(after) 부른다 - 방문자가
 * AI 를 기다리지 않게. 스팸이면 숨기고 텔레그램으로 알린다. AI 가 없거나 실패하면
 * 아무것도 하지 않는다(보이는 그대로).
 */
export async function checkSpam(
  id: number,
  { where, author, body, back }: { where: "guestbook" | "comment"; author: string; body: string; back: string },
) {
  const access = await siteAi();
  if (!access) return;
  let verdict: { reason: string } | null;
  try {
    const prompt = renderSpamPrompt((await promptSetting("spamAiPrompt")) ?? DEFAULT_SPAM_PROMPT, {
      where,
      author,
      body,
    });
    verdict = readSpam(await askAi(prompt, access, { timeoutMs: 60_000, schema: SPAM_SCHEMA, temperature: 0 }));
  } catch {
    return;
  }
  if (!verdict) return;
  // 그 사이 관리자가 손댔으면(숨기거나 지웠으면) 두 번 하지 않는다
  const [hidden] = await getDb()
    .update(comments)
    .set({ hiddenAt: new Date(), hiddenReason: verdict.reason })
    .where(and(eq(comments.id, id), isNull(comments.hiddenAt)))
    .returning({ id: comments.id });
  if (!hidden) return;
  revalidatePath(back);
  await notifyTelegram(
    [
      `🚫 AI 가 ${where === "guestbook" ? "방명록" : "댓글"}을 숨겼습니다`,
      `까닭: ${verdict.reason}`,
      `이름: ${author}`,
      "",
      body.length > 200 ? `${body.slice(0, 200)}…` : body,
      "",
      "보이게 하려면 그 화면에서 「보이기」.",
    ].join("\n"),
  );
}
