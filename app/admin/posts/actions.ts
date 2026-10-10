"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, posts } from "@/lib/db";
import { requireAdmin } from "@/lib/security/auth";
import { futureSchedule } from "@/lib/posts/schedule";
import { isVersion, versionChange } from "@/lib/posts/version";
import { readCode, SERIES } from "@/lib/codes";
import { createDraftPost } from "@/lib/posts";
import {
  findAttachment,
  linkImage,
  removePost,
  removePostImage,
  rotatePostImage,
} from "@/lib/uploads/attachments";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, saveUpload } from "@/lib/uploads";

export type UploadState = {
  error?: string;
  url?: string;
  markdown?: string;
  /** 줄어든 용량을 알려 준다 */
  note?: string;
  /** 새 글에서 올렸을 때 만들어진 글 번호. 화면이 이것을 이어받는다 */
  postId?: number;
};

function parseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const summaryRaw = String(formData.get("summary") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // 문서 버전. 사람이 적는 값이라 그대로 담고, 빈 칸은 null 로 둔다.
  const versionRaw = String(formData.get("version") ?? "").trim();

  return {
    title,
    content,
    summary: summaryRaw === "" ? null : summaryRaw,
    version: versionRaw === "" ? null : versionRaw,
    tags,
  };
}

function refreshBlog(id?: number) {
  revalidatePath("/blog");
  if (id) revalidatePath(`/blog/${id}`);
}

export async function createPost(formData: FormData) {
  await requireAdmin();

  const values = parseForm(formData);
  if (!values.title || !values.content) {
    redirect("/admin/posts/new?e=required");
  }
  if (values.version && !isVersion(values.version)) {
    redirect("/admin/posts/new?e=version");
  }
  const seriesCode = await readCode(formData.get("seriesCode"), SERIES);
  if (seriesCode === "invalid") redirect("/admin/posts/new?e=series");

  // 낼 때 셋 중 하나를 고른다: 발행하기 / 나만 보기 / 임시저장
  const onlyMe = formData.get("audience") === "private";
  const publish = formData.get("publish") !== null || onlyMe;
  // 발행하기에 앞날 시각을 적었으면 예약이다(MYH-194). 나만 보기는 바로 낸다
  const scheduled =
    publish && !onlyMe ? futureSchedule(String(formData.get("publishAt") ?? "")) : null;

  const created = await getDb()
    .insert(posts)
    .values({
      ...values,
      seriesCode,
      published: publish,
      private: onlyMe,
      publishedAt: publish ? (scheduled ?? new Date()) : null,
    })
    .returning({ id: posts.id });

  refreshBlog(created[0].id);
  redirect(`/admin/posts/${created[0].id}?ok=1`);
}

