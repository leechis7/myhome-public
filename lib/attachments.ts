import { createHash } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { attachments, books, getDb, posts, uploads } from "@/lib/db";
import {
  readStoredFile,
  removeStoredFile,
  writeFileOnce,
} from "@/lib/storage";
import { findImageUsage, stripImage } from "@/lib/image-usage";
import { noteTitle } from "@/lib/notes";
import { extensionFor, rotateBytes } from "@/lib/uploads";
import { attachmentMimeType } from "@/lib/upload-limits";

export {
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isImageType,
} from "./upload-limits";

/**
 * 글에 붙이는 파일.
 *
 * 내용은 디스크에 두고(lib/storage.ts) DB 에는 "어느 글에 어떤 이름으로
 * 붙었는지" 만 담는다. 그림 업로드(lib/uploads.ts)와 같은 저장 자리를 쓰되,
 * 이쪽은 줄이거나 형식을 바꾸지 않는다 — 올린 파일 그대로 내려줘야 한다.
 */

/** 첨부파일인가 본문에 넣은 그림인가. 비밀글 쪽과 같은 값을 쓴다 */
export type AttachmentKind = "file" | "image";

/** 붙인다. 같은 내용이면 디스크에는 하나만 남는다 */
export async function addAttachment(
  postId: number,
  file: File,
  kind: AttachmentKind = "file",
) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadId = createHash("sha256").update(bytes).digest("hex").slice(0, 32);

  await writeFileOnce(uploadId, bytes);

  const db = getDb();
  await db
    .insert(uploads)
    .values({
      id: uploadId,
      filename: file.name,
      mimeType: attachmentMimeType(file.type),
      size: bytes.byteLength,
    })
    .onConflictDoNothing({ target: uploads.id });

  const [row] = await db
    .insert(attachments)
    .values({ postId, uploadId, filename: file.name, kind })
    .returning({ id: attachments.id });

  return { id: row.id, uploadId, size: bytes.byteLength };
}

/**
 * 글에 붙은 첨부파일. 붙인 순서대로.
 *
 * 본문에 넣은 그림은 빼고 준다 — 같은 테이블에 살지만 나오는 자리가 다르다.
 */
