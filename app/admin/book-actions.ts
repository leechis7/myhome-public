"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { forgetUploadIfUnused } from "@/lib/attachments";
import { isBookStatus, parseRating } from "@/lib/books";
import { BOOK_KIND, readCode } from "@/lib/codes";
import { books, getDb } from "@/lib/db";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, saveUpload } from "@/lib/uploads";

/**
 * 읽는 책을 더하고 고치고 지운다(MYH-190). 관리 › 글 › 책(/admin/books).
 * 고친 뒤에는 공개 화면(/books)과 소개를 다시 그린다.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const BACK = "/admin/books";

function text(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value === "" ? null : value;
}

function day(formData: FormData, name: string) {
  const value = text(formData, name);
  return value && DATE.test(value) ? value : null;
}

function refresh() {
  revalidatePath("/about");
  revalidatePath("/admin/books");
  revalidatePath("/books");
}

export async function saveBook(formData: FormData) {
  await requireAdmin();

  const title = text(formData, "title");
  const author = text(formData, "author");
  if (!title || !author) redirect("/admin/books?be=required");

  const kindCode = await readCode(formData.get("kindCode"), BOOK_KIND);
  if (kindCode === "invalid") redirect("/admin/books?be=kind");

  const status = formData.get("status");
  const url = text(formData, "url");
  if (url && !/^https?:\/\//.test(url)) redirect("/admin/books?be=url");

  // 표지. 새로 올렸으면 그것으로, 「표지 빼기」 면 비운다
  const file = formData.get("cover");
  let coverId: string | null | undefined;
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_UPLOAD_BYTES) {
      redirect("/admin/books?be=cover");
    }
    coverId = (await saveUpload(file)).id;
  } else if (formData.get("removeCover") !== null) {
    coverId = null;
  }

  const values = {
    title,
    author,
    kindCode,
    status: isBookStatus(status) ? status : "reading",
    note: text(formData, "note"),
    url,
    startedOn: day(formData, "startedOn"),
    finishedOn: day(formData, "finishedOn"),
    ...(coverId !== undefined ? { coverId } : {}),
  };

  const db = getDb();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    const [before] = await db
      .select({ coverId: books.coverId })
      .from(books)
      .where(eq(books.id, id))
      .limit(1);
    await db
      .update(books)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(books.id, id));
    // 표지를 갈았으면 옛 그림은 아무 데서도 안 쓰면 지운다
    if (before?.coverId && coverId !== undefined && before.coverId !== coverId) {
      await forgetUploadIfUnused(before.coverId);
    }
  } else {
    await db.insert(books).values(values);
  }

  refresh();
  redirect(BACK);
}

export async function deleteBook(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const [gone] = await getDb()
    .delete(books)
    .where(eq(books.id, id))
    .returning({ coverId: books.coverId });
  if (gone?.coverId) await forgetUploadIfUnused(gone.coverId);
  refresh();
}

/**
 * 독서 노트와 별점(MYH-211). 책마다 따로 쓰는 화면(/admin/books/번호)에서
 * 저장한다. 노트를 비우면 상세 화면 · 목록의 「독서 노트 읽기」 가 사라진다.
 */
export async function saveReadingNote(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) redirect(BACK);

  const readingNote = String(formData.get("readingNote") ?? "").trim() || null;
  const rating = parseRating(formData.get("rating"));
  const db = getDb();
  const [before] = await db
    .select({ readingNote: books.readingNote })
    .from(books)
    .where(eq(books.id, id))
    .limit(1);
  if (!before) redirect(BACK);

  await db
    .update(books)
    .set({
      readingNote,
      rating,
      // 노트 글이 바뀐 때만 고친 날을 옮긴다. 별점만 바꾼 것은 넣지 않는다
      ...(before.readingNote !== readingNote
        ? { noteUpdatedAt: readingNote ? new Date() : null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(books.id, id));

  refresh();
  revalidatePath(`/books/${id}`);
  redirect(`/admin/books/${id}?ok=1`);
}
