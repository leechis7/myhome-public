"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * 몇 줄까지만 보여 주고, 넘치면 끝을 흐리게 하고 「더 보기」 를 단다(MYH-184).
 *
 * 마크다운은 문단 · 목록 · 코드가 섞여 CSS line-clamp(한 덩어리 글자에만
 * 걸린다)로는 자를 수 없다. 높이로 자르고, 실제로 넘쳤는지는 그린 뒤에 잰다 -
 * 짧은 글까지 끝이 흐려지면 안 된다. 스크립트가 없으면 잘린 채로만 보이고
 * 날짜를 눌러 전체를 본다.
 */
export default function ClampedText({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollHeight > el.clientHeight + 1);
    check();
    // 글꼴 · 그림이 늦게 들어오면 높이가 바뀐다
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={box}
        data-clamped={overflow ? "" : undefined}
        // 네 줄 남짓(leading-relaxed 1.625 × 4 ≈ 6.5em)
        className="max-h-[6.75em] overflow-hidden data-[clamped]:[mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
      >
        {children}
      </div>
      {overflow ? (
        <Link
          href={href}
          className="mt-1 inline-block text-sm text-muted transition-colors hover:text-foreground"
        >
          더 보기 →
        </Link>
      ) : null}
    </>
  );
}