export async function listAttachments(postId: number) {
  return getDb()
    .select({
      id: attachments.id,
      uploadId: attachments.uploadId,
      filename: attachments.filename,
      mimeType: uploads.mimeType,
      size: uploads.size,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .innerJoin(uploads, eq(uploads.id, attachments.uploadId))
    .where(and(eq(attachments.postId, postId), eq(attachments.kind, "file")))
    .orderBy(attachments.id);
}

/**
 * 이미 올린 그림을 글에 매단다.
 *
 * 그림 자체는 lib/uploads.ts 가 먼저 디스크와 `uploads` 에 넣는다. 여기서는
 * "이 그림이 이 글 본문 것이다" 만 적는다.
 *
 * 같은 그림을 두 번 올려도 줄은 하나다 — 이름이 내용 해시라 `uploads` 에는
 * 어차피 하나뿐이고, 목록에 같은 줄이 두 번 나올 이유가 없다.
 */
export async function linkImage(
  postId: number,
  uploadId: string,
  filename: string,
) {
  const db = getDb();

  const [already] = await db
    .select({ id: attachments.id })
    .from(attachments)
    .where(
      and(
        eq(attachments.postId, postId),
        eq(attachments.uploadId, uploadId),
        eq(attachments.kind, "image"),
      ),
    )
    .limit(1);
  if (already) return already.id;

  const [row] = await db
    .insert(attachments)
    .values({ postId, uploadId, filename, kind: "image" })
    .returning({ id: attachments.id });
  return row.id;
}

/**
 * 본문에 넣은 그림. 넣은 순서대로.
 *
 * 올릴 때 받은 마크다운 한 줄을 그대로 다시 만들어 준다 — 화면을 떠나면
 * 그 줄을 다시 볼 길이 없어서, 같은 그림을 한 번 더 넣으려면 다시 올려야
 * 했다(MYH-145).
 *
 * 본문 어디에 쓰는지도 함께 본다. 지우기 전에 알아야 하는 것이라
 * 목록을 만들 때 한 번에 구한다(MYH-148).
 */
export async function listPostImages(postId: number) {
  const db = getDb();

  const [post] = await db
    .select({ content: posts.content })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  const rows = await db
    .select({
      id: attachments.id,
      uploadId: attachments.uploadId,
      filename: attachments.filename,
      mimeType: uploads.mimeType,
      size: uploads.size,
    })
    .from(attachments)
    .innerJoin(uploads, eq(uploads.id, attachments.uploadId))
    .where(and(eq(attachments.postId, postId), eq(attachments.kind, "image")))
    .orderBy(attachments.id);

  return rows.map((row) => {
    const url = `/uploads/${row.uploadId}.${extensionFor(row.mimeType)}`;
    return {
      id: row.id,
      url,
      filename: row.filename,
      size: row.size,
      markdown: `![${row.filename}](${url})`,
      // 주소가 아니라 해시로 찾는다. 확장자는 mime 에서 뽑는 것이라
      // 본문에 박힌 것과 다를 수 있는데 해시는 언제나 같다.
      usage: findImageUsage(post?.content ?? "", row.uploadId),
      needle: row.uploadId,
    };
  });
}

/**
 * 본문 그림을 90도 돌린다.
 *
 * 돌린 것은 **새 파일**이 된다. 이름이 내용을 줄인 값이라 내용이 바뀌면
 * 이름도 바뀌어야 한다 — 이름을 두고 속만 갈아 끼우면, 내려줄 때 붙이는
 * `immutable` 때문에 브라우저와 Cloudflare 가 옛 그림을 1년 들고 있다
 * (app/uploads/[id]/route.ts). 돌려도 안 돌아간 것처럼 보인다.
 *
 * 그래서 새 이름으로 두고 **본문에 적힌 주소도 함께 바꾼다.** 사람은 단추만
 * 누르고 글은 따라온다.
 *
 * 옛 파일은 아무 데서도 안 가리킬 때만 사라진다. 같은 그림을 다른 글도
 * 쓰고 있으면 그대로 남는다 — 그쪽 글이 깨지면 안 된다.
 */
export async function rotatePostImage(id: number, turn: "left" | "right") {
  const db = getDb();

  const [row] = await db
    .select({
      id: attachments.id,
      postId: attachments.postId,
      uploadId: attachments.uploadId,
      filename: attachments.filename,
      mimeType: uploads.mimeType,
    })
    .from(attachments)
    .innerJoin(uploads, eq(uploads.id, attachments.uploadId))
    .where(and(eq(attachments.id, id), eq(attachments.kind, "image")))
    .limit(1);
  if (!row) return null;

  const before = await readStoredFile(row.uploadId);
  if (!before) return null;

  const after = await rotateBytes(before, row.mimeType, turn);
  if (!after) return null;

  const newId = createHash("sha256").update(after).digest("hex").slice(0, 32);
  // 두 번 돌려 제자리로 온 그림은 이미 있던 파일과 같아진다. 그때는 할 일이 없다.
  if (newId !== row.uploadId) {
    await writeFileOnce(newId, after);
    await db
      .insert(uploads)
      .values({
        id: newId,
        filename: row.filename,
        mimeType: row.mimeType,
        size: after.byteLength,
      })
      .onConflictDoNothing({ target: uploads.id });

    await db
      .update(attachments)
      .set({ uploadId: newId })
      .where(eq(attachments.id, id));

    // 본문이 옛 주소를 가리키고 있다. 해시만 바꿔 끼운다 — 확장자는 형식을
    // 그대로 두었으므로 변하지 않는다.
    await db
      .update(posts)
      .set({ content: sql`replace(${posts.content}, ${row.uploadId}, ${newId})` })
      .where(eq(posts.id, row.postId));

    await forgetUploadIfUnused(row.uploadId);
  }

  return { postId: row.postId, uploadId: newId };
}

/** 내려줄 것 하나. 어느 글에 붙었는지도 같이 준다(볼 수 있는 사람인지 가리려고) */
export async function findAttachment(id: number) {
  const rows = await getDb()
    .select({
      id: attachments.id,
      uploadId: attachments.uploadId,
      filename: attachments.filename,
      mimeType: uploads.mimeType,
      size: uploads.size,
      postId: attachments.postId,
      published: posts.published,
      publishedAt: posts.publishedAt,
      private: posts.private,
      /** 글 쪽 종류(post/note). 첨부 자신의 kind 와 헷갈리지 않게 이름을 달리한다 */
      postKind: posts.kind,
    })
    .from(attachments)
    .innerJoin(uploads, eq(uploads.id, attachments.uploadId))
    .innerJoin(posts, eq(posts.id, attachments.postId))
    .where(eq(attachments.id, id))
    .limit(1);
  return rows.at(0);
}

/**
 * 뗀다. 디스크 파일은 **아무 데서도 안 가리킬 때만** 지운다.
 *
 * 같은 파일이 다른 글에도 붙어 있을 수 있고(이름이 내용 해시라 하나만 남는다),
 * 본문 마크다운이 `/uploads/<id>` 로 가리키고 있을 수도 있다. 하나라도 남아
 * 있으면 파일은 그대로 둔다 — 지워서 깨진 링크를 만드는 것보다 안 쓰는 파일이
 * 남는 편이 낫다.
 */
export async function removeAttachment(id: number) {
  const db = getDb();
  const [gone] = await db
    .delete(attachments)
    .where(eq(attachments.id, id))
    .returning({ uploadId: attachments.uploadId });
  if (!gone) return false;

  await forgetUploadIfUnused(gone.uploadId);
  return true;
}

/**
 * 「올린 이미지」 에서 지운다(MYH-197). 이 글 본문에서 그 그림을 먼저 빼고
 * 뗀다 - 그래야 아무 데서도 안 쓰게 되어 파일까지 지워진다. 전에는 본문에
 * 남겨 깨진 그림이 되었고, 파일도 본문이 가리킨다고 남았다.
 *
 * 빼는 것은 이 글 본문뿐이다. 같은 그림을 다른 글도 쓰면 그쪽은 그대로고
 * 파일도 남는다.
 */
export async function removePostImage(id: number) {
  const db = getDb();
  const [row] = await db
    .select({
      postId: attachments.postId,
      uploadId: attachments.uploadId,
      kind: posts.kind,
      content: posts.content,
    })
    .from(attachments)
    .innerJoin(posts, eq(posts.id, attachments.postId))
    .where(eq(attachments.id, id))
    .limit(1);
  if (!row) return false;

  const content = stripImage(row.content, row.uploadId);
  if (content !== row.content) {
    await db
      .update(posts)
      .set({
        content,
        // 짧은 글은 첫 줄이 제목이다. 첫 줄이 그림이었으면 제목도 바뀐다
        ...(row.kind === "note" ? { title: noteTitle(content) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, row.postId));
  }
  return removeAttachment(id);
}

/**
 * 글을 지운다. 붙어 있던 파일은 아무 데서도 안 쓰면 함께 지운다(MYH-197).
 *
 * 붙인 줄은 DB 가 cascade 로 따라 지우지만 파일 기록과 디스크는 따라오지
 * 않는다. 전에는 그래서 글을 지울 때마다 파일이 남았다.
 */
export async function removePost(id: number) {
  const db = getDb();
  const files = await db
    .selectDistinct({ uploadId: attachments.uploadId })
    .from(attachments)
    .where(eq(attachments.postId, id));
  const [gone] = await db
    .delete(posts)
    .where(eq(posts.id, id))
    .returning({ id: posts.id });
  for (const file of files) await forgetUploadIfUnused(file.uploadId);
  return gone?.id;
}

/**
 * 아무 글도 가리키지 않으면 기록과 파일을 지운다.
 *
 * 먼저 보는 것이 DB 의 외래키보다 앞선 문이다. 다른 글이 아직 매달고 있는데
 * `uploads` 줄을 지우려 하면 `attachments_upload_id_uploads_id_fk` 에 걸려
 * 터지기는 한다 — 다만 그때는 이미 이쪽 매단 줄이 지워진 뒤라 화면에 오류만
 * 남는다. 여기서 먼저 보고 조용히 물러나는 편이 낫다.
 */
export async function forgetUploadIfUnused(uploadId: string, exceptId?: number) {
  const db = getDb();

  const [stillAttached] = await db
    .select({ id: attachments.id })
    .from(attachments)
    .where(
      exceptId === undefined
        ? eq(attachments.uploadId, uploadId)
        : and(eq(attachments.uploadId, uploadId), ne(attachments.id, exceptId)),
    )
    .limit(1);
  if (stillAttached) return false;

  // 본문에 `/uploads/<id>` 로 박혀 있을 수 있다. 그림으로 넣은 경우다.
  const [inBody] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(sql`${posts.content} like ${"%" + uploadId + "%"}`)
    .limit(1);
  if (inBody) return false;

  // 책 표지로 쓰고 있다(MYH-190)
  const [onBook] = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.coverId, uploadId))
    .limit(1);
  if (onBook) return false;

  await db.delete(uploads).where(eq(uploads.id, uploadId));
  await removeStoredFile(uploadId);
  return true;
}
