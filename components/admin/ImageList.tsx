"use client";

import { useState } from "react";
import DeleteButton from "@/components/admin/DeleteButton";
import {
  describeUsage,
  stripImage,
  type ImageUsage,
} from "@/lib/image-usage";
import { fillField } from "./fill-field";
import { formatBytes } from "@/lib/upload-limits";

export type ImageRow = {
  id: number;
  /** 받아 볼 수 있는 주소. 비밀글은 관리자만 지나는 길이다 */
  url: string;
  /** 열쇠가 바뀌어 이름을 복호화하지 못한 비밀글 그림은 null 이다 */
  filename: string | null;
  size: number;
  /** 본문에 붙여 넣을 한 줄 */
  markdown: string;
  /** 본문 어디에 쓰는가. 비밀글 본문을 못 풀었으면 null(= 모른다) */
  usage: ImageUsage | null;
  /** 본문에서 이 그림을 찾는 글자. 블로그는 해시, 비밀글은 주소 */
  needle: string;
};

/**
 * 이 글에 올린 그림들.
 *
 * 전에는 올린 **그 순간**에만 마크다운 한 줄을 보여 줬다. 화면을 떠나면
 * 그 줄이 사라져서, 같은 그림을 한 번 더 넣으려면 주소를 알 길이 없어
 * 다시 올려야 했다(MYH-145).
 *
 * **마크다운 글자는 내놓지 않는다.** 32자 해시가 든 주소를 눈으로 읽을
 * 일은 없고, 줄마다 그것이 깔리면 좁은 화면에서 이름조차 안 보인다.
 * 보여 주는 것은 파일 이름이고, 마크다운은 「복사」 가 준다.
 *
 * 줄마다 **본문 어디에 쓰는지** 적는다(MYH-148). 지우기 전에 알아야 하는
 * 것이다 — 안 쓰는 것은 마음 놓고 지우고, 쓰는 것은 보고 나서 정한다.
 *
 * 지우면 이 글 본문에서도 그 그림을 뺀다(MYH-197). 저장된 본문은 서버가,
 * 열린 본문 칸은 여기서(bodyForm).
 *
 * 지우는 것은 **이 글에 매단 줄**이다. 파일까지 지울지는 서버가 가린다 —
 * 블로그 그림은 이름이 내용 해시라 다른 글도 같은 파일을 가리킬 수 있어,
 * 아무 데서도 안 볼 때만 디스크에서 사라진다.
 *
 * 돌리기는 블로그 쪽에서 **주소가 바뀌는 일**이다(MYH-151). 본문도 함께
 * 고쳐지므로 화면에서는 그냥 단추 하나다.
 *
 * 블로그 글·짧은 글·비밀글이 같이 쓴다. 다른 것은 주소와 손대는 길뿐이다.
 *
 * **미리보기는 원본을 작게 그린 것이다**(MYH-147). 줄임판을 따로 만들어
 * 두지 않았다 — 올릴 때 이미 1600px webp 로 줄이고, 한 글에 그림이 열 장을
 * 넘길 일이 없어서 값을 치를 만한 자리가 아니다. 대신 `loading="lazy"` 로
 * 화면에 들어올 때 받는다. 그림이 수십 장 붙는 글이 생기면 그때 다시 본다.
 */
