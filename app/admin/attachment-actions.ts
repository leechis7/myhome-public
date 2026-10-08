"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import {
  MAX_ATTACHMENT_BYTES,
  addAttachment,
  removeAttachment,
} from "@/lib/attachments";
import { getDb, posts } from "@/lib/db";

/**
 * 글에 파일을 붙이고 뗀다.
 *
 * 블로그 글과 짧은 글이 같은 테이블을 쓰므로 액션도 하나로 둔다. 어느 화면으로
 * 돌아갈지는 글의 종류(kind)를 보고 정한다 — 폼이 알려 주는 값을 믿지 않는다.
 */

async function refreshFor(postId: number) {
  const [post] = await getDb()
    .select({ id: posts.id, kind: posts.kind })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!post) return;

  if (post.kind === "note") {
    revalidatePath("/notes");
    revalidatePath(`/notes/${post.id}`);
    revalidatePath("/admin/notes");
  } else {
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.id}`);
    revalidatePath(`/admin/posts/${postId}`);
  }
}

export async function attachFile(formData: FormData) {
  await requireAdmin();

  const postId = Number(formData.get("postId"));
  const file = formData.get("file");
  if (!Number.isInteger(postId) || !(file instanceof File) || file.size === 0) {
    return;
  }

  // 화면에서도 막지만 그것만 믿지 않는다. 형식은 가리지 않는다 —
  // 내려줄 때 브라우저가 열지 않게 첨부로 준다(lib/upload-limits.ts).
  if (file.size > MAX_ATTACHMENT_BYTES) return;

  await addAttachment(postId, file);
  await refreshFor(postId);
}

export async function detachFile(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const postId = Number(formData.get("postId"));
  if (!Number.isInteger(id)) return;

  await removeAttachment(id);
  if (Number.isInteger(postId)) await refreshFor(postId);
}
