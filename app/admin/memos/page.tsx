import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/Container";
import DeleteButton from "@/components/admin/DeleteButton";
import {
  addMemoAction,
  deleteMemoAction,
  moveMemoAction,
  saveMemoAction,
} from "@/app/admin/memos/actions";
import { isAdmin } from "@/lib/security/auth";
import { formatDateTime } from "@/lib/format";
import { listMemos } from "@/lib/my-space/memos";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { currentWebhook, inboxReady, webhookUrl } from "@/lib/telegram/bot";

export const metadata: Metadata = {
  title: "메모",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 빠른 메모(MYH-215). 텔레그램 봇에게 「메모 …」 로 보낸 글과 여기서 쓴 한 줄이 쌓인다.
 * 「일기로 옮기기」 는 메모를 쓴 날의 일기 끝에 붙인다.
 */
export default async function MemosPage({
  searchParams,
}: PageProps<"/admin/memos">) {
  if (!(await isAdmin())) redirect("/admin");
  if (!hasSecretKey()) notFound();

  const params = await searchParams;
  const moved = typeof params.moved === "string" ? params.moved : null;
  const ready = await inboxReady();
  const [rows, hook] = await Promise.all([
    listMemos(),
    ready ? currentWebhook() : Promise.resolve(null),
  ]);
  const connected = hook?.url === webhookUrl();

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">메모</h1>
      <p className="mt-3 text-sm text-muted">
        떠오른 것을 한 줄씩 쌓아 둡니다. 텔레그램 봇에게 「메모 …」 · 「… 메모해줘」 로 보낸 글도 여기로 옵니다.
      </p>

      {moved ? (
        <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
          <Link href={`/admin/diary/${moved}`} className="underline underline-offset-4">
            {moved} 일기
          </Link>
          에 붙였습니다.
        </p>
      ) : null}

      <form action={addMemoAction} aria-label="메모 쓰기" className="mt-6 space-y-2">
        <textarea
          name="content"
          required
          rows={3}
          aria-label="새 메모"
          placeholder="떠오른 것 한 줄"
          className={field}
        />
        <button type="submit" className={primary}>
          메모하기
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-muted">아직 메모가 없습니다.</p>
      ) : (
        <ul className="mt-10 space-y-3" aria-label="메모 목록">
          {rows.map((memo) => (
            <li key={memo.id} className="rounded-xl border border-border p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {memo.content ?? "열 수 없음"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <time dateTime={memo.createdAt.toISOString()}>
                  {formatDateTime(memo.createdAt)}
                </time>
                {memo.source === "telegram" ? (
                  <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-sky-700 dark:text-sky-400">
                    텔레그램
                  </span>
                ) : null}
                {memo.movedAt ? (
                  <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5">
                    일기로 옮김
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!memo.movedAt && memo.content !== null ? (
                  <form action={moveMemoAction}>
                    <input type="hidden" name="id" value={memo.id} />
                    <button type="submit" className={button}>
                      일기로 옮기기
                    </button>
                  </form>
                ) : null}
                {memo.content !== null ? (
                  <details className="group">
                    <summary className={`${button} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                      고치기
                    </summary>
                    <form action={saveMemoAction} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={memo.id} />
                      <textarea
                        name="content"
                        required
                        rows={3}
                        defaultValue={memo.content}
                        aria-label="메모 고치기"
                        className={field}
                      />
                      <button type="submit" className={primary}>
                        저장
                      </button>
                    </form>
                  </details>
                ) : null}
                <form action={deleteMemoAction}>
                  <input type="hidden" name="id" value={memo.id} />
                  <DeleteButton
                    aria-label="메모 삭제"
                    className={`${button} text-red-600 dark:text-red-400`}
                    confirmMessage="이 메모를 지울까요?"
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-12 border-t border-border pt-6 text-sm text-muted">
        텔레그램 봇에게 「메모 …」 로 보낸 글도 여기로 옵니다.{" "}
        {ready ? (connected ? "● 연결됨 · " : "○ 연결 안 됨 · ") : null}
        <Link href="/admin/settings#telegram" className="underline underline-offset-4">
          연결 설정
        </Link>
      </p>
    </Container>
  );
}
