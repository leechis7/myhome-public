"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 펼칠 때 처음으로 속을 그리는 <details>. 책 관리 · 짧은 글 관리처럼 접힌 줄이
 * 많고 줄마다 무거운 폼(책 찾기 · 표지 올리기 · 편집기)이 든 목록에 쓴다 -
 * 미리 다 그리면 화면이 느려진다. 한 번 펼친 것은 접어도 그대로 둔다(고치던
 * 것이 사라지지 않게).
 *
 * openOnHash 를 주면 주소의 #… 가 그것일 때 펼친 채로 연다(글 화면의 「고치기」
 * 가 관리 목록의 그 줄로 데려올 때). openIfStored 를 주면 이 브라우저에 그
 * 이름으로 보관된 것이 있을 때 펼친다 - 저장 안 한 고침(MYH-193)을 접힌 줄
 * 속에 숨기지 않게.
 */
export default function LazyDetails({
  summary,
  summaryClassName,
  openOnHash,
  openIfStored,
  children,
}: {
  summary: ReactNode;
  summaryClassName?: string;
  openOnHash?: string;
  openIfStored?: string;
  children: ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!openIfStored || !ref.current) return;
    try {
      if (localStorage.getItem(openIfStored)) ref.current.open = true;
    } catch {
      // 저장소를 못 쓰는 브라우저 - 접어 둔다
    }
  }, [openIfStored]);

  useEffect(() => {
    if (!openOnHash) return;
    const check = () => {
      if (window.location.hash === `#${openOnHash}` && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ block: "start" });
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [openOnHash]);

  return (
    <details ref={ref} onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      <summary className={summaryClassName}>{summary}</summary>
      {opened ? children : null}
    </details>
  );
}
