import { desc, sql } from "drizzle-orm";
import { getDb, memos } from "@/lib/db";
import { decryptText } from "@/lib/security/secret-crypto";

/**
 * 대시보드의 숫자들(MYH-255). 오픈클로 아침 브리핑에 담기던 것을 홈페이지에서
 * 바로 본다: 글 · 짧은 글 공개 수 · 임시저장 · 예약 · 최근 7일 조회, 댓글 · 방명록,
 * 책 상태별 수 · 읽는 책, 진행 프로젝트, 어제 일기, 비밀글 수.
 *
 * 한 칸이 실패해도 대시보드는 뜬다 - 부르는 쪽이 칸마다 catch 한다.
 */

/** "2026-10-13" 의 n 일 앞 */
function daysBefore(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

/** 글(post) · 짧은 글(note)마다: 공개 · 임시저장 · 예약 수와 최근 7일 조회 */
export async function postStats(today: string) {
  const db = getDb();
  const since = daysBefore(today, 6);
  const [counts, views] = await Promise.all([
    db.execute(sql`
      select kind,
        count(*) filter (where published and not private and (published_at is null or published_at <= now())) as public,
        count(*) filter (where not published) as draft,
        count(*) filter (where published and published_at > now()) as scheduled
      from posts where kind in ('post', 'note') group by kind`),
    db.execute(sql`
      select p.kind, coalesce(sum(v.views), 0) as views
      from post_views_daily v join posts p on p.id = v.post_id
      where v.day >= ${since} and p.kind in ('post', 'note') group by p.kind`),
  ]);
  const of = (kind: string) => {
    const c = (counts as unknown as Row[]).find((r) => r.kind === kind);
    const v = (views as unknown as Row[]).find((r) => r.kind === kind);
    return {
      public: num(c?.public),
      draft: num(c?.draft),
      scheduled: num(c?.scheduled),
      views7: num(v?.views),
    };
  };
  return { post: of("post"), note: of("note") };
}

/** 댓글(글에 단 것)과 방명록(post_id 가 빈 것): 전체 · 최근 7일 */
export async function talkStats() {
  const [row] = (await getDb().execute(sql`
    select
      count(*) filter (where post_id is not null) as comments,
      count(*) filter (where post_id is not null and created_at > now() - interval '7 days') as comments7,
      count(*) filter (where post_id is null) as guestbook,
      count(*) filter (where post_id is null and created_at > now() - interval '7 days') as guestbook7
    from comments where hidden_at is null`)) as unknown as Row[];
  return {
    comments: num(row?.comments),
    comments7: num(row?.comments7),
    guestbook: num(row?.guestbook),
    guestbook7: num(row?.guestbook7),
  };
}

/** 책 상태별 수와 읽는 책 제목(최근에 시작한 것부터 몇 권) */
export async function bookStats(limit = 3) {
  const db = getDb();
  const [counts, reading] = await Promise.all([
    db.execute(sql`select status, count(*) as n from books group by status`),
    db.execute(sql`
      select title from books where status = 'reading'
      order by started_on desc nulls last, id desc limit ${limit}`),
  ]);
  const by: Record<string, number> = Object.fromEntries(
    (counts as unknown as Row[]).map((r) => [String(r.status), num(r.n)]),
  );
  return {
    total: Object.values(by).reduce((a, b) => a + b, 0),
    reading: by.reading ?? 0,
    read: by.read ?? 0,
    want: by.want ?? 0,
    stopped: by.stopped ?? 0,
    readingTitles: (reading as unknown as Row[]).map((r) => String(r.title)),
  };
}

/** 진행 중인 프로젝트(끝난 날이 없는 것) · 어제 일기를 썼나 · 비밀글 수(일기 빼고) */
export async function etcStats(today: string) {
  const yesterday = daysBefore(today, 1);
  const [row] = (await getDb().execute(sql`
    select
      (select count(*) from projects where ended_on is null) as projects,
      (select count(*) from secrets where diary_day = ${yesterday}) as diary,
      (select count(*) from secrets where diary_day is null) as secrets`)) as unknown as Row[];
  return {
    projects: num(row?.projects),
    yesterdayDiary: num(row?.diary) > 0,
    yesterday,
    secrets: num(row?.secrets),
  };
}

/** 최근 메모 몇 개. 열 수 없는 글은 null */
export async function recentMemos(limit = 3) {
  const rows = await getDb()
    .select({ id: memos.id, content: memos.content, createdAt: memos.createdAt })
    .from(memos)
    .orderBy(desc(memos.createdAt), desc(memos.id))
    .limit(limit);
  return rows.map((row) => {
    try {
      return { ...row, content: decryptText(row.content) };
    } catch {
      return { ...row, content: null };
    }
  });
}

/** 최근 n 일(오늘 포함) 날마다 조회수 - 글 · 짧은 글. 조회가 없던 날도 0 으로 */
export async function dailyViews(today: string, days = 14) {
  const since = daysBefore(today, days - 1);
  const rows = (await getDb().execute(sql`
    select v.day::text as day, p.kind, sum(v.views) as views
    from post_views_daily v join posts p on p.id = v.post_id
    where v.day >= ${since} and p.kind in ('post', 'note')
    group by v.day, p.kind`)) as unknown as Row[];
  return Array.from({ length: days }, (_, i) => {
    const day = daysBefore(today, days - 1 - i);
    const at = (kind: string) => num(rows.find((r) => r.day === day && r.kind === kind)?.views);
    return { day, post: at("post"), note: at("note") };
  });
}
