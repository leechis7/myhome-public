"use client";

import { useEffect } from "react";

const PRESSABLE = 'button:not(:disabled), [role="button"]:not([aria-disabled="true"]), summary, a';

/**
 * 손가락으로 누른 단추 · 링크의 눌림 표시를 뗀 뒤에도 잠깐 남긴다(MYH-280).
 * :active 는 손을 떼면 바로 풀려 손가락에 가려 보이지 않는다. 누르는 동안
 * data-pressed, 뗀 뒤에는 data-released 로 천천히 돌아온다(globals.css).
 * 마우스는 :active 로 충분해 건드리지 않는다
 */
export default function PressFeedback() {
  useEffect(() => {
    let pressed: HTMLElement | null = null;

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(PRESSABLE);
      if (!el) return;
      delete el.dataset.released;
      el.dataset.pressed = "";
      pressed = el;
    };
    // 스크롤하려고 댄 것이면 pointercancel 이 온다 - 그때는 남기지 않는다
    const release = (linger: boolean) => () => {
      const el = pressed;
      pressed = null;
      if (!el) return;
      delete el.dataset.pressed;
      if (!linger) return;
      el.dataset.released = "";
      el.addEventListener("animationend", () => delete el.dataset.released, { once: true });
    };
    const up = release(true);
    const cancel = release(false);

    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("pointercancel", cancel, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
    };
  }, []);

  return null;
}
