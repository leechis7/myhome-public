"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/security/auth";
import { forgetUploadIfUnused } from "@/lib/uploads/attachments";
import { isBookStatus, parseRating } from "@/lib/books";
import { fetchCover, searchBooks, type FoundBook } from "@/lib/books/lookup";
import { isKakaoKey, kakaoKey, saveKakaoKey } from "@/lib/books/lookup-key";
import { summarizeBook } from "@/lib/books/summary";
import { siteConfig } from "@/lib/site/settings";
import { BOOK_CATEGORY, BOOK_KIND, readCode } from "@/lib/codes";
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
  const categoryCode = await readCode(formData.get("categoryCode"), BOOK_CATEGORY);
  if (categoryCode === "invalid") redirect("/admin/books?be=category");

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
  } else {
    // 책 찾기로 고른 표지(MYH-226). 받지 못하면 표지 없이 저장한다
    const found = text(formData, "coverUrl");
    const fetched = found ? await fetchCover(found).catch(() => null) : null;
    if (fetched && ALLOWED_TYPES.has(fetched.type)) {
      coverId = (await saveUpload(fetched)).id;
    }
  }

  const values = {
    title,
    author,
    kindCode,
    categoryCode,
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

/**
 * 책 찾기(MYH-226). 제목이나 ISBN 으로 후보를 돌려준다. 밖으로 나가는
 * 요청이라 관리자만 쓴다.
 */
export async function lookupBooks(
  query: string,
): Promise<{ books: FoundBook[] } | { error: string }> {
  await requireAdmin();
  const q = String(query ?? "").trim().slice(0, 100);
  if (!q) return { books: [] };
  try {
    return { books: await searchBooks(q, await kakaoKey()) };
  } catch {
    return { error: "책을 찾지 못했습니다. 잠시 뒤에 다시 해 보세요." };
  }
}

/**
 * 카카오 책 검색 키(MYH-231). 관리 › 설정 › 환경설정 에서 넣고 뺀다. 넣은 키는
 * 암호화해 두고 다시 보여 주지 않는다.
 */
export async function saveKakaoKeyAction(formData: FormData) {
  await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  if (!isKakaoKey(key)) redirect("/admin/settings?kk=invalid#book-search");
  await saveKakaoKey(key);
  revalidatePath("/admin/settings");
  revalidatePath(BACK);
  redirect("/admin/settings?kk=saved#book-search");
}

export async function clearKakaoKeyAction() {
  await requireAdmin();
  await saveKakaoKey(null);
  revalidatePath("/admin/settings");
  revalidatePath(BACK);
  redirect("/admin/settings?kk=cleared#book-search");
}

/**
 * 고른 책의 소개를 한두 줄로(MYH-233). Gemini 키가 있으면 Gemini, 없으면
 * 앞부분 줄이기. 화면은 줄인 것을 먼저 넣어 두고 이것이 오면 바꾼다.
 */
export async function summarizeBookAction(title: string, description: string, author = "") {
  await requireAdmin();
  const { geminiApiKey } = await siteConfig();
  return summarizeBook(
    String(title ?? "").slice(0, 200),
    String(description ?? "").slice(0, 4000),
    geminiApiKey,
    String(author ?? "").slice(0, 200),
  );
}
