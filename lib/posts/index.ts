import {
  and,
  arrayContains,
  asc,
  desc,
  eq,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { codes, getDb, posts, postViewsDaily } from "@/lib/db";
import { SERIES } from "@/lib/codes/groups";

export const listColumns = {
  id: posts.id,
  title: posts.title,
  summary: posts.summary,
  tags: posts.tags,
  published: posts.published,
  private: posts.private,
  publishedAt: posts.publishedAt,
  // 사이트맵의 lastmod 가 이것을 쓴다. 고친 글을 검색엔진이 다시 읽어 가게
  // 하려면 발행일이 아니라 수정일이어야 한다.
  updatedAt: posts.updatedAt,
  version: posts.version,
  revisedAt: posts.revisedAt,
  viewCount: posts.viewCount,
};

/**
 * 목록에서 줄을 세우는 기준. 개정한 글은 개정일로 선다.
 *
 * 발행일을 그대로 두고 따로 두는 이유: 처음 낸 날은 기록으로 남아야 하고,
 * 고쳐 쓴 글은 다시 읽을 만하니 위로 올라와야 한다. 둘은 다른 이야기다.
 */
const sortedAt = sql`coalesce(${posts.revisedAt}, ${posts.publishedAt})`;

/**
 * 발행 시각이 지났는가(MYH-194). 예약 발행은 발행 시각을 앞날로 적어 두는
 * 것뿐이라, 「공개된 글」 은 published 에 이것까지 맞아야 한다. 따로 도는
 * 작업 없이 그 시각이 지나면 보인다 - 공개 화면은 요청마다 DB 를 본다.
 *
 * 시각은 DB 의 now() 로 잰다. 앱 서버 시계와 어긋나도 한곳에서만 정한다.
 */
export const isDue = sql`${posts.publishedAt} <= now()`;

/** 방문자에게 지금 보이는 글인가. 관리자는 예약 글도 미리 본다 */
function visibleTo(admin: boolean) {
  return admin ? [] : [eq(posts.private, false), isDue];
}

/**
 * 그 기준을 어떤 시각과 견준다.
 *
 * lte(sortedAt, date) 로는 안 된다. 원시 SQL 조각 옆에 Date 를 그대로 넘기면
 * 드라이버가 형을 몰라 ERR_INVALID_ARG_TYPE 로 터진다(글 화면이 500 이었다).
 * ISO 문자열로 넘기고 SQL 에서 형을 붙인다.
 */
function sortedAtIs(op: "<=" | ">=", at: Date) {
  const stamp = at.toISOString();
  return op === "<="
    ? sql`${sortedAt} <= ${stamp}::timestamptz`
    : sql`${sortedAt} >= ${stamp}::timestamptz`;
}

/**
 * 공개된 글 목록. 최신순.
 * tag를 주면 그 태그가 붙은 글만, q를 주면 제목·요약·본문에서 찾는다.
 */
export const POSTS_PER_PAGE = 10;

/**
 * 한 테이블에 블로그 글과 짧은 글이 같이 있다. 화면마다 한 종류만 본다.
 *
 *   post  블로그 글 (/blog)
 *   note  짧은 글 (/notes)
 */
export type PostKind = "post" | "note";

/**
 * 나만 보는 글을 함께 볼지.
 *
 * 화면마다 `await isAdmin()` 을 넘긴다. 기본값은 false 다 — 넘기는 것을
 * 빼먹었을 때 남의 눈에 보이는 쪽으로 새는 것보다, 내 눈에 안 보이는 쪽으로
 * 어긋나는 편이 안전하다.
 */
function publishedConditions({
  tag,
  q,
  kind = "post",
  admin = false,
}: {
  tag?: string;
  q?: string;
  kind?: PostKind;
  admin?: boolean;
}) {
  // 관리자가 아니면 나만 보는 글 · 예약 글은 없는 것처럼 다룬다
  const conditions = [
    eq(posts.published, true),
    eq(posts.kind, kind),
    ...visibleTo(admin),
  ];

  if (tag) {
    conditions.push(arrayContains(posts.tags, [tag]));
  }

  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    const match = or(
      sql`${posts.title} ilike ${pattern}`,
      sql`coalesce(${posts.summary}, '') ilike ${pattern}`,
      sql`${posts.content} ilike ${pattern}`,
    );
    if (match) conditions.push(match);
  }

  return and(...conditions);
}

