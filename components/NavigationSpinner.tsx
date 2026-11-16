"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** 이보다 빨리 열리면 보이지 않는다 - 깜빡임을 막는다 */
const DELAY_MS = 200;
/** 이동이 끝났다는 신호를 놓쳐도 계속 돌지 않게 */
const GIVE_UP_MS = 20_000;

/**
 * 페이지를 옮기는 동안 화면 가운데에 도는 표시(MYH-281). 늦게 열리면 넘어가는 중인지
 * 알 수 없었다. loading.tsx 를 쓰지 않는 이유: 응답을 먼저 흘려보내 notFound() 가
 * 404 대신 200 으로 나간다. 사이트 안 링크를 누르면 켜고, 주소가 바뀌면 끈다
 */
export default function NavigationSpinner() {
  const key = `${usePathname()}?${useSearchParams().toString()}`;
  /** 링크를 누른 횟수. 0 이면 이동 중이 아니다 */
  const [pending, setPending] = useState(0);
  const [shown, setShown] = useState(0);
  const [prevKey, setPrevKey] = useState(key);

  // 새 화면으로 바뀌면 끈다(렌더 중에 맞추는 React 권장 방식)
  if (key !== prevKey) {
    setPrevKey(key);
    setPending(0);
    setShown(0);
  }

  useEffect(() => {
    // 먼저 받는다(capture) - Link 가 스스로 preventDefault 해서 나중에는 가려낼 수 없다
    const click = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      const a = e.target.closest("a");
      if (!a || !a.href || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
      // 편집기 안의 링크는 누르면 고칠 뿐 옮기지 않는다
      if (a.closest("[contenteditable]")) return;
      const to = new URL(a.href, location.href);
      if (to.origin !== location.origin) return;
      // 같은 화면 안의 #이동은 페이지를 옮기지 않는다
      if (to.pathname === location.pathname && to.search === location.search) return;
      setPending((n) => n + 1);
    };
    // 뒤로 가기로 캐시(bfcache)에서 되살아난 화면에 표시가 남지 않게
    const restore = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(0);
    };
    window.addEventListener("click", click, true);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("click", click, true);
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const show = setTimeout(() => setShown(pending), DELAY_MS);
    const stop = setTimeout(() => setPending(0), GIVE_UP_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(stop);
    };
  }, [pending]);

  if (!pending || shown !== pending) return null;
  return (
    <div
      role="status"
      aria-label="페이지를 불러오는 중"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    >
      <span className="size-10 animate-spin rounded-full border-4 border-foreground/15 border-t-foreground/70" />
    </div>
  );
}
