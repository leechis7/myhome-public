"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  draftKey,
  formatDraftTime,
  isDraftKey,
  parseDraft,
  sameFields,
  type Draft,
  type DraftFields,
} from "@/lib/posts/draft-store";
import { fillField } from "./fill-field";

/**
 * 쓰는 동안 폼의 칸을 몇 초마다 이 브라우저에 보관하고, 다시 열었을 때
 * 저장된 글과 다르면 되살릴지 묻는다(MYH-193). 서버에는 가지 않는다.
 *
 * **보관본은 저장이 끝나 다시 열린 글과 같을 때 지운다.** 누르는 순간에
 * 지우지 않는다 - 저장이 실패하면(문서 버전이 틀리는 등) 서버가 되돌려
 * 보내면서 쓰던 것이 날아가는데, 그때 살릴 것이 없어진다.
 *
 * 칸 값은 폼에서 이름으로 읽는다. 본문 칸은 위지윅 탭에서 고쳐도 폼의
 * <textarea> 가 따라 바뀌니(MarkdownField), 사건을 기다리지 않고 몇 초마다
 * 들여다본다. 되살릴 때는 그 칸에 값을 넣고 input 사건을 보내, 그 칸을 쥔
 * React 상태가 따라오게 한다.
 */

const INTERVAL_MS = 3000;

// 열었을 때 보관돼 있던 것. 쓰는 동안 저장소가 바뀌어도 이것은 그대로다 -
// 되살릴지 묻는 칸이 쓰는 도중에 새로 뜨면 안 된다
const pending = new Map<string, Draft | null>();
const listeners = new Set<() => void>();

function read(key: string): Draft | null {
  try {
    return parseDraft(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  } catch {
    // 보관하지 못해도 쓰는 데는 지장이 없다
  }
}

function settle(key: string) {
  pending.set(key, null);
  for (const fn of listeners) fn();
}

/** 오래된 보관본을 버린다. 지운 글의 것이 쌓이지 않게 */
function prune() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && isDraftKey(key) && !read(key)) localStorage.removeItem(key);
    }
  } catch {
    // 못 치워도 괜찮다
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

type Field = HTMLInputElement | HTMLTextAreaElement;

function fieldOf(form: HTMLFormElement, name: string): Field | null {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
    ? el
    : null;
}

const button =
  "rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-foreground/5";

export default function DraftKeeper({
  kind,
  id,
  formId,
  saved,
  alsoClear = [],
  onRestoreId,
}: {
  kind: "post" | "note";
  /** 글 번호. 새 글이면 null */
  id: number | null;
  formId: string;
  /** 지금 저장된 값. 칸 이름 → 값. 보관하는 칸도 이것으로 정한다 */
  saved: DraftFields;
  /**
   * 이 글이 저장된 값과 같으면 함께 지울 보관본. 새 글은 저장되면 번호가 붙은
   * 화면으로 옮겨 가니, 그 화면에서 「새 글」 보관본을 치운다
   */
  alsoClear?: string[];
  /** 되살린 보관본에 초안 번호가 있으면 알린다 */
  onRestoreId?: (id: number) => void;
}) {
  const key = draftKey(kind, id);
  const draft = useSyncExternalStore(
    subscribe,
    () => {
      if (!pending.has(key)) pending.set(key, read(key));
      return pending.get(key) ?? null;
    },
    () => null,
  );
  const differs = draft !== null && !sameFields(draft.fields, saved);

  // 저장된 값은 저장하고 돌아오면 바뀐다. 보관하는 쪽은 늘 지금 것과 견준다
  const savedRef = useRef(saved);
  const alsoClearRef = useRef(alsoClear);
  const differsRef = useRef(differs);
  useEffect(() => {
    savedRef.current = saved;
    alsoClearRef.current = alsoClear;
    differsRef.current = differs;
  });

  // 열 때 한 번: 저장된 글과 같은 보관본은 조용히 지운다
  useEffect(() => {
    prune();
    for (const k of [key, ...alsoClearRef.current]) {
      const kept = read(k);
      if (kept && sameFields(kept.fields, savedRef.current)) write(k, null);
    }
    return () => {
      pending.delete(key);
    };
  }, [key]);

  // 쓰는 동안 몇 초마다, 그리고 창을 떠날 때 보관한다
  useEffect(() => {
    let last = "";
    let wrote = false;
    function keep() {
      // 되살릴지 정하기 전에는 보관본을 덮어쓰지 않는다
      if (differsRef.current) return;
      const form = document.getElementById(formId);
      if (!(form instanceof HTMLFormElement)) return;
      const fields: DraftFields = {};
      for (const name of Object.keys(savedRef.current)) {
        const el = fieldOf(form, name);
        if (el) fields[name] = el.value;
      }
      const given = Number(fieldOf(form, "id")?.value);
      const draftId =
        id === null && Number.isInteger(given) && given > 0 ? given : undefined;
      const snapshot = JSON.stringify([fields, draftId]);
      if (snapshot === last) return;
      last = snapshot;
      if (sameFields(fields, savedRef.current)) {
        // 저장된 것과 같으면 보관할 것이 없다. 다만 지우는 것은 이 화면이
        // 보관한 것만이다 - 손대지 않은 화면이 다른 창의 보관본을 지우면
        // 안 된다(같은 글을 두 창에 열었을 때, 닫으면서 pagehide 가 돌 때)
        if (wrote) write(key, null);
        wrote = false;
        return;
      }
      write(key, {
        savedAt: Date.now(),
        fields,
        ...(draftId ? { id: draftId } : {}),
      });
      wrote = true;
    }
    const timer = window.setInterval(keep, INTERVAL_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") keep();
    };
    window.addEventListener("pagehide", keep);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", keep);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [key, formId, id]);

  if (!differs) return null;

  function restore() {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement) || !draft) return;
    for (const [name, value] of Object.entries(draft.fields)) {
      const el = fieldOf(form, name);
      if (el) fillField(el, value);
    }
    if (draft.id !== undefined) onRestoreId?.(draft.id);
    settle(key);
  }

  function discard() {
    write(key, null);
    settle(key);
  }

  return (
    <div
      role="region"
      aria-label="저장하지 않은 내용"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <p>
        저장하지 않은 내용이 있습니다{" "}
        <span className="text-muted">
          ({formatDraftTime(draft.savedAt)}, 이 브라우저)
        </span>
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={restore} className={button}>
          되살리기
        </button>
        <button type="button" onClick={discard} className={button}>
          버리기
        </button>
      </div>
    </div>
  );
}