/**
 * 공개된 글 목록. 최신순.
 * tag를 주면 그 태그가 붙은 글만, q를 주면 제목·요약·본문에서 찾는다.
 * page는 1부터 센다.
 */
export async function listPublishedPosts({
  tag,
  q,
  page = 1,
  kind = "post",
  admin = false,
}: {
  tag?: string;
  q?: string;
  page?: number;
  kind?: PostKind;
  admin?: boolean;
} = {}) {
  const where = publishedConditions({ tag, q, kind, admin });
  const db = getDb();

  const [rows, [counted]] = await Promise.all([
    db
      .select(listColumns)
      .from(posts)
      .where(where)
      .orderBy(desc(sortedAt))
      .limit(POSTS_PER_PAGE)
      .offset((page - 1) * POSTS_PER_PAGE),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(where),
  ]);

  const total = counted?.count ?? 0;
  return {
    rows,
    total,
    page,
    lastPage: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)),
  };
}

/**
 * 짧은 글 목록. 제목이 없어 목록에서 본문을 그대로 펼치므로 본문까지 준다.
 */
export async function listPublishedNotes({
  tag,
  page = 1,
  admin = false,
}: { tag?: string; page?: number; admin?: boolean } = {}) {
  const where = publishedConditions({ tag, kind: "note", admin });
  const db = getDb();

  const [rows, [counted]] = await Promise.all([
    db
      .select({ ...listColumns, content: posts.content })
      .from(posts)
      .where(where)
      .orderBy(desc(sortedAt))
      .limit(POSTS_PER_PAGE)
      .offset((page - 1) * POSTS_PER_PAGE),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(where),
  ]);

  const total = counted?.count ?? 0;
  return {
    rows,
    total,
    page,
    lastPage: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)),
  };
}

/**
 * 홈에서 쓰는 최근 글. 몇 개를 보여줄지는 화면에서 고른다.
 * 쪽 넘김이 없으므로 전체 개수도 세지 않는다.
 */
export async function listRecentPosts(
  limit: number,
  kind: PostKind = "post",
  admin = false,
) {
  return getDb()
    .select(listColumns)
    .from(posts)
    .where(publishedConditions({ kind, admin }))
    .orderBy(desc(sortedAt))
    .limit(limit);
}

/**
 * 홈에 얹을 짧은 글. 제목이 없어 본문까지 가져와야 한다 —
 * listColumns 에는 본문이 없다(목록마다 본문을 다 실어 보내지 않으려고).
 */
export async function listRecentNotes(limit: number, admin = false) {
  return getDb()
    .select({ ...listColumns, content: posts.content })
    .from(posts)
    .where(publishedConditions({ kind: "note", admin }))
    .orderBy(desc(sortedAt))
    .limit(limit);
}

/**
 * 사이트맵·RSS 처럼 전부 필요한 곳에서 쓴다.
 * kind 를 주면 그 종류만, 안 주면 블로그 글과 짧은 글을 다 준다.
 *
 * 나만 보는 글 · 예약 글은 여기서 언제나 빠진다. 검색엔진에 알려질 자리가
 * 없어야 한다.
 */
export async function listAllPublishedPosts(kind?: PostKind) {
  const where = kind
    ? publishedConditions({ kind })
    : and(eq(posts.published, true), ...visibleTo(false));
  return getDb()
    .select({ ...listColumns, kind: posts.kind })
    .from(posts)
    .where(where)
    .orderBy(desc(sortedAt));
}

/**
 * 글 앞뒤로 이어지는 글.
 *
 * 자기 자신을 id 로 빼는 것이 중요하다. JS의 Date 는 밀리초까지만 담는데
 * PostgreSQL 은 마이크로초까지 저장하므로, 시각만으로 비교하면 잘려나간
 * 자릿수 때문에 자기 글이 "더 최신"으로 잡힌다.
 */
