"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import DeleteButton from "@/components/admin/DeleteButton";
import DraftKeeper from "@/components/admin/DraftKeeper";
import { draftKey } from "@/lib/draft-store";
import { FIRST_VERSION, VERSION_PATTERN } from "@/lib/post-version";
import { formatSchedule, isScheduled } from "@/lib/post-state";
import { futureSchedule, toScheduleInput } from "@/lib/post-schedule";
import {
  createPost,
  deletePost,
  deletePostImage,
  rotatePostImageAction,
  updatePost,
  uploadImage,
} from "@/app/admin/posts/actions";
import AttachmentEditor, { type AttachmentRow } from "./AttachmentEditor";
import ImageList, { type ImageRow } from "./ImageList";
import ImageUpload from "./ImageUpload";
import MarkdownField from "./markdown/MarkdownField";
import CodePicker from "./CodePicker";
import { codesHref, SERIES } from "@/lib/code-groups";
import type { Code, Post } from "@/lib/db";

const field =
  "mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40";
const label = "block text-sm font-medium";
const button =
  "rounded-lg border border-border px-4 py-2.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90";

export default function PostForm({
  post,
  attachments = [],
  images = [],
  series = [],
}: {
  post?: Post;
  attachments?: AttachmentRow[];
  images?: ImageRow[];
  /** 고를 수 있는 연재(코드 그룹 00003). 꺼 둔 것까지 */
  series?: Code[];
}) {
  const editing = post !== undefined;
  // 예약해 둔 글(MYH-194). 냈지만 아직 시각이 오지 않아 공개된 적은 없다
  const scheduled = editing && isScheduled(post);
  // 한 번이라도 공개된 글인가. 그러면 발행일이 있고, 내렸다 올릴 수 있다.
  const everPublished = editing && post.publishedAt !== null && !scheduled;
  // 발행 시각 칸. 앞날이면 「발행하기」 가 「예약 발행」 이 된다
  const savedPublishAt =
    scheduled && post.publishedAt ? toScheduleInput(post.publishedAt) : "";
  const [publishAt, setPublishAt] = useState(savedPublishAt);
  // 저장하고 같은 화면으로 돌아오면 이 폼은 그대로 남는다. 저장된 발행 시각이
  // 바뀌었으면(예약 · 취소 · 지금 발행) 칸도 따라간다. 폼을 통째로 새로 그리면
  // 그림을 지울 때도 그려져 쓰던 본문이 날아갔다(MYH-200)
  const [seenPublishAt, setSeenPublishAt] = useState(savedPublishAt);
  if (seenPublishAt !== savedPublishAt) {
    setSeenPublishAt(savedPublishAt);
    setPublishAt(savedPublishAt);
  }
  const willSchedule = futureSchedule(publishAt) !== null;
  const [title, setTitle] = useState(post?.title ?? "");
  // 새 글에서 그림을 올리면 그때 번호가 생긴다. 그 뒤의 저장은 만들기가
  // 아니라 고치기다 — 안 그러면 그림이 딸린 빈 글이 따로 남는다(MYH-145).
  const [id, setId] = useState(post?.id ?? null);
  const saving = id === null ? createPost : updatePost;

  return (
    <>
      {/* 이미지 업로드는 자체 폼이라 글 폼 바깥에 둔다.
          폼 안에 폼을 넣으면 브라우저가 안쪽 폼을 버린다. */}
      <ImageUpload postId={id} onCreated={setId} />

      {images.length > 0 ? (
        <div className="mt-6">
          <ImageList
            rows={images}
            deleteAction={deletePostImage}
            rotateAction={rotatePostImageAction}
            bodyForm="post-form"
          />
        </div>
      ) : null}

      <form id="post-form" action={saving} className="mt-6 space-y-5">
        {id === null ? null : <input type="hidden" name="id" value={id} />}
        <div>
          <label htmlFor="title" className={label}>
            제목
          </label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={field}
          />
        </div>

        <div>
          <label htmlFor="summary" className={label}>
            요약
          </label>
          <p className="mt-1 text-xs text-muted">
            목록에 보이는 한두 줄. 비워도 됩니다.
          </p>
          <input
            id="summary"
            name="summary"
            defaultValue={post?.summary ?? ""}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="tags" className={label}>
            태그
          </label>
          <p className="mt-1 text-xs text-muted">쉼표로 구분합니다.</p>
          <input
            id="tags"
            name="tags"
            defaultValue={post?.tags.join(", ") ?? ""}
            placeholder="caddy, 인프라"
            className={field}
          />
        </div>

        {/* 연재(MYH-187). 이름은 코드 화면에서 더한다 */}
        <div>
          <span className={label}>연재</span>
          <p className="mt-1 text-xs text-muted">
            같은 연재의 글끼리 글 끝에서 이어집니다. 편은 발행일 순입니다.
          </p>
          <div className="mt-2">
            <CodePicker
              codes={series}
              value={post?.seriesCode}
              name="seriesCode"
              label="연재"
              editHref={codesHref(SERIES)}
              className={`${field} mt-0 sm:w-80`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="version" className={label}>
            문서 버전
          </label>
          <p className="mt-1 text-xs text-muted">
            1.0.0 처럼 숫자 세 자리로 적습니다. 새 글은 1.0.0 으로 시작합니다.
            값을 바꿔 저장하면 개정한 것으로 보고, 목록에서 그 날짜로 위에
            섭니다. 비워 두면 개정 표시가 없어집니다.
            {editing && post.revisedAt
              ? ` 지금 개정일: ${formatDateTime(post.revisedAt)}`
              : ""}
          </p>
          <input
            id="version"
            name="version"
            defaultValue={editing ? (post.version ?? "") : FIRST_VERSION}
            placeholder="1.0.0"
            pattern={VERSION_PATTERN}
            title="1.0.0 처럼 숫자 세 자리로 적습니다"
            inputMode="decimal"
            className={field}
          />
        </div>

        {/* 쓰던 것을 이 브라우저에 보관한다(MYH-193). 되살릴 게 있을 때만
            보인다. 번호는 처음 연 글의 것으로 둔다 - 새 글에서 그림을 올려
            번호가 생겨도 보관본은 「새 글」 이다 */}
        <DraftKeeper
          kind="post"
          id={post?.id ?? null}
          formId="post-form"
          saved={{
            title: post?.title ?? "",
            content: post?.content ?? "",
            tags: post?.tags.join(", ") ?? "",
          }}
          alsoClear={editing ? [draftKey("post", null)] : []}
          onRestoreId={setId}
        />

        <MarkdownField
          id="content"
          name="content"
          defaultValue={post?.content ?? ""}
          rows={24}
          required
          textareaClassName={`${field} font-mono leading-relaxed`}
          // 붙여넣거나 끌어놓은 그림(MYH-192). 위의 올리기 칸과 같은 길이고,
          // 새 글이면 첫 그림이 만든 초안 번호를 폼이 이어받는다
          imageUpload={{
            action: uploadImage,
            idField: "postId",
            id,
            fields: { kind: "post" },
            onCreated: setId,
          }}
        />
      </form>

      {/* 첨부는 저장 단추 위에 둔다. 폼 안에 폼을 넣을 수 없어서 이 칸은
          폼 밖에 있고, 단추도 밖으로 빼 form 속성으로 그 폼을 낸다.
          글이 저장된 뒤에만 나온다 - 새 글은 번호가 없어 붙일 데가 없다. */}
      {editing ? (
        <div className="mt-6">
          <AttachmentEditor postId={post.id} rows={attachments} />
        </div>
      ) : null}

      {/* 발행 시각(MYH-194). 아직 공개된 적 없는 글에만 있다 - 낸 글의
          발행일은 기록이라 옮기지 않는다. 폼 밖에 있어 form 속성으로 낸다 */}
      {everPublished ? null : (
        <div className="mt-6 border-t border-border pt-5">
          <label htmlFor="publishAt" className={label}>
            발행 시각
          </label>
          <p className="mt-1 text-xs text-muted">
            {scheduled && post.publishedAt
              ? `${formatSchedule(post.publishedAt)} 에 공개됩니다. 시각을 바꿔 저장하면 옮겨집니다.`
              : "비우면 지금 냅니다. 앞날을 고르면 그 시각에 공개됩니다(한국 시간)."}
          </p>
          <input
            id="publishAt"
            name="publishAt"
            type="datetime-local"
            form="post-form"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            className={`${field} sm:w-64`}
          />
        </div>
      )}

      <div
        className={`flex flex-wrap items-center gap-2 ${
          everPublished ? "mt-6 border-t border-border pt-5" : "mt-4"
        }`}
      >
        {scheduled ? (
          // 예약해 둔 글. 저장은 시각까지 함께 저장한다
          <>
            <button type="submit" form="post-form" className={primary}>
              저장
            </button>
            <button
              type="submit"
              form="post-form"
              name="publish"
              value="now"
              className={button}
              title="기다리지 않고 지금 공개합니다"
            >
              지금 발행
            </button>
            <button
              type="submit"
              form="post-form"
              name="unschedule"
              value="1"
              className={button}
              title="예약을 거두고 임시저장으로 돌립니다"
            >
              예약 취소
            </button>
          </>
        ) : everPublished ? (
          // 한 번 낸 글은 공개 여부를 오른쪽 토글로 다룬다. 저장은 저장만 한다.
          <button type="submit" form="post-form" className={primary}>
            저장
          </button>
        ) : (
          <>
            <button
              type="submit"
              form="post-form"
              name="publish"
              value="1"
              className={primary}
            >
              {willSchedule ? "예약 발행" : "발행하기"}
            </button>
            {/* 다 썼지만 나만 볼 글. 임시저장과 다르다 */}
            <button
              type="submit"
              form="post-form"
              name="audience"
              value="private"
              className={button}
              title="나만 볼 수 있게 냅니다. 방문자에게는 없는 글입니다"
            >
              나만 보기
            </button>
            <button
              type="submit"
              form="post-form"
              name="draft"
              value="1"
              className={button}
            >
              임시저장
            </button>
          </>
        )}
        <Link href="/admin/posts" className={button}>
          취소
        </Link>

        {editing ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {/* 예약 글은 왼쪽의 지금 발행 · 예약 취소로 다룬다 */}
            {/* 올리고 내리는 것을 한 자리에서. 발행일은 건드리지 않는다 */}
            {everPublished ? (
              <button
                type="submit"
                form="post-form"
                name="visibility"
                value={post.published ? "down" : "up"}
                className={button}
                title={
                  post.published
                    ? "공개 목록에서 내려갑니다. 발행일은 그대로 남습니다"
                    : "다시 공개합니다. 발행일은 처음 낸 날 그대로입니다"
                }
              >
                {post.published ? "글 내리기" : "글 올리기"}
              </button>
            ) : null}
            {/* 공개와 나만 보기를 오간다. 낸 적 없는 글은 이걸 누르면
                  함께 낸다 — 그래야 내 눈에 보인다 */}
            {scheduled ? null : (
              <button
                type="submit"
                form="post-form"
                name="audience"
                value={post.private ? "public" : "private"}
                className={button}
                title={
                  post.private
                    ? "모두에게 보이게 합니다"
                    : "나만 볼 수 있게 합니다. 방문자에게는 없는 글이 됩니다"
                }
              >
                {post.private ? "공개로" : "나만 보기로"}
              </button>
            )}
            {/* 지우기는 폼 내용을 안 본다. formNoValidate 가 없으면 제목이나
                본문이 비었을 때 브라우저가 전송 자체를 막아, 그림만 올리고
                만 빈 초안을 지울 길이 없다(MYH-145). */}
            <DeleteButton
              form="post-form"
              formAction={deletePost}
              formNoValidate
              className={`${button} text-red-600 dark:text-red-400`}
              confirmMessage={`"${post.title || "제목 없음"}" 을 지울까요? 되돌릴 수 없습니다.`}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
