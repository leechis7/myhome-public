"use client";

import { useRef, useState } from "react";

/**
 * 코드 블록. 마우스를 올리면 복사 버튼이 보인다.
 * 복사할 내용은 화면에 그려진 글자에서 그대로 읽는다.
 */
export default function CodeBlock({
  children,
}: {
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = ref.current?.innerText ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드가 막힌 환경에서는 직접 선택해 복사하면 된다
    }
  }

  return (
    <div className="group relative">
      <pre
        ref={ref}
        className="overflow-x-auto rounded-xl border border-border p-4"
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="코드 복사"
        className="absolute top-2 right-2 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}
