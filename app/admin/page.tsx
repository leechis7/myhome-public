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
import { listTodos, todoEventsBetween } from "@/lib/my-space/todos";
import { rangeLabel, rangeState, seoulTime, shortDay } from "@/lib/my-space/todo-dates";
import { upcomingEvents } from "@/lib/my-space/calendar";
import { todayInSeoul } from "@/lib/profile/resume-sections";
import { bookStats, dailyViews, etcStats, postStats, recentMemos, talkStats } from "@/lib/my-space/dashboard";
import BookBar from "@/components/admin/dashboard/BookBar";
import ViewsChart from "@/components/admin/dashboard/ViewsChart";
import { siteConfig } from "@/lib/site/settings";
import SpeakButton from "@/components/admin/SpeakButton";
import { briefingText, spokenTime } from "@/lib/my-space/briefing";

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
 * 로그인 뒤에는 대시보드: 새 메시지 · 할 일 · 오늘과 내일 일정 ·
 * 임시저장 글, 그리고 아침 브리핑만큼(MYH-255) 메모 · 글 · 소통 · 책 · 기타. 고치는 곳은 칸마다 링크로 간다. 프로필은 /admin/profile 로 옮겼다.
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
  const grafana = Boolean((await siteConfig()).monitoringDashboard);
  const db = getDb();
  const from = new Date(`${today}T00:00:00+09:00`);
  const to = new Date(from.getTime() + EVENT_DAYS * 24 * 60 * 60 * 1000);

  const tomorrow = new Date(to.getTime() - 1).toISOString().slice(0, 10);
  const [[unread], latest, drafts, todos, calendar, todoAgenda, memoList, postsN, talk, bookN, etc, views] = await Promise.all([
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
    secret ? todoEventsBetween(today, tomorrow).catch(() => []) : Promise.resolve([]),
    // 아침 브리핑만큼(MYH-255). 칸마다 실패해도 나머지는 뜬다
    secret ? recentMemos(3).catch(() => null) : Promise.resolve(null),
    postStats(today).catch(() => null),
    talkStats().catch(() => null),
    bookStats().catch(() => null),
    etcStats(today).catch(() => null),
    dailyViews(today, 14).catch(() => null),
  ]);

  // 일정에 날짜 있는 할 일도 섞는다(MYH-254). 캘린더가 없어도 할 일이 있으면 보인다
  const agenda =
    calendar && (calendar.calendars > 0 || todoAgenda.length > 0)
      ? {
          ...calendar,
          events: [...calendar.events, ...todoAgenda].sort((a, b) => a.start.getTime() - b.start.getTime()),
        }
      : null;

  // 할 일: 넘긴 것 · 오늘 것 · 진행 중인 것, 그리고 이레 안에 올 것(예정).
  // 날이 없는 것은 수만 적는다
  const week = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const openTodos = (todos?.open ?? []).map((t) => ({ ...t, state: rangeState(t, today, seoulTime()) }));
  const dueTodos = openTodos
    .filter(
      (t) =>
        t.state === "late" ||
        t.state === "today" ||
        t.state === "ongoing" ||
        ((t.startOn ?? t.dueOn) !== null && (t.startOn ?? t.dueOn)! <= week),
    );
  const weekCount = dueTodos.length;
  const shownTodos = dueTodos.slice(0, ROWS);
  const undated = openTodos.filter((t) => !t.startOn && !t.dueOn).length;
  const lateCount = openTodos.filter((t) => t.state === "late").length;

  // 「🔊 오늘 듣기」(MYH-272): 위에서 모은 것으로 짧은 글을 만든다(AI 없이)
  const dayLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(from);
  const briefing = briefingText({
    dayLabel,
    late: openTodos.filter((t) => t.state === "late").map((t) => t.title ?? "열 수 없음"),
    today: openTodos
      .filter((t) => t.state === "today" || t.state === "ongoing")
      .map((t) => `${t.startTime ? `${spokenTime(new Date(`${today}T${t.startTime}:00+09:00`))} ` : ""}${t.title ?? "열 수 없음"}`),
    events: (calendar?.events ?? [])
      .filter((e) => e.start < new Date(from.getTime() + 24 * 60 * 60 * 1000))
      .map((e) => (e.allDay ? e.title : `${spokenTime(e.start)} ${e.title}`)),
    unread: unread?.n ?? 0,
  });

  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        {/* 같은 숫자를 시간에 따라(MYH-256). Grafana 를 붙인 설치에서만 */}
        {grafana ? (
          <Link
            href="/admin/monitoring?d=personal"
            className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5"
          >
            Grafana 로 보기 →
          </Link>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">{today} · 챙길 것만 모았습니다.</p>
        {secret ? <SpeakButton text={briefing} label="🔊 오늘 듣기" /> : null}
      </div>

      {/* 맨 위 큰 숫자. 누르면 그 화면 */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {secret ? (
          <Tile label="이번 주 할 일" value={weekCount} href="/admin/todos">
            {lateCount > 0 ? (
              <span className="font-medium text-red-600 dark:text-red-400">⚠ 넘김 {lateCount}</span>
            ) : (
              "넘긴 것 없음"
            )}
          </Tile>
        ) : null}
        <Tile label="새 메시지" value={Number(unread?.n ?? 0)} href="/admin/messages">
          {talk ? `댓글 최근 7일 ${talk.comments7}` : null}
        </Tile>
        {postsN ? (
          <Tile label="7일 조회" value={postsN.post.views7 + postsN.note.views7} href="/admin/posts">
            블로그 {postsN.post.views7} · 짧은 글 {postsN.note.views7}
          </Tile>
        ) : null}
        {bookN ? (
          <Tile label="읽는 책" value={bookN.reading} href="/admin/books">
            전체 {bookN.total}권
          </Tile>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {secret ? (
          <Card title="할 일" href="/admin/todos" count={weekCount}>
            {shownTodos.length === 0 ? (
              <Empty>
                이번 주에 챙길 할 일이 없습니다.
                {undated > 0 ? ` 날짜 없는 할 일 ${undated}건.` : ""}
              </Empty>
            ) : (
              <>
              <ul className="space-y-1 text-sm">
                {shownTodos.map((t) => (
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
                      {t.state === "late" ? "넘김 · " : t.state === "today" ? "오늘 · " : t.state === "ongoing" ? "" : "예정 · "}
                      {rangeLabel(t)}
                    </span>
                  </li>
                ))}
              </ul>
              {undated > 0 ? <p className="mt-2 text-xs text-muted">날짜 없는 할 일 {undated}건</p> : null}
              </>
            )}
          </Card>
        ) : null}

        {secret && agenda ? (
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
                        ? (e.startDay ?? today) <= today
                          ? "오늘 종일"
                          : "내일 종일"
                        : e.start.toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </span>
                    <span
                      className={`truncate ${
                        "todo" in e
                          ? `text-emerald-800 dark:text-emerald-300 ${e.todo.done ? "line-through opacity-50" : ""}`
                          : ""
                      }`}
                    >
                      {"todo" in e ? (e.todo.done ? "☑ " : "☐ ") : ""}
                      {e.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {secret && memoList ? (
          <Card title="메모" href="/admin/memos" count={memoList.length}>
            {memoList.length === 0 ? (
              <Empty>메모가 없습니다.</Empty>
            ) : (
              <ul className="space-y-1 text-sm">
                {memoList.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3">
                    <span className="truncate">{m.content ?? "열 수 없음"}</span>
                    <time className="shrink-0 text-xs text-muted tabular-nums">
                      {shortDay(todayInSeoul(m.createdAt))}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

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

        {postsN ? (
          <Card title="글 · 조회" href="/admin/posts" wide>
            {views ? <ViewsChart days={views} /> : null}
            <dl className="mt-3 space-y-1 text-sm">
              {(
                [
                  ["블로그", postsN.post, "/admin/posts"],
                  ["짧은 글", postsN.note, "/admin/notes"],
                ] as const
              ).map(([label, n, href]) => (
                <Line key={label} label={label} href={href}>
                  공개 {n.public}
                  {n.draft > 0 ? ` · 임시저장 ${n.draft}` : ""}
                  {n.scheduled > 0 ? ` · 예약 ${n.scheduled}` : ""}
                </Line>
              ))}
            </dl>
          </Card>
        ) : null}

        {bookN ? (
          <Card title="책" href="/admin/books" count={bookN.total}>
            <BookBar
              parts={[
                { key: "reading", label: "읽는 중", n: bookN.reading },
                { key: "read", label: "완독", n: bookN.read },
                { key: "want", label: "읽고 싶음", n: bookN.want },
                { key: "stopped", label: "중단", n: bookN.stopped },
              ]}
            />
            {bookN.readingTitles.length > 0 ? (
              <ul className="mt-3 space-y-0.5 text-sm text-muted">
                {bookN.readingTitles.map((title) => (
                  <li key={title} className="truncate">
                    📖 {title}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}

        {talk ? (
          <Card title="소통" href="/guestbook">
            <dl className="space-y-1 text-sm">
              <Line label="댓글">
                전체 {talk.comments} · 최근 7일 {talk.comments7}
              </Line>
              <Line label="방명록" href="/guestbook">
                전체 {talk.guestbook} · 최근 7일 {talk.guestbook7}
              </Line>
            </dl>
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

        {etc ? (
          <Card title="기타" href="/admin/projects">
            <dl className="space-y-1 text-sm">
              <Line label="프로젝트" href="/admin/projects">
                진행 중 {etc.projects}
              </Line>
              {secret ? (
                <>
                  <Line label="어제 일기" href={`/admin/diary/${etc.yesterday}`}>
                    {etc.yesterdayDiary ? "썼음" : <span className="text-amber-700 dark:text-amber-400">아직 안 씀</span>}
                  </Line>
                  <Line label="비밀글" href="/admin/secrets">
                    {etc.secrets}건
                  </Line>
                </>
              ) : null}
            </dl>
          </Card>
        ) : null}
      </div>
    </Container>
  );
}

/** 대시보드의 칸 하나. 제목을 누르면 그 화면으로 간다 */
function Card({
  title,
  href,
  count,
  wide = false,
  children,
}: {
  title: string;
  href: string;
  count?: number;
  /** 두 칸을 차지한다(차트) */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className={`min-w-0 rounded-xl border border-border p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <h2 className="mb-3 flex items-baseline justify-between gap-2">
        <Link href={href} className="font-semibold underline-offset-4 hover:underline">
          {title}
        </Link>
        {count === undefined ? null : <span className="text-sm text-muted tabular-nums">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

/** 칸 안의 한 줄: 이름(누르면 그 화면) · 숫자들 */
function Line({ label, href, children }: { label: string; href?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-muted">
        {href ? (
          <Link href={href} className="underline-offset-4 hover:underline">
            {label}
          </Link>
        ) : (
          label
        )}
      </dt>
      <dd className="min-w-0 tabular-nums">{children}</dd>
    </div>
  );
}

/** 맨 위의 큰 숫자 하나. 아래 작은 글은 곁들이는 말 */
function Tile({
  label,
  value,
  href,
  children,
}: {
  label: string;
  value: number;
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border p-3 transition-colors hover:bg-foreground/[0.03]"
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("ko-KR")}</p>
      {children ? <p className="mt-0.5 truncate text-xs text-muted">{children}</p> : null}
    </Link>
  );
}