export async function findAdjacentPosts(
  postId: number,
  at: Date,
  kind: PostKind = "post",
  admin = false,
) {
  // 관리자에게는 나만 보는 글도 이어 준다. 목록에는 함께 보이는데 앞뒤
  // 이어가기에서만 빠지면, 중간 글인데도 한쪽만 나와 어긋나 보인다.
  const visible = visibleTo(admin);
  const db = getDb();
  const [previous, next] = await Promise.all([
    db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(
        and(
          eq(posts.published, true),
          ...visible,
          eq(posts.kind, kind),
          ne(posts.id, postId),
          sortedAtIs("<=", at),
        ),
      )
      .orderBy(desc(sortedAt))
      .limit(1),
    db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(
        and(
          eq(posts.published, true),
          ...visible,
          eq(posts.kind, kind),
          ne(posts.id, postId),
          sortedAtIs(">=", at),
        ),
      )
      .orderBy(asc(sortedAt))
      .limit(1),
  ]);
  return { previous: previous.at(0), next: next.at(0) };
}

/** 목록에서 이 글이 서는 자리. 개정했으면 개정일, 아니면 발행일 */
/**
 * 번호만 있는 빈 글을 만든다.
 *
 * 새 글을 쓰다 그림을 올리면 아직 매달 자리가 없다. 그래서 자리를 먼저
 * 만들고 번호를 돌려준다 — 화면이 그 번호를 이어받아, 저장할 때 새로
 * 만들지 않고 이 글을 고친다. 비밀글이 먼저 쓰던 길이다(MYH-145).
 *
 * 임시저장이라 공개 화면에는 나오지 않는다. 그림만 올리고 떠나면 제목
 * 없는 임시저장 글이 관리 목록에 하나 남는다.
 */
export async function createDraftPost(kind: PostKind = "post") {
  const [row] = await getDb()
    .insert(posts)
    .values({ kind, title: "", content: "", published: false })
    .returning({ id: posts.id });
  return row.id;
}

export function listedAt(post: {
  publishedAt: Date | null;
  revisedAt: Date | null;
}) {
  return post.revisedAt ?? post.publishedAt;
}

/**
 * 공개된 글에 붙은 태그와 글 수. 많이 쓰인 순서.
 * 관리자에게는 나만 보는 글도 세어 준다 — 목록에 그 글이 보이는데 태그 수가
 * 하나 적으면 어긋나 보인다.
 */
export async function listTags(kind: PostKind = "post", admin = false) {
  const rows = await getDb().execute<{ tag: string; count: number }>(sql`
    select unnest(tags) as tag, count(*)::int as count
      from posts
     where published = true and kind = ${kind}
       and (${admin} or (private = false and published_at <= now()))
     group by tag
     order by count desc, tag
  `);
  return [...rows] as { tag: string; count: number }[];
}

/**
 * 공개된 글 한 편. 관리자면 나만 보는 글도 열린다.
 * 아니면 없는 것으로 답한다 — 화면은 404 를 낸다.
 *
 * 번호로 찾는다. 주소가 번호이기 때문이다 — 제목을 고쳐도 주소가 변하지
 * 않게 하려고 슬러그를 버렸다(MYH-142).
 */
export async function findPublishedPost(
  id: number,
  kind: PostKind = "post",
  admin = false,
) {
  if (!Number.isInteger(id)) return undefined;
  const rows = await getDb()
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.id, id),
        eq(posts.published, true),
        eq(posts.kind, kind),
        ...visibleTo(admin),
      ),
    )
    .limit(1);
  return rows.at(0);
}

/** 2026-09-05 형식 */
export function formatDate(value: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(value);
}

/**
 * 낸 뒤에 고친 글인가.
 *
 * "같은 날 고친 것은 안 보여준다" 로 해 두었더니, 0시에 낸 글을 15시에 고쳐도
 * 표시가 안 나왔다(2026-09-09). 날이 아니라 간격으로 본다 — 30분이 넘으면
 * 고친 것으로 본다. 그 안쪽은 낸 직후 오타를 고치는 일이라 밝히지 않는다.
 */
const EDIT_GRACE_MINUTES = 30;

export function wasEditedLater(publishedAt: Date | null, updatedAt: Date) {
  if (!publishedAt) return false;
  const gap = updatedAt.getTime() - publishedAt.getTime();
  return gap >= EDIT_GRACE_MINUTES * 60 * 1000;
}