export async function updatePost(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const values = parseForm(formData);
  if (!values.title || !values.content) {
    redirect(`/admin/posts/${id}?e=required`);
  }
  // 화면에서도 막지만(pattern), 그것만 믿지 않는다
  if (values.version && !isVersion(values.version)) {
    redirect(`/admin/posts/${id}?e=version`);
  }
  // 연재(MYH-187). 코드 화면에 없는 값이면 막는다(외래 키보다 먼저 알아듣게)
  const seriesCode = await readCode(formData.get("seriesCode"), SERIES);
  if (seriesCode === "invalid") redirect(`/admin/posts/${id}?e=series`);

  const db = getDb();
  const [before] = await db
    .select({
      version: posts.version,
      published: posts.published,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  // 문서 버전이 바뀌었으면 개정으로 본다. 무엇을 눌렀는지가 아니라 값으로
  // 정한다 — 나중에 왜 개정일이 그날인지 글에 남은 버전으로 설명이 된다.
  const change = versionChange(before?.version ?? null, values.version);

  // 공개 여부를 어떻게 할지. 아무 표시가 없으면 그대로 둔다("저장").
  //   발행하기 / 글 올리기 → 공개. 처음 낸 글이면 그때가 발행일이 된다
  //   임시저장 / 글 내리기 → 내림. 발행일은 지우지 않는다 — 처음 낸 날은
  //                          기록으로 남아야 하고, 다시 올릴 때 그대로 쓴다
  const visibility = String(formData.get("visibility") ?? "");
  const show = formData.get("publish") !== null || visibility === "up";
  const hide = formData.get("draft") !== null || visibility === "down";

  // 나만 보기로 돌리거나 되돌리는 것은 따로 다룬다("audience").
  // 아직 낸 적 없는 글을 나만 보기로 하면 함께 낸다 — 안 그러면 내 눈에도
  // 공개 화면에 나타나지 않아 아무 일도 하지 않은 것처럼 보인다.
  const audience = String(formData.get("audience") ?? "");
  const toPrivate = audience === "private";
  const toPublic = audience === "public";

  // 예약 발행(MYH-194). 예약은 아직 공개된 적 없는 글에만 쓴다 - 이미 낸 글의
  // 발행일은 기록이라 옮기지 않는다.
  //   발행하기 + 앞날 시각     → 그 시각에 공개된다
  //   예약한 글을 저장          → 칸의 시각이 앞날이면 그리로 옮긴다
  //   지금 발행(publish=now)    → 지금 공개한다
  //   예약 취소 · 임시저장      → 낸 적 없는 글로 돌린다
  const now = new Date();
  const wasScheduled =
    before?.published === true &&
    before.publishedAt !== null &&
    before.publishedAt > now;
  const neverOut = !before?.publishedAt || wasScheduled;
  const schedule = neverOut
    ? futureSchedule(String(formData.get("publishAt") ?? ""), now)
    : null;
  const publishNow = formData.get("publish") === "now";
  // 임시저장 · 글 내리기도 예약을 거두는 것이다. 발행일을 앞날로 남겨 두면
  // 「내려둠 (발행 앞날)」 이 된다
  const unschedule =
    wasScheduled && (formData.get("unschedule") !== null || hide);
  // 처음 공개되는 시각. 예약했으면 그 시각, 옛 발행일은 그대로, 없으면 지금
  const firstOut = publishNow ? now : (schedule ?? before?.publishedAt ?? now);

  await db
    .update(posts)
    .set({
      ...values,
      seriesCode,
      ...(show || toPrivate
        ? {
            published: true,
            // 최초 발행 시각은 그대로 둔다. 없으면 지금(또는 예약한 시각)이 그날이다
            publishedAt: firstOut,
          }
        : // 예약한 글을 그냥 저장했다. 칸의 시각을 따라 옮긴다
          wasScheduled && !hide && !unschedule
          ? { publishedAt: firstOut }
          : {}),
      ...(hide ? { published: false } : {}),
      // 예약 취소는 낸 적 없는 글로 되돌린다. 발행일도 지운다 - 공개된 적이 없다
      ...(unschedule ? { published: false, publishedAt: null } : {}),
      ...(toPrivate ? { private: true } : {}),
      ...(toPublic ? { private: false } : {}),
      ...(change === "개정"
        ? { revisedAt: new Date() }
        : change === "지움"
          ? { revisedAt: null }
          : {}),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  refreshBlog(id);
  redirect(`/admin/posts/${id}?ok=1`);
}

export async function deletePost(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  refreshBlog(await removePost(id));
  redirect("/admin/posts");
}

/**
 * 본문에 넣은 그림을 목록에서 뗀다(MYH-148).
 *
 * 떼는 것은 **이 글에 매단 줄**이다. 디스크의 파일까지 지울지는
 * `removeAttachment()` 안의 `forgetUploadIfUnused()` 가 가린다 — 이름이
 * 내용 해시라 같은 파일을 다른 글도 가리킬 수 있고, 본문에 아직 박혀
 * 있을 수도 있다. 하나라도 남아 있으면 파일은 그대로 둔다.
 *
 * 본문에 쓰고 있어도 막지 않는다. 쓰는지 아닌지는 목록이 보여 주고,
 * 지울지는 사람이 정한다. 지우면 이 글 본문에서도 그 그림을 뺀다(MYH-197) -
 * 전에는 깨진 그림으로 남았다.
 */
export async function deletePostImage(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  // 어느 글 것인지는 떼기 전에 봐 둔다. 떼고 나면 물어볼 데가 없다.
  const before = await findAttachment(id);
  await removePostImage(id);

  if (before) {
    revalidatePath(
      before.postKind === "note" ? "/admin/notes" : `/admin/posts/${before.postId}`,
    );
    // 본문이 바뀌었을 수 있다
    if (before.postKind === "note") {
      revalidatePath("/notes");
      revalidatePath(`/notes/${before.postId}`);
    } else {
      refreshBlog(before.postId);
    }
  }
}

/**
 * 본문 그림을 90도 돌린다(MYH-151).
 *
 * 돌리면 주소가 바뀌므로 본문도 같이 고쳐진다 — 그 일은 rotatePostImage 가
 * 한다. 여기서는 화면만 새로 그리게 한다.
 */
export async function rotatePostImageAction(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const turn = formData.get("turn") === "left" ? "left" : "right";
  const done = await rotatePostImage(id, turn);
  if (!done) return;

  const [post] = await getDb()
    .select({ kind: posts.kind })
    .from(posts)
    .where(eq(posts.id, done.postId))
    .limit(1);

  if (post?.kind === "note") {
    revalidatePath("/admin/notes");
    revalidatePath(`/notes/${done.postId}`);
  } else {
    revalidatePath(`/admin/posts/${done.postId}`);
    revalidatePath(`/blog/${done.postId}`);
  }
}

/**
 * 본문에 넣을 이미지를 올린다. 성공하면 마크다운으로 붙여 넣을 주소를 돌려준다.
 *
 * 그림을 **글에 매단다**(MYH-145). 전에는 uploads 에 내용 해시로만 넣어서
 * 어느 글 것인지 알 길이 없었고, 그래서 올린 그림 목록을 보여줄 수 없었다.
 *
 * 새 글이면 아직 매달 자리가 없다. 비밀글처럼 빈 초안을 먼저 만들고 그
 * 번호를 화면에 돌려준다.
 */
export async function uploadImage(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "파일을 선택하세요." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "PNG, JPEG, GIF, WebP, AVIF 만 올릴 수 있습니다." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `파일이 너무 큽니다. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB까지 됩니다.`,
    };
  }

  // 칸이 아예 없으면 Number(null) 이 0 이 된다. 0 도 정수라 그대로 통과해
  // 없는 글에 매달려다 터진다. 있을 법한 번호인지까지 본다.
  const given = Number(formData.get("postId"));
  const kind = formData.get("kind") === "note" ? "note" : "post";
  const postId =
    Number.isInteger(given) && given > 0 ? given : await createDraftPost(kind);

  const { id: uploadId, url, originalSize, size } = await saveUpload(file);
  await linkImage(postId, uploadId, file.name);

  const saved =
    size < originalSize
      ? ` (${Math.round(originalSize / 1024)}KB → ${Math.round(size / 1024)}KB)`
      : "";

  revalidatePath(`/admin/posts/${postId}`);
  revalidatePath("/admin/notes");
  return { url, markdown: `![${file.name}](${url})`, note: saved, postId };
}
