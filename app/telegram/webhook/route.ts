import { revalidatePath } from "next/cache";
import { addMemo } from "@/lib/my-space/memos";
import { addTodo } from "@/lib/my-space/todos";
import { rangeLabel, seoulTime, type TodoRange } from "@/lib/my-space/todo-dates";
import { todayInSeoul } from "@/lib/profile/resume-sections";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { downloadFile, inboxDisabled, reply } from "@/lib/telegram/bot";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { siteAi, siteConfig, todoAiPrompt } from "@/lib/site/settings";
import { classify } from "@/lib/telegram/classify";
import { handleReminderPress } from "@/lib/my-space/reminder-press";
import { matchesSecret, readText, readUpdate } from "@/lib/telegram/inbox";

export const dynamic = "force-dynamic";

/** 한 메모의 길이. 텔레그램 한 글이 4096자라 그보다 넉넉하게 */
const MAX_MEMO = 8000;
/** 받아쓸 음성 메시지의 길이(MYH-269). 길면 회의 화면으로 */
const MAX_VOICE_SECONDS = 5 * 60;

/**
 * 텔레그램이 봇에 온 글을 넘겨주는 자리(MYH-215). 내 대화방에서 온 글을
 * 빠른 메모로 쌓는다. 「할일 …」 로 시작하면 할 일로 넣는다(MYH-217). 문은 lib/telegram/inbox.ts 에 적었다.
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
  const ownChatId = (await siteConfig()).telegramChatId ?? undefined;
  // 미리 알림의 단추([완료] · [30분 뒤], MYH-259)
  if (await handleReminderPress(update, ownChatId)) return Response.json({ ok: true });
  const message = readUpdate(update, ownChatId);
  if (!message) return Response.json({ ok: true });

  if (message.kind === "not-text") {
    await reply(message.chatId, "글과 음성 메시지만 받습니다.");
    return Response.json({ ok: true });
  }
  if (!hasSecretKey()) {
    await reply(message.chatId, "메모를 암호화할 열쇠(SECRETS_KEY)가 없어 받지 못했습니다.");
    return Response.json({ ok: true });
  }

  // 음성 메시지(MYH-269): 받아써서 글처럼. 소리는 남기지 않는다
  let heard = "";
  if (message.kind === "voice") {
    const key = (await siteConfig()).geminiApiKey;
    if (!key) {
      await reply(message.chatId, "음성은 Gemini 가 받아씁니다. 환경설정 › AI 사용 에 Gemini 키를 넣어 주세요.");
      return Response.json({ ok: true });
    }
    if (message.seconds > MAX_VOICE_SECONDS) {
      await reply(message.chatId, `음성은 ${MAX_VOICE_SECONDS / 60}분까지 받습니다. 길면 회의 화면에 녹음 파일로 올려 주세요.`);
      return Response.json({ ok: true });
    }
    const file = await downloadFile(message.fileId);
    heard = file
      ? await transcribeAudio({ type: message.type, data: file.toString("base64") }, key).catch(() => "")
      : "";
    if (!heard) {
      await reply(message.chatId, "음성을 알아듣지 못했습니다. 다시 보내 주세요.");
      return Response.json({ ok: true });
    }
  }
  const said = message.kind === "voice" ? readText(heard) : message;
  const echo = heard ? `🎙 「${heard.length > 200 ? `${heard.slice(0, 200)}…` : heard}」\n` : "";

  // 할 일 · 메모 · 저장 안 함을 가른다(MYH-233). Gemini 키가
  // 있으면 AI 가 먼저, 실패하면 규칙. 말을 붙여 보낸 글은 그 말을 따른다
  const key = await siteAi();
  const fixed = said.kind === "free" ? null : said.kind;
  const decision = await classify(
    said.text.slice(0, MAX_MEMO),
    todayInSeoul(),
    fixed,
    key,
    seoulTime(),
    (await todoAiPrompt()) ?? undefined,
  );
  const by = key ? (decision.how === "ai" ? " (AI)" : " (규칙)") : "";

  if (decision.kind === "todo") {
    await saveTodo(message.chatId, decision.title, decision, by, echo);
  } else if (decision.kind === "memo") {
    await addMemo(decision.text, "telegram");
    revalidatePath("/admin/memos");
    await reply(message.chatId, `${echo}📝 메모했습니다.${by}`);
  } else {
    await reply(
      message.chatId,
      `${echo}저장하지 않았습니다${by}. 「메모 …」 · 「… 메모해줘」 는 메모로, 「할일 …」 · 「리마인드 …」 나 「내일 우유 사기」 처럼 할 일로 보이는 글은 할 일로 넣습니다.`,
    );
  }
  return Response.json({ ok: true });
}

async function saveTodo(chatId: string, title: string, range: TodoRange, by: string, echo = "") {
  await addTodo(title, {
    startOn: range.startOn,
    dueOn: range.dueOn,
    startTime: range.startTime,
    endTime: range.endTime,
    source: "telegram",
  });
  revalidatePath("/admin/todos");
  const when = rangeLabel(range);
  await reply(
    chatId,
    `${echo}${when ? `✅ 할 일에 넣었습니다. 「${title}」 · ${when}${by}` : `✅ 할 일에 넣었습니다. 「${title}」${by}`}`,
  );
}
