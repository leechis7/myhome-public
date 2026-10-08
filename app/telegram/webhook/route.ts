import { revalidatePath } from "next/cache";
import { addMemo } from "@/lib/memos";
import { addTodo } from "@/lib/todos";
import { hasSecretKey } from "@/lib/secret-crypto";
import { inboxDisabled, reply } from "@/lib/telegram-bot";
import { matchesSecret, readUpdate } from "@/lib/telegram-inbox";

export const dynamic = "force-dynamic";

/** 한 메모의 길이. 텔레그램 한 글이 4096자라 그보다 넉넉하게 */
const MAX_MEMO = 8000;

/**
 * 텔레그램이 봇에 온 글을 넘겨주는 자리(MYH-215). 내 대화방에서 온 글을
 * 빠른 메모로 쌓는다. 「할일 …」 로 시작하면 할 일로 넣는다(MYH-217). 문은 lib/telegram-inbox.ts 에 적었다.
 *
 * 받지 않는 글에도 200 을 준다. 4xx · 5xx 를 주면 텔레그램이 같은 글을
 * 계속 다시 보낸다. 토큰이 틀린 것만 401 이다 — 텔레그램이 보낸 것이 아니다.
 */
export async function POST(request: Request) {
  // 받기를 끈 서버면 없는 주소처럼 답한다
  if (inboxDisabled()) return new Response("Not Found", { status: 404 });
  if (!matchesSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const message = readUpdate(update, process.env.TELEGRAM_CHAT_ID);
  if (!message) return Response.json({ ok: true });

  if (message.kind === "unknown") {
    await reply(
      message.chatId,
      "저장하지 않았습니다. 「메모 …」 · 「… 메모해줘」 는 메모로, 「할일 …」 · 「… 할일에 추가」 · 「리마인드 …」 는 할 일로 넣습니다.",
    );
    return Response.json({ ok: true });
  }
  if (message.kind === "not-text") {
    await reply(message.chatId, "글만 메모로 받습니다.");
    return Response.json({ ok: true });
  }
  if (!hasSecretKey()) {
    await reply(message.chatId, "메모를 담글 열쇠(SECRETS_KEY)가 없어 받지 못했습니다.");
    return Response.json({ ok: true });
  }

  if (message.kind === "todo") {
    await addTodo(message.text.slice(0, MAX_MEMO), { source: "telegram" });
    revalidatePath("/admin/todos");
    await reply(message.chatId, "✅ 할 일에 넣었습니다.");
    return Response.json({ ok: true });
  }

  await addMemo(message.text.slice(0, MAX_MEMO), "telegram");
  revalidatePath("/admin/memos");
  await reply(message.chatId, "📝 메모했습니다.");
  return Response.json({ ok: true });
}
