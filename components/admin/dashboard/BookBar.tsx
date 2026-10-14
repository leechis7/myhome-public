"use client";

import { useState } from "react";
import "./charts.css";

type Part = { key: string; label: string; n: number };

const COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

/**
 * 책 상태별 비율(MYH-255). 한 줄로 쌓은 띠 - 칸 사이는 2px 바탕색 틈. 수는
 * 범례에 늘 적는다(노랑 · 청록은 밝은 바탕에서 옅어 색만으로 읽히지 않게).
 */
export default function BookBar({ parts }: { parts: Part[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = parts.reduce((a, p) => a + p.n, 0);
  if (total === 0) return null;
  const shown = parts.filter((p) => p.n > 0);
  return (
    <div className="viz">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded" role="img" aria-label={parts.map((p) => `${p.label} ${p.n}`).join(", ")}>
        {shown.map((p) => (
          <span
            key={p.key}
            title={`${p.label} ${p.n}권 (${Math.round((p.n / total) * 100)}%)`}
            onMouseEnter={() => setHover(p.key)}
            onMouseLeave={() => setHover(null)}
            className="h-full transition-opacity"
            style={{
              flexGrow: p.n,
              flexBasis: 0,
              minWidth: 3,
              background: COLORS[parts.indexOf(p)],
              opacity: hover && hover !== p.key ? 0.45 : 1,
            }}
          />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-4">
        {parts.map((p, i) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i] }} />
            {p.label} <span className="tabular-nums text-foreground">{p.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
