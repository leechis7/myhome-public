import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/Container";
import DeleteButton from "@/components/admin/DeleteButton";
import {
  addTodoAction,
  clearDoneAction,
  deleteTodoAction,
  saveTodoAction,
  toggleTodoAction,
} from "@/app/admin/todos/actions";
import { isAdmin } from "@/lib/auth";
import { todayInSeoul } from "@/lib/resume-sections";
import { hasSecretKey } from "@/lib/secret-crypto";
import { listTodos } from "@/lib/todos";

export const metadata: Metadata = {
  title: "할 일",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const field =
  "rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-2.5 py-1 text-xs transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/** 2026-10-08 → 10.8 */
function short(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${m}.${d}`;
}

/**
 * 할 일(MYH-217). 체크리스트다. 기한은 골라서 붙인다. 텔레그램 봇에게
 * 「할일 우유 사기」 처럼 보내도 여기에 들어온다(빠른 메모와 같은 길).
 */
export default async function TodosPage() {
  if (!(await isAdmin())) redirect("/admin");
  if (!hasSecretKey()) notFound();

  const today = todayInSeoul();
  const { open, done } = await listTodos();

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">할 일</h1>
      <p className="mt-3 text-sm text-muted">
        텔레그램 봇에게 「할일 우유 사기」 · 「우유 사기 할일에 추가」 · 「리마인드 …」 처럼 보내도 여기에 들어옵니다(
        <Link href="/admin/memos" className="underline underline-offset-4">
          메모
        </Link>
        에서 연결).
      </p>

      <form
        action={addTodoAction}
        aria-label="할 일 더하기"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <input
          name="title"
          required
          aria-label="새 할 일"
          placeholder="할 일"
          className={`${field} min-w-0 flex-1`}
        />
        <input type="date" name="dueOn" aria-label="기한" className={field} />
        <button type="submit" className={primary}>
          더하기
        </button>
      </form>

      {open.length === 0 ? (
        <p className="mt-10 text-sm text-muted">남은 할 일이 없습니다. 🎉</p>
      ) : (
        <ul className="mt-8 divide-y divide-border" aria-label="남은 할 일">
          {open.map((todo) => {
            const late = todo.dueOn !== null && todo.dueOn < today;
            return (
              <li key={todo.id} className="flex flex-wrap items-center gap-3 py-3">
                <form action={toggleTodoAction}>
                  <input type="hidden" name="id" value={todo.id} />
                  <input type="hidden" name="done" value="1" />
                  <button
                    type="submit"
                    aria-label={`${todo.title ?? "할 일"} 끝냄`}
                    className="grid size-5 place-items-center rounded border border-foreground/40 transition-colors hover:bg-foreground/10"
                  />
                </form>
                <span className="min-w-0 flex-1 text-sm">{todo.title ?? "열 수 없음"}</span>
                {todo.source === "telegram" ? (
                  <span className="text-xs text-sky-700 dark:text-sky-400">텔레그램</span>
                ) : null}
                {todo.dueOn ? (
                  <span
                    className={`text-xs tabular-nums ${
                      late
                        ? "font-medium text-red-600 dark:text-red-400"
                        : todo.dueOn === today
                          ? "font-medium text-amber-700 dark:text-amber-400"
                          : "text-muted"
                    }`}
                  >
                    {late ? "넘김 · " : todo.dueOn === today ? "오늘 · " : ""}
                    {short(todo.dueOn)}
                  </span>
                ) : null}
                {todo.title !== null ? (
                  <details className="basis-full sm:basis-auto">
                    <summary className={`${button} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                      고치기
                    </summary>
                    <form action={saveTodoAction} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={todo.id} />
                      <input
                        name="title"
                        required
                        defaultValue={todo.title}
                        aria-label="할 일 고치기"
                        className={`${field} min-w-0 flex-1`}
                      />
                      <input
                        type="date"
                        name="dueOn"
                        defaultValue={todo.dueOn ?? ""}
                        aria-label="기한 고치기"
                        className={field}
                      />
                      <button type="submit" className={primary}>
                        저장
                      </button>
                    </form>
                  </details>
                ) : null}
                <form action={deleteTodoAction}>
                  <input type="hidden" name="id" value={todo.id} />
                  <DeleteButton
                    aria-label="할 일 삭제"
                    className={`${button} text-red-600 dark:text-red-400`}
                    confirmMessage="지울까요?"
                  />
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 ? (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm text-muted">
            끝낸 일 {done.length}
          </summary>
          <ul className="mt-3 divide-y divide-border" aria-label="끝낸 일">
            {done.map((todo) => (
              <li key={todo.id} className="flex items-center gap-3 py-2.5">
                <form action={toggleTodoAction}>
                  <input type="hidden" name="id" value={todo.id} />
                  <input type="hidden" name="done" value="0" />
                  <button
                    type="submit"
                    aria-label={`${todo.title ?? "할 일"} 되살리기`}
                    className="grid size-5 place-items-center rounded border border-foreground/40 bg-foreground/80 text-xs text-background"
                  >
                    ✓
                  </button>
                </form>
                <span className="flex-1 text-sm text-muted line-through">
                  {todo.title ?? "열 수 없음"}
                </span>
              </li>
            ))}
          </ul>
          <form action={clearDoneAction} className="mt-3">
            <DeleteButton
              aria-label="끝낸 일 모두 지우기"
              className={`${button} text-red-600 dark:text-red-400`}
              confirmMessage="끝낸 일을 모두 지울까요?"
            >
              끝낸 일 지우기
            </DeleteButton>
          </form>
        </details>
      ) : null}
    </Container>
  );
}
