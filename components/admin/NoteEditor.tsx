import Link from "next/link";
import AttachmentEditor, {
  type AttachmentRow,
} from "@/components/admin/AttachmentEditor";
import DeleteButton from "@/components/admin/DeleteButton";
import DraftKeeper from "@/components/admin/DraftKeeper";
import MarkdownField from "@/components/admin/markdown/MarkdownField";
import ImageList, { type ImageRow } from "@/components/admin/ImageList";
import ImageUpload from "@/components/admin/ImageUpload";
import NoteComposer from "@/components/admin/NoteComposer";
import { noteTitle } from "@/lib/posts/notes";
import { deleteNote, updateNote } from "@/app/admin/notes/actions";
import {
  deletePostImage,
  rotatePostImageAction,
  uploadImage,
} from "@/app/admin/posts/actions";
import { needsBadge, postState } from "@/lib/posts/state";
import { formatDate } from "@/lib/posts";
import type { Post } from "@/lib/db";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";

/**
 * 짧은 글 편집. 제목·주소 칸이 없다 — 본문 첫 줄이 제목이 되고 주소는 쓴
 * 시각으로 만든다. 블로그 글처럼 요약·버전·목차를 쓸 일도 없다.
 */
export default function NoteEditor({
  rows,
  attachments = {},
  images = {},
}: {
  rows: Post[];
  /** 글 번호 → 붙은 파일들 */
  attachments?: Record<number, AttachmentRow[]>;
  /** 글 번호 → 본문에 넣은 그림들 */
  images?: Record<number, ImageRow[]>;
}) {
  return (
    <div className="mt-8 space-y-4">
      {/* 쓰는 동안 그림을 올릴 수 있어야 해서 이 칸만 클라이언트다 */}
      <NoteComposer />

      <ul className="space-y-3">
        {rows.map((note) => (
          // id 는 글 화면의 "고치기" 가 이 자리로 데려오는 데 쓴다
          <li
            key={note.id}
            id={`note-${note.id}`}
            className="scroll-mt-24 rounded-xl border border-border p-4"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {note.published ? (
                <Link
                  href={`/notes/${note.id}`}
                  className="text-sm text-muted transition-colors hover:text-foreground"
                >
                  {formatDate(note.publishedAt)} ↗
                </Link>
              ) : null}
              {/* 공개가 아닌 것만 딱지를 붙인다 — 임시저장 / 나만 보기 */}
              {needsBadge(note) ? (
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                  {postState(note)}
                </span>
              ) : null}
              <span className="font-mono text-xs text-faint">/notes/{note.id}</span>
            </div>

            <form
              id={`note-form-${note.id}`}
              action={updateNote}
              className="mt-3 space-y-3"
            >
              <input type="hidden" name="id" value={note.id} />
              {/* 쓰던 것을 이 브라우저에 보관한다(MYH-193) */}
              <DraftKeeper
                kind="note"
                id={note.id}
                formId={`note-form-${note.id}`}
                saved={{
                  content: note.content,
                  tags: note.tags.join(", "),
                }}
              />
              <MarkdownField
                id={`note-content-${note.id}`}
                name="content"
                rows={4}
                defaultValue={note.content}
                required
                showLabel={false}
                textareaClassName={`${field} font-mono leading-relaxed`}
                // 붙여넣거나 끌어놓은 그림(MYH-192). 이미 있는 글이라 번호가 있다
                imageUpload={{
                  action: uploadImage,
                  idField: "postId",
                  id: note.id,
                  fields: { kind: "note" },
                }}
              />
              <input
                name="tags"
                defaultValue={note.tags.join(", ")}
                placeholder="태그 (쉼표로 구분)"
                aria-label="태그"
                className={field}
              />
            </form>

            {/* 그림은 접어 둔다. 한 화면에 줄이 여럿이라 다 펴 두면
                어느 줄 것인지 눈으로 좇기 어렵다(MYH-146).
                안쪽 목록은 펴 둔다 — 여기서 이미 한 번 접혔다. */}
            <details className="mt-3 rounded-xl border border-border px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium">
                이미지
                {(images[note.id]?.length ?? 0) > 0
                  ? ` (${images[note.id]!.length})`
                  : null}
              </summary>
              <div className="mt-3 space-y-3">
                <ImageUpload postId={note.id} kind="note" />
                <ImageList
                  rows={images[note.id] ?? []}
                  deleteAction={deletePostImage}
                  rotateAction={rotatePostImageAction}
                  bodyForm={`note-form-${note.id}`}
                  defaultOpen
                />
              </div>
            </details>

            {/* 첨부는 저장 단추 위에 둔다. 폼 안에 폼을 넣을 수 없어 이 칸도
                단추 줄도 폼 밖에 있고, 단추는 form 속성으로 그 폼을 낸다. */}
            <div className="mt-3">
              <AttachmentEditor
                postId={note.id}
                rows={attachments[note.id] ?? []}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                form={`note-form-${note.id}`}
                className={button}
              >
                저장
              </button>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  form={`note-form-${note.id}`}
                  name="visibility"
                  value={note.published ? "down" : "up"}
                  className={button}
                >
                  {note.published ? "글 내리기" : "글 올리기"}
                </button>
                <button
                  type="submit"
                  form={`note-form-${note.id}`}
                  name="audience"
                  value={note.private ? "public" : "private"}
                  className={button}
                >
                  {note.private ? "공개로" : "나만 보기로"}
                </button>
                {/* 지우기는 폼 내용을 안 본다. formNoValidate 가 없으면 본문이
                    빈 초안을 지울 길이 없다(MYH-145 와 같은 이유). */}
                <DeleteButton
                  form={`note-form-${note.id}`}
                  formAction={deleteNote}
                  formNoValidate
                  className={`${button} text-red-600 dark:text-red-400`}
                  confirmMessage={`짧은 글 "${noteTitle(note.content)}" 을 지울까요? 되돌릴 수 없습니다.`}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