/** 낸 날과 같은 날이면 시각만 적는다 — 같은 날짜를 두 번 쓰면 눈에 걸린다 */
function stamp(publishedAt: Date | null, at: Date) {
  const sameDay = publishedAt && formatDate(publishedAt) === formatDate(at);
  if (!sameDay) return formatDate(at);
  return new Intl.DateTimeFormat("ko-KR", {
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(at);
}

/**
 * 발행일 옆에 덧붙일 것. 둘을 구분한다.
 *
 *   개정   문서 버전을 올린 글. 목록에서도 이 날짜로 위에 선다
 *   고침   버전은 그대로 두고 손만 본 글. 자리는 그대로고 고쳤다는 것만 밝힌다
 *
 * 아무것도 없으면 null 이다.
 */
export function revisionInfo(post: {
  publishedAt: Date | null;
  revisedAt: Date | null;
  updatedAt: Date;
  version?: string | null;
}) {
  if (post.revisedAt) {
    return {
      kind: "개정" as const,
      at: post.revisedAt,
      label: `개정 ${stamp(post.publishedAt, post.revisedAt)}`,
    };
  }
  if (wasEditedLater(post.publishedAt, post.updatedAt)) {
    return {
      kind: "고침" as const,
      at: post.updatedAt,
      label: `고침 ${stamp(post.publishedAt, post.updatedAt)}`,
    };
  }
  return null;
}

/**
 * 조회수를 1 올린다. 같은 방문자가 새로고침할 때마다 오르지 않도록
 * 화면에서 쿠키로 한 번만 호출한다.
 */
export async function increaseViewCount(postId: number) {
  const db = getDb();
  const [hit] = await db
    .update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, postId))
    .returning({ id: posts.id });
  if (!hit) return;
  // 그날 줄도 올린다(MYH-189). 날짜는 한국 날짜다
  await db
    .insert(postViewsDaily)
    .values({ postId, day: sql`(now() at time zone 'Asia/Seoul')::date`, views: 1 })
    .onConflictDoUpdate({
      target: [postViewsDaily.postId, postViewsDaily.day],
      set: { views: sql`${postViewsDaily.views} + 1` },
    });
}

/** 많이 읽은 글을 세는 기간(일) */
export const POPULAR_DAYS = 90;
/** 첫 화면에 보이는 많이 읽은 글 수 */
export const POPULAR_LIMIT = 5;

/**
 * 많이 읽은 글(MYH-189). 최근 POPULAR_DAYS 일 조회 합계 순, 같으면 최근 글이
 * 먼저. 방문자에게 보이는 블로그 글만 센다.
 *
 * 날마다 세기 시작한 것이 이 기능부터라, 그 기간에 읽힌 글이 하나도 없으면
 * (배포 직후) 누적 조회수로 대신한다. 어느 쪽인지 basis 로 알린다.
 */
export async function listPopularPosts(limit = POPULAR_LIMIT) {
  const db = getDb();
  const recent = sql<number>`sum(${postViewsDaily.views})::int`;
  const windowed = await db
    .select({ id: posts.id, title: posts.title, views: recent })
    .from(postViewsDaily)
    .innerJoin(posts, eq(posts.id, postViewsDaily.postId))
    .where(
      and(
        eq(posts.kind, "post"),
        eq(posts.published, true),
        ...visibleTo(false),
        sql`${postViewsDaily.day} > (now() at time zone 'Asia/Seoul')::date - ${POPULAR_DAYS}::int`,
      ),
    )
    .groupBy(posts.id, posts.title, posts.publishedAt)
    .orderBy(desc(recent), desc(posts.publishedAt))
    .limit(limit);
  if (windowed.length > 0) return { basis: "recent" as const, rows: windowed };

  const total = await db
    .select({ id: posts.id, title: posts.title, views: posts.viewCount })
    .from(posts)
    .where(
      and(
        eq(posts.kind, "post"),
        eq(posts.published, true),
        ...visibleTo(false),
        sql`${posts.viewCount} > 0`,
      ),
    )
    .orderBy(desc(posts.viewCount), desc(posts.publishedAt))
    .limit(limit);
  return { basis: "total" as const, rows: total };
}

