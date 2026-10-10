"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb, comments, posts } from "@/lib/db";
import { clientKey, requireAdmin } from "@/lib/security/auth";
import { AUTHOR_MAX, BODY_MAX } from "@/lib/posts/comment-limits";
import { commentMessage, guestbookMessage, notifyTelegram } from "@/lib/telegram/notify";
import { isScheduled } from "@/lib/posts/state";

/** 같은 사람이 짧은 시간에 몇 개까지 쓸 수 있는지 */
const WINDOW_MINUTES = 10;
const MAX_PER_WINDOW = 5;

/**
 * 댓글을 쓴 뒤 돌아갈 곳. 블로그 글과 짧은 글이 같은 테이블에 있어서 종류로
 * 갈라야 한다. 폼이 알려 주는 값을 믿지 않고 DB 에서 본다.
 */
function backTo(kind: string, postId: number) {
  const base = kind === "note" ? "/notes" : "/blog";
  return `${base}/${postId}`;
}

/**
 * 댓글 · 방명록이 함께 지나는 문(MYH-191). 봇 함정 · 빈 칸 · 글자 수 ·
 * 도배를 본다. 걸리면 back 으로 돌려보낸다(#comments 로).
 */
async function admit(formData: FormData, back: string) {
  const db = getDb();
  // 봇 함정. 사람에게는 보이지 않는 칸이라 채워져 있으면 봇이다.
  if (String(formData.get("website") ?? "") !== "") {
    redirect(`${back}#comments`);
  }

  const author = String(formData.get("author") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!author || !body) {
    redirect(`${back}?ce=required#comments`);
  }
  if (author.length > AUTHOR_MAX || body.length > BODY_MAX) {
    redirect(`${back}?ce=length#comments`);
  }

  // clientKey 가 이미 해시를 돌려준다
  const ipHash = await clientKey();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.ipHash, ipHash), gt(comments.createdAt, since)));

  if ((recent?.count ?? 0) >= MAX_PER_WINDOW) {
    redirect(`${back}?ce=rate#comments`);
  }

  return { author, body, ipHash };
}

export async function createComment(formData: FormData) {
  const postId = Number(formData.get("postId"));

  // 어느 글인지 먼저 찾는다. 돌아갈 곳(블로그·짧은 글)이 그 종류에 달려 있다.
  const db = getDb();
  const postRows = await db
    .select({
      id: posts.id,
      kind: posts.kind,
      title: posts.title,
      published: posts.published,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  const post = postRows.at(0);
  // 공개되지 않은 글에는 댓글을 받지 않는다. 예약 글도 그 시각까지는 아니다
  if (!post || !post.published || isScheduled(post)) {
    redirect("/blog");
  }
  const back = backTo(post.kind, post.id);

  const { author, body, ipHash } = await admit(formData, back);

  await getDb().insert(comments).values({
    postId: post.id,
    author,
    body,
    ipHash,
  });

  // 댓글이 달린 것을 바로 알 수 있게 한다. 실패해도 저장은 이미 끝났다.
  await notifyTelegram(
    commentMessage({ author, body, postTitle: post.title, postId: post.id }),
  );

  revalidatePath(back);
  redirect(`${back}#comments`);
}

/** 방명록에 남긴다(MYH-191). 댓글과 같은 문을 지나고 post_id 만 비어 있다 */
export async function createGuestbookEntry(formData: FormData) {
  const back = "/guestbook";
  const { author, body, ipHash } = await admit(formData, back);

  await getDb().insert(comments).values({ postId: null, author, body, ipHash });
  await notifyTelegram(guestbookMessage({ author, body }));

  revalidatePath(back);
  redirect(`${back}#comments`);
}

export async function deleteComment(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await getDb().delete(comments).where(eq(comments.id, id));

  // 짧은 글의 댓글일 수도 있다. 두 곳을 다 다시 그린다 — 어느 쪽인지 알려고
  // 질의를 하나 더 하는 것보다 싸다. 글 번호가 없으면 방명록이다
  const raw = formData.get("postId");
  const postId = Number(raw);
  if (!raw) {
    revalidatePath("/guestbook");
  } else if (Number.isInteger(postId)) {
    revalidatePath(`/blog/${postId}`);
    revalidatePath(`/notes/${postId}`);
  }
}
