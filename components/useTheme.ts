"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

/** ThemeToggle 이 직접 전환할 때 알리는 신호. OS 설정 변경과 함께 구독한다. */
export const THEME_EVENT = "themechange";

/** 지금 적용된 테마를 DOM과 OS 설정에서 읽는다 */
export function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** OS 설정 변경과 직접 전환을 모두 구독한다 */
export function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

/**
 * 서버에서는 테마를 알 수 없다. 그래서 첫 렌더에서는 null 이고, 하이드레이션
 * 뒤에 실제 값이 온다 — 그렇게 해야 서버와 클라이언트가 어긋나지 않는다.
 */
export function useTheme() {
  return useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);
}
