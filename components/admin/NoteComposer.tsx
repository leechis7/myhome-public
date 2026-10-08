"use client";

import { useState } from "react";
import ImageUpload from "@/components/admin/ImageUpload";
import { addNote } from "@/app/admin/notes/actions";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 짧은 글 「새로 쓰기」.
 *
 * 블로그·비밀글처럼 저장하기 전에도 그림을 올릴 수 있다(MYH-146). 새 글은
 * 아직 번호가 없으므로 서버가 빈 초안을 만들어 번호를 돌려주고, 이 화면이
 * 그 번호를 이어받아 낼 때 새로 만들지 않고 그 글을 채운다.
 *
 * 그래서 이 조각만 클라이언트다. 나머지 목록은 서버가 그린다.
 */
export default function NoteComposer() {
  const [id, setId] = useState<number | null>(null);

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <p className="text-sm font-medium text-muted">새로 쓰기</p>

      {/* 올리기는 자체 폼이라 글 폼 바깥에 둔다.
          폼 안에 폼을 넣으면 브라우저가 안쪽 폼을 버린다. */}
      {/* 올린 그림 목록은 여기 없다. 낸 뒤에 그 줄에서 보인다 — 아직
          화면에 없는 글의 목록을 미리 그릴 자리가 마땅치 않다. 올린 직후에
          쓸 마크다운 한 줄은 올리기 상자가 바로 준다. */}
      <ImageUpload postId={id} kind="note" onCreated={setId} />

      {/* 이름을 붙여야 role=form 이 된다. 아래 줄마다 있는 고치기 폼과
          갈라 잡을 수 있어야 한다. */}
      <form
        id="note-new"
        aria-label="새로 쓰기"
        action={addNote}
        className="space-y-3"
      >
        {id === null ? null : <input type="hidden" name="id" value={id} />}
        <textarea
          name="content"
          rows={4}
          required
          placeholder="한두 문단이면 충분합니다. 마크다운을 씁니다."
          aria-label="본문"
          className={`${field} font-mono leading-relaxed`}
        />
        <input
          name="tags"
          placeholder="태그 (쉼표로 구분)"
          aria-label="태그"
          className={field}
        />

        {/* 단추는 폼 안에 둔다. 밖으로 빼야 하는 것은 폼을 품은 올리기
            상자뿐이다 — 폼 안에 폼을 넣으면 브라우저가 안쪽을 버린다. */}
        <div className="flex gap-2">
          <button type="submit" className={primary}>
            올리기
          </button>
          <button
            type="submit"
            name="audience"
            value="private"
            className={button}
            title="나만 볼 수 있게 냅니다. 방문자에게는 없는 글입니다"
          >
            나만 보기
          </button>
          <button type="submit" name="draft" value="1" className={button}>
            임시저장
          </button>
        </div>
      </form>
    </div>
  );
}