/**
 * 본문에서 읽는 데 걸리는 시간을 어림한다.
 * 한글은 분당 500자, 영어 단어는 분당 200개로 잡는다.
 */
export function readingMinutes(content: string) {
  const korean = (content.match(/[\u3131-\uD79D]/g) ?? []).length;
  const words = (content.match(/[A-Za-z0-9]+/g) ?? []).length;
  const minutes = korean / 500 + words / 200;
  return Math.max(1, Math.round(minutes));
}

/**
 * ILIKE 패턴에서 특수한 뜻을 가지는 문자를 그대로 찾도록 escape 한다.
 * %는 아무 문자열, _는 아무 한 글자를 뜻하므로 그냥 넣으면 엉뚱한 결과가 나온다.
 */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * 연재 한 편이 들어 있는 연재(MYH-187). 이름과 편들을 발행일 순으로 준다.
 *
 * 방문자에게는 지금 공개된 편만 센다 - 「(2/3)」 의 3 에 아직 안 낸 편이
 * 들어가면 안 된다. 관리자에게는 나만 보기 · 예약 편까지 보인다(임시저장은
 * 빠진다 - 아직 쓰는 중이다).
 */
export async function findSeries(code: string, admin = false) {
  const db = getDb();
  const [[label], episodes] = await Promise.all([
    db
      .select({ label: codes.label })
      .from(codes)
      .where(and(eq(codes.groupCode, SERIES), eq(codes.code, code)))
      .limit(1),
    db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(
        and(
          eq(posts.kind, "post"),
          eq(posts.published, true),
          eq(posts.seriesCode, code),
          ...visibleTo(admin),
        ),
      )
      .orderBy(asc(posts.publishedAt), asc(posts.id)),
  ]);
  if (!label) return null;
  return { name: label.label, episodes };
}

/** 연재 안에서 이 글의 자리. 없으면(그 연재에 안 보이는 글) null */
export function seriesPosition(
  episodes: { id: number; title: string }[],
  postId: number,
) {
  const at = episodes.findIndex((e) => e.id === postId);
  if (at < 0) return null;
  return {
    number: at + 1,
    total: episodes.length,
    previous: episodes[at - 1],
    next: episodes[at + 1],
  };
}

/** 관련 글을 이만큼 보인다 */
export const RELATED_LIMIT = 3;

/**
 * 관련 글(MYH-188). 같은 태그를 많이 가진 공개 글을, 겹친 태그 수 → 최근 순으로.
 * 태그가 하나도 겹치지 않으면 넣지 않는다 - 아무 글이나 채우지 않는다.
 *
 * 같은 연재의 편은 뺀다. 바로 위 연재 상자에 이미 있다. 방문자에게 보이는 글만
 * 고른다(관리자에게도) - 관련 글은 남에게 권하는 자리라 숨은 글을 섞지 않는다.
 */
export async function findRelatedPosts(post: {
  id: number;
  tags: string[];
  seriesCode: string | null;
}) {
  if (post.tags.length === 0) return [];
  // 글자마다 따로 넘긴다(자리표시자). 배열 글자를 손으로 엮지 않는다
  const tags = sql`array[${sql.join(
    post.tags.map((t) => sql`${t}`),
    sql`, `,
  )}]::text[]`;
  const shared = sql<string[]>`array(select unnest(${posts.tags}) intersect select unnest(${tags}))`;
  return getDb()
    .select({
      id: posts.id,
      title: posts.title,
      publishedAt: posts.publishedAt,
      shared,
    })
    .from(posts)
    .where(
      and(
        eq(posts.kind, "post"),
        eq(posts.published, true),
        ne(posts.id, post.id),
        ...visibleTo(false),
        sql`${posts.tags} && ${tags}`,
        ...(post.seriesCode
          ? [
              or(
                sql`${posts.seriesCode} is null`,
                ne(posts.seriesCode, post.seriesCode),
              )!,
            ]
          : []),
      ),
    )
    .orderBy(sql`cardinality(${shared}) desc`, desc(posts.publishedAt))
    .limit(RELATED_LIMIT);
}
