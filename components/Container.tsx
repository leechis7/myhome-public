import type { ReactNode } from "react";

/**
 * 본문 폭. 모든 화면이 이것을 쓴다 (감시 화면만 대시보드 때문에 예외다).
 *
 * 1024px 이다. 데스크톱에서 양옆이 너무 비어 보인다고 해서 768px 에서
 * 넓혔다(2026-09-09). 여기 한 줄만 고치면 사이트 전체가 같이 움직인다.
 */
export default function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-5 ${className}`}>
      {children}
    </div>
  );
}
