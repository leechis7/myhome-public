import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, reminderItems } from "@/lib/db";
import { setTodoDone } from "@/lib/my-space/todos";
import { readReminderPress, SNOOZE_MS, withoutItem } from "@/lib/my-space/reminders";
import { answerPress, editButtons } from "@/lib/telegram/bot";

type Press = {
  id: string;
  data?: unknown;
  message?: {
    message_id: number;
    chat?: { id?: unknown };
    reply_markup?: { inline_keyboard?: { text: string; callback_data: string }[][] };
  };
};

/**
 * 미리 알림의 단추를 누른 것(MYH-259). 텔레그램 웹훅이 넘겨준 것이 단추 누름이면
 * 처리하고 true, 아니면 false(글로 보고 메모 · 할 일 길로 간다).
 *
 * - 내 대화방에서 누른 것만 받는다(글 받기와 같은 문)
 * - [✅ 완료]: 그 할 일을 끝낸다. [⏰ 30분 뒤]: 30분 뒤에 다시 알린다
 * - 누른 항목의 단추는 메시지에서 뺀다(같은 메시지의 다른 항목은 그대로)
 */
export async function handleReminderPress(update: unknown, ownChatId: string | undefined) {
  if (typeof update !== "object" || update === null) return false;
  const q = (update as { callback_query?: Press }).callback_query;
  if (!q || typeof q.id !== "string") return false;

  const chatId = String(q.message?.chat?.id ?? "");
  const press = readReminderPress(q.data);
  if (!ownChatId || chatId !== String(ownChatId).trim() || !press || !q.message) {
    await answerPress(q.id, "");
    return true;
  }

  const [item] = await getDb()
    .select({ id: reminderItems.id, todoId: reminderItems.todoId })
    .from(reminderItems)
    .where(eq(reminderItems.id, press.id))
    .limit(1);
  if (!item) {
    await answerPress(q.id, "지난 알림이라 할 수 없습니다.");
    return true;
  }

  if (press.action === "done") {
    if (item.todoId === null) {
      await answerPress(q.id, "일정은 구글 캘린더에서 고칩니다.");
      return true;
    }
    await setTodoDone(item.todoId, true);
    revalidatePath("/admin/todos");
    await answerPress(q.id, "✅ 끝냈습니다.");
  } else {
    await getDb()
      .update(reminderItems)
      .set({ remindAt: new Date(Date.now() + SNOOZE_MS) })
      .where(eq(reminderItems.id, item.id));
    await answerPress(q.id, "⏰ 30분 뒤에 다시 알려 드립니다.");
  }
  await editButtons(chatId, q.message.message_id, withoutItem(q.message.reply_markup, item.id));
  return true;
}
