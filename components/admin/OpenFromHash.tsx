"use client";

import { useEffect } from "react";

/**
 * 주소의 #자리(예: /admin/codes#g00002)가 가리키는 구역 안의 접힌 칸을 편다.
 * 접어 둔 목록으로 곧장 들어오는 길(「분류 고치기 →」)이 있을 때 쓴다.
 * 그 뒤에 #자리만 바뀌어도(같은 화면 안 링크) 따라 편다.
 */
export default function OpenFromHash({ selector }: { selector: string }) {
  useEffect(() => {
    function open() {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      const details = target?.querySelector<HTMLDetailsElement>(selector);
      if (!details) return;
      details.open = true;
      target!.scrollIntoView({ block: "start" });
    }
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [selector]);
  return null;
}
