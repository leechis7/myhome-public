import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import Container from "@/components/Container";
import LoginForm from "@/components/admin/LoginForm";
import SetupForm from "@/components/admin/SetupForm";
import { isAdmin, needsSetup } from "@/lib/security/auth";
import { hasPasskey } from "@/lib/security/passkeys";
import { getDb, messages, posts } from "@/lib/db";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { listTodos } from "@/lib/my-space/todos";
import { rangeLabel, rangeState } from "@/lib/my-space/todo-dates";
import { upcomingEvents } from "@/lib/my-space/calendar";
import { todayInSeoul } from "@/lib/profile/resume-sections";

export const metadata: Metadata = {
  title: "관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const loginErrors: Record<string, string> = {
  bad: "비밀번호가 맞지 않습니다.",
  rate: "시도가 너무 많습니다. 10분 후에 다시 해주세요.",
};

/** 오늘부터 며칠 치 일정을 보이나 */
const EVENT_DAYS = 2;
/** 칸마다 몇 줄까지 */
const ROWS = 5;

/**
 * 관리 첫 화면(MYH-234). 로그인 전에는 로그인(빈 DB 면 처음 비밀번호 정하기),
 * 로그인 뒤에는 대시보드: 새 메시지 · 오늘 할 일 · 오늘과 내일 일정 ·
 * 임시저장 글. 고치는 곳은 칸마다 링크로 간다. 프로필은 /admin/profile 로 옮겼다.
 */
export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  if (!(await isAdmin())) {
    // 빈 DB 로 처음 띄워 비밀번호가 아직 없다(MYH-172)
    if (await needsSetup()) {
      return (
        <Container>
          <SetupForm />
        </Container>
      );
    }
    const params = await searchParams;
    const code = typeof params.e === "string" ? params.e : undefined;
    return (
      <Container>
        <LoginForm
          error={code ? loginErrors[code] : undefined}
          passkeyReady={await hasPasskey()}
        />
      </Container>
    );
  }

  const today = todayInSeoul();
  const secret = hasSecretKey();
  const db = getDb();
  const from = new Date(`${today}T00:00:00+09:00`);
  const to = new Date(from.getTime() + EVENT_DAYS * 24 * 60 * 60 * 1000);

  const [[unread], latest, drafts, todos, agenda] = await Promise.all([
    db.select({ n: count() }).from(messages).where(isNull(messages.readAt)),
    db
      .select({ id: messages.id, name: messages.name, createdAt: messages.createdAt })
      .from(messages)
      .where(isNull(messages.readAt))
      .orderBy(desc(messages.createdAt))
      .limit(ROWS),
    db
      .select({ id: posts.id, kind: posts.kind, title: posts.title, updatedAt: posts.updatedAt })
      .from(posts)
      .where(and(isNull(posts.publishedAt), eq(posts.kind, "post")))
      .orderBy(desc(posts.updatedAt))
      .limit(ROWS),
    secret ? listTodos().catch(() => null) : Promise.resolve(null),
    secret ? upcomingEvents(from, to).catch(() => null) : Promise.resolve(null),
  ]);

  // 할 일은 넘긴 것 · 오늘 것 · 진행 중인 것만. 날이 없는 것은 「할 일」 화면에서
  const dueTodos = (todos?.open ?? [])
    .map((t) => ({ ...t, state: rangeState(t, today) }))
    .filter((t) => t.state === "late" || t.state === "today" || t.state === "ongoing")
    .slice(0, ROWS);

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
      <p className="mt-3 text-sm text-muted">{today} · 챙길 것만 모았습니다.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card title="새 메시지" href="/admin/messages" count={Number(unread?.n ?? 0)}>
          {latest.length === 0 ? (
            <Empty>새 메시지가 없습니다.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {latest.map((m) => (
                <li key={m.id} className="flex justify-between gap-3">
                  <span className="truncate">{m.name}</span>
                  <time className="shrink-0 text-xs text-muted tabular-nums">
                    {m.createdAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {secret ? (
          <Card title="할 일" href="/admin/todos" count={dueTodos.length}>
            {dueTodos.length === 0 ? (
              <Empty>오늘 챙길 할 일이 없습니다.</Empty>
            ) : (
              <ul className="space-y-1 text-sm">
                {dueTodos.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <span className="truncate">{t.title ?? "열 수 없음"}</span>
                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        t.state === "late"
                          ? "font-medium text-red-600 dark:text-red-400"
                          : t.state === "today"
                            ? "font-medium text-amber-700 dark:text-amber-400"
                            : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {t.state === "late" ? "넘김 · " : t.state === "today" ? "오늘 · " : ""}
                      {rangeLabel(t)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {secret && agenda && agenda.calendars > 0 ? (
          <Card title="오늘 · 내일 일정" href="/admin/calendar" count={agenda.events.length}>
            {agenda.events.length === 0 ? (
              <Empty>
                일정이 없습니다.
                {agenda.failed > 0 ? ` (캘린더 ${agenda.failed}개를 읽지 못했습니다)` : ""}
              </Empty>
            ) : (
              <ul className="space-y-1 text-sm">
                {agenda.events.slice(0, ROWS).map((e) => (
                  <li key={`${e.key}-${e.start.toISOString()}`} className="flex gap-3">
                    <span className="w-20 shrink-0 text-xs text-muted tabular-nums">
                      {e.allDay
                        ? e.startDay === today
                          ? "오늘 종일"
                          : "내일 종일"
                        : e.start.toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </span>
                    <span className="truncate">{e.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        <Card title="임시저장 글" href="/admin/posts" count={drafts.length}>
          {drafts.length === 0 ? (
            <Empty>임시저장한 글이 없습니다.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {drafts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/posts/${p.id}`}
                    className="block truncate underline-offset-4 hover:underline"
                  >
                    {p.title || "제목 없음"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Container>
  );
}

/** 대시보드의 칸 하나. 제목을 누르면 그 화면으로 간다 */
function Card({
  title,
  href,
  count,
  children,
}: {
  title: string;
  href: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="rounded-xl border border-border p-4">
      <h2 className="mb-3 flex items-baseline justify-between gap-2">
        <Link href={href} className="font-semibold underline-offset-4 hover:underline">
          {title}
        </Link>
        <span className="text-sm text-muted tabular-nums">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
