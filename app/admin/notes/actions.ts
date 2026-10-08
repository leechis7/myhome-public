"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, posts } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { removePost } from "@/lib/attachments";
import { noteTitle } from "@/lib/notes";

/**
 * 짧은 글은 제목과 주소를 사람이 정하지 않는다. 본문 첫 줄이 제목이 되고
 * 주소는 쓴 시각으로 만든다. 그래서 폼에 그 칸이 없다.
 */
function parseForm(formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return { content, tags };
}

function refresh(id?: number) {
  revalidatePath("/notes");
  revalidatePath("/admin/notes");
  revalidatePath("/sitemap.xml");
  revalidatePath("/rss.xml");
  if (id) revalidatePath(`/notes/${id}`);
}

/**
 * 새 짧은 글을 낸다.
 *
 * 쓰는 도중에 그림을 올렸으면 그때 빈 초안이 이미 만들어져 번호가 붙어
 * 있다(MYH-146). 그러면 새로 만들지 않고 그 글을 채운다 — 안 그러면
 * 그림이 딸린 빈 글이 따로 남는다.
 */
export async function addNote(formData: FormData) {
  await requireAdmin();

  const { content, tags } = parseForm(formData);
  if (!content) redirect("/admin/notes?e=required");

  // 셋 중 하나: 올리기 / 나만 보기 / 임시저장
  const onlyMe = formData.get("audience") === "private";
  const publish = formData.get("draft") === null || onlyMe;
  const now = new Date();
  const db = getDb();

  const values = {
    kind: "note",
    title: noteTitle(content),
    content,
    tags,
    published: publish,
    private: onlyMe,
    publishedAt: publish ? now : null,
  };

  const given = Number(formData.get("id"));
  if (Number.isInteger(given) && given > 0) {
    await db
      .update(posts)
      .set({ ...values, updatedAt: now })
      .where(eq(posts.id, given));
    refresh(given);
  } else {
    await db.insert(posts).values(values);
    refresh();
  }
  redirect("/admin/notes?ok=1");
}

export async function updateNote(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const { content, tags } = parseForm(formData);
  if (!content) redirect("/admin/notes?e=required");

  const db = getDb();
  const [before] = await db
    .select({
      published: posts.published,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  // 올리고 내리는 것은 블로그와 같은 방식이다. 발행일은 지우지 않는다.
  const visibility = String(formData.get("visibility") ?? "");
  const show = visibility === "up";
  const hide = visibility === "down";

  // 나만 보기로 돌리거나 되돌린다. 낸 적 없는 것을 나만 보기로 하면 함께
  // 낸다 — 안 그러면 내 눈에도 공개 화면에 나타나지 않는다.
  const audience = String(formData.get("audience") ?? "");
  const toPrivate = audience === "private";
  const toPublic = audience === "public";

  await db
    .update(posts)
    .set({
      content,
      tags,
      title: noteTitle(content),
      ...(show || toPrivate
        ? {
            published: true,
            // 임시저장으로 시작한 글은 발행일이 없다. 처음 낼 때 찍어 준다 —
            // 없으면 목록에서 날짜 자리가 비어 보인다.
            publishedAt: before?.publishedAt ?? new Date(),
          }
        : {}),
      ...(hide ? { published: false } : {}),
      ...(toPrivate ? { private: true } : {}),
      ...(toPublic ? { private: false } : {}),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  refresh(id);
  redirect("/admin/notes?ok=1");
}

export async function deleteNote(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await removePost(id);
  refresh(id);
  redirect("/admin/notes?ok=1");
}