export default function ImageList({
  rows,
  deleteAction,
  rotateAction,
  defaultOpen = false,
  bodyForm,
}: {
  rows: ImageRow[];
  /** 없으면 지우기 단추를 내지 않는다 */
  deleteAction?: (formData: FormData) => void | Promise<void>;
  /** 없으면 돌리기 단추를 내지 않는다 */
  rotateAction?: (formData: FormData) => void | Promise<void>;
  /** 이미 한 번 접힌 자리에 놓일 때만 켠다(짧은 글의 「이미지」 안) */
  defaultOpen?: boolean;
  /**
   * 본문 칸이 든 폼의 id. 지우면 서버가 저장된 본문에서 그 그림을 빼는데
   * (MYH-197), 열려 있는 본문 칸에서도 뺀다 - 안 그러면 그 칸을 저장할 때
   * 지운 그림 줄이 되살아난다.
   */
  bodyForm?: string;
}) {
  const [copied, setCopied] = useState<number | null>(null);

  if (rows.length === 0) return null;

  function stripFromBody(row: ImageRow) {
    const form = bodyForm ? document.getElementById(bodyForm) : null;
    const field =
      form instanceof HTMLFormElement ? form.elements.namedItem("content") : null;
    if (!(field instanceof HTMLTextAreaElement)) return;
    const next = stripImage(field.value, row.needle);
    if (next !== field.value) fillField(field, next);
  }

  async function copy(row: ImageRow) {
    try {
      await navigator.clipboard.writeText(row.markdown);
      setCopied(row.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // 클립보드가 막힌 환경에서는 글자를 직접 골라 복사하면 된다
    }
  }

  return (
    <section className="rounded-xl border border-border p-4">
      {/* 접어 둔다. 글 하나에 그림이 여럿이면 목록이 화면을 다 차지해
          정작 본문이 밀려난다. 갯수는 접힌 채로도 보인다. */}
      <details open={defaultOpen}>
        <summary className="cursor-pointer text-sm font-medium">
          올린 이미지 ({rows.length})
        </summary>
        <ul className="mt-3 space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3">
              {/* 미리보기와 이름을 한 링크로 묶는다. 어느 쪽을 눌러도 원본이
                새 창에 열린다 — 마크다운 주소를 눈으로 읽을 일은 없고,
                눌러 보면 무엇인지 안다. */}
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="group flex min-w-0 flex-1 basis-60 items-center gap-3"
              >
                {/* next/image 를 쓰지 않는다. 관리 화면에서만 보는 것이고,
                  비밀글 주소는 로그인해야 열리는 길이라 최적화기가 못 읽는다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-14 shrink-0 rounded-lg border border-border bg-foreground/[0.03] object-cover transition-opacity group-hover:opacity-80"
                />
                <span className="min-w-0 truncate text-sm group-hover:underline">
                  {row.filename ?? "이름을 열 수 없음"}
                </span>
              </a>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {/* 세로로 찍은 사진은 올릴 때 EXIF 를 읽어 세워 준다
                    (MYH-150). 이 단추는 그것으로 안 되는 것들 — 방향 표시가
                    없거나 틀린 사진, 그리고 그 고침 전에 이미 누운 채로
                    올라간 사진들을 위한 것이다. */}
                {rotateAction ? (
                  <form
                    action={rotateAction}
                    className="flex items-center gap-1"
                  >
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      name="turn"
                      value="left"
                      aria-label={`${row.filename ?? "그림"} 왼쪽으로 돌리기`}
                      title="왼쪽으로 90도"
                      className="rounded-lg border border-border px-2 py-1.5 text-xs transition-colors hover:bg-foreground/5"
                    >
                      ↺
                    </button>
                    <button
                      type="submit"
                      name="turn"
                      value="right"
                      aria-label={`${row.filename ?? "그림"} 오른쪽으로 돌리기`}
                      title="오른쪽으로 90도"
                      className="rounded-lg border border-border px-2 py-1.5 text-xs transition-colors hover:bg-foreground/5"
                    >
                      ↻
                    </button>
                  </form>
                ) : null}
                <button
                  type="button"
                  onClick={() => copy(row)}
                  title="본문에 붙여 넣을 마크다운을 복사합니다"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-foreground/5"
                >
                  {copied === row.id ? "복사됨" : "복사"}
                </button>
                {deleteAction ? (
                  <form
                    action={deleteAction}
                    onSubmit={() => stripFromBody(row)}
                  >
                    <input type="hidden" name="id" value={row.id} />
                    <DeleteButton
                      aria-label={`${row.filename ?? "그림"} 삭제`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-faint transition-colors hover:text-red-600 dark:hover:text-red-400"
                      confirmMessage={확인말(row)}
                    >
                      삭제
                    </DeleteButton>
                  </form>
                ) : null}
              </div>

              {/* 크기와 쓰임은 링크 밖이다. 안에 두면 눌렀을 때 그림이 열려
                버리고, 링크 이름이 "e2e.png 70B 본문에 없음" 이 된다. */}
              <p className="w-full text-xs text-faint">
                {formatBytes(row.size)}
                <span aria-hidden> · </span>
                <span className={쓰임색(row.usage)}>{쓰임(row.usage)}</span>
                {/* 그림이 한 줄을 통째로 차지하면 그 줄 글자가 곧 마크다운
                  이다. 글 안에 섞여 들어간 것만 보여 준다. */}
                {row.usage?.excerpt && row.usage.excerpt !== row.markdown ? (
                  <span className="mt-0.5 block truncate font-mono">
                    {row.usage.excerpt}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

/** 본문에 쓰는가. 모를 때(비밀글을 못 풀었을 때)는 모른다고 적는다 */
function 쓰임(usage: ImageUsage | null) {
  return usage === null ? "본문을 열 수 없어 모름" : describeUsage(usage);
}

function 쓰임색(usage: ImageUsage | null) {
  if (usage === null) return "text-amber-700 dark:text-amber-400";
  return usage.count === 0 ? "" : "text-foreground/60";
}

/**
 * 지우기 전에 묻는 말.
 *
 * 쓰고 있으면 어디에 쓰는지와 **본문에서도 빠진다는 것**을 적는다. 안 쓰면
 * 짧게 묻는다 — 매번 같은 경고를 보면 읽지 않게 된다.
 */
function 확인말(row: ImageRow) {
  const 이름 = row.filename ?? "이 그림";
  if (row.usage === null) {
    return `"${이름}" 을 지울까요? 본문을 열 수 없어 쓰고 있는지 확인하지 못했습니다.`;
  }
  if (row.usage.count === 0) {
    return `"${이름}" 을 지울까요? 본문에서는 쓰고 있지 않습니다.`;
  }
  return `"${이름}" 은 ${describeUsage(row.usage)} 에서 쓰고 있습니다. 지우면 본문에서도 뺍니다. 지울까요?`;
}
