"use client";

import { useState, type ReactNode } from "react";

/**
 * 펼칠 때 처음으로 속을 그리는 <details>. 책 관리처럼 접힌 줄이 많고 줄마다
 * 무거운 폼(책 찾기 · 표지 올리기)이 든 목록에 쓴다 - 120권의 폼을 미리 다
 * 그리면 화면이 느려진다. 한 번 펼친 것은 접어도 그대로 둔다(고치던 것이
 * 사라지지 않게).
 */
export default function LazyDetails({
  summary,
  summaryClassName,
  children,
}: {
  summary: ReactNode;
  summaryClassName?: string;
  children: ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <details onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      <summary className={summaryClassName}>{summary}</summary>
      {opened ? children : null}
    </details>
  );
}
