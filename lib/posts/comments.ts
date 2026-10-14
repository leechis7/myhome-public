import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, comments } from "@/lib/db";

export { AUTHOR_MAX, BODY_MAX } from "@/lib/posts/comment-limits";

/**
 * 글에 달린 댓글. 오래된 순. 숨긴 것(MYH-252)은 관리자에게만 - hiddenAt 으로
 * 갈라 보인다
 */
export async function listComments(postId: number, { admin = false }: { admin?: boolean } = {}) {
  return getDb()
    .select({
      id: comments.id,
      author: comments.author,
      body: comments.body,
      createdAt: comments.createdAt,
      hiddenAt: comments.hiddenAt,
      hiddenReason: comments.hiddenReason,
    })
    .from(comments)
    .where(admin ? eq(comments.postId, postId) : and(eq(comments.postId, postId), isNull(comments.hiddenAt)))
    .orderBy(asc(comments.createdAt));
}

/** 글마다 댓글 수. 숨긴 것은 세지 않는다 */
export async function countCommentsByPost() {
  const rows = await getDb()
    .select({
      postId: comments.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(isNull(comments.hiddenAt))
    .groupBy(comments.postId);

  return new Map(rows.map((r) => [r.postId, r.count]));
}

export { formatDateTime } from "@/lib/format";

/** 방명록 한 쪽에 보이는 수 */
export const GUESTBOOK_PER_PAGE = 20;

/** 방명록(MYH-191). 최신 순. page 는 1부터. 숨긴 것은 관리자에게만(MYH-252) */
export async function listGuestbook(page = 1, { admin = false }: { admin?: boolean } = {}) {
  const db = getDb();
  const where = admin ? isNull(comments.postId) : and(isNull(comments.postId), isNull(comments.hiddenAt));
  const [rows, [counted]] = await Promise.all([
    db
      .select({
        id: comments.id,
        author: comments.author,
        body: comments.body,
        createdAt: comments.createdAt,
        hiddenAt: comments.hiddenAt,
        hiddenReason: comments.hiddenReason,
      })
      .from(comments)
      .where(where)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(GUESTBOOK_PER_PAGE)
      .offset((page - 1) * GUESTBOOK_PER_PAGE),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(where),
  ]);
  const total = counted?.count ?? 0;
  return {
    rows,
    total,
    page,
    lastPage: Math.max(1, Math.ceil(total / GUESTBOOK_PER_PAGE)),
  };
}
