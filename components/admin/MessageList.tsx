"use client";

import {
  deleteMessage,
  setMessageRead,
} from "@/app/admin/messages/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { formatDateTime } from "@/lib/format";
import type { Message } from "@/lib/db";

export default function MessageList({ rows }: { rows: Message[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        받은 메시지가 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((message) => (
        <li
          key={message.id}
          // 안 읽은 것은 테두리를 진하게 해 눈에 먼저 들어오게 한다
          className={
            message.readAt
              ? "rounded-xl border border-border p-4"
              : "rounded-xl border border-foreground/25 p-4"
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{message.name}</span>
            {message.readAt ? null : (
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                안 읽음
              </span>
            )}
            {message.email ? (
              <a
                href={`mailto:${message.email}`}
                className="text-sm text-foreground/60 underline underline-offset-4"
              >
                {message.email}
              </a>
            ) : null}
            <time
              dateTime={message.createdAt.toISOString()}
              className="text-xs text-faint"
            >
              {formatDateTime(message.createdAt)}
            </time>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
              {/* 읽은 때를 남긴다. 언제 봤는지가 나중에 도움이 된다 */}
              {message.readAt ? (
                <time
                  dateTime={message.readAt.toISOString()}
                  className="text-xs text-faint"
                >
                  {`읽음 ${formatDateTime(message.readAt)}`}
                </time>
              ) : null}
              <form action={setMessageRead}>
                <input type="hidden" name="id" value={message.id} />
                <input
                  type="hidden"
                  name="read"
                  value={message.readAt ? "0" : "1"}
                />
                <button
                  type="submit"
                  className="text-xs text-foreground/60 transition-colors hover:text-foreground"
                >
                  {message.readAt ? "읽음 취소" : "읽음"}
                </button>
              </form>
              <form action={deleteMessage}>
                <input type="hidden" name="id" value={message.id} />
                <DeleteButton
                  className="text-xs text-faint transition-colors hover:text-red-600 dark:hover:text-red-400"
                  confirmMessage={`${message.name} 님이 보낸 메시지를 지울까요? 되돌릴 수 없습니다.`}
                />
              </form>
            </div>
          </div>
          <p className="mt-2 leading-relaxed whitespace-pre-wrap text-foreground/80">
            {message.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
