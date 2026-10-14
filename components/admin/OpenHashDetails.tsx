"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * 주소의 #자리(예: /admin/settings#gemini)가 가리키는 곳을 감싼 접힌 칸을 모두
 * 편다 - 그 자리 바로 아래의 접힌 칸도. 칸을 다 접어 둔 화면(환경설정, MYH-249)에
 * 바로 들어오는 링크 · 저장 뒤 돌아오기가 그 칸을 펴서 보이게 한다.
 * #자리만 바뀌어도(같은 화면 안 링크) 따라 편다. 저장 뒤 같은 화면으로 돌아오면
 * (?out=saved…) 칸이 다시 그려지며 접히므로 그때도 다시 편다.
 */
export default function OpenHashDetails() {
  const query = useSearchParams().toString();
  useEffect(() => {
    function open() {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      for (let el: HTMLElement | null = target; el; el = el.parentElement) {
        if (el instanceof HTMLDetailsElement) el.open = true;
      }
      const own = target.querySelector<HTMLDetailsElement>(":scope > details");
      if (own) own.open = true;
      target.scrollIntoView({ block: "start" });
    }
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [query]);
  return null;
}
