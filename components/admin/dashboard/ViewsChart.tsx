"use client";

import { useEffect, useRef, useState } from "react";
import "./charts.css";

type Day = { day: string; post: number; note: number };

const H = 132;
const PAD = { top: 8, right: 4, bottom: 20, left: 28 };
const SERIES = [
  { key: "post", label: "블로그", color: "var(--series-1)" },
  { key: "note", label: "짧은 글", color: "var(--series-2)" },
] as const;

/** 2026-10-13 → 10.13 */
const md = (day: string) => `${Number(day.slice(5, 7))}.${Number(day.slice(8))}`;

/** 위만 둥근 막대(4px). 바닥은 각지게 */
function topRounded(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** 깔끔한 눈금 최댓값: 1 · 2 · 5 × 10ⁿ */
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v)!;
}

/**
 * 최근 14일 날마다 조회수(MYH-255). 블로그 · 짧은 글을 쌓은 세로 막대, 올리면
 * 그날 숫자. 화면 읽기 프로그램에는 같은 숫자를 표로.
 */
export default function ViewsChart({ days }: { days: Day[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(560);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = niceMax(Math.max(...days.map((d) => d.post + d.note)));
  const plotW = w - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / days.length;
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const totals = SERIES.map((s) => days.reduce((a, d) => a + d[s.key], 0));
  const hd = hover === null ? null : days[hover];

  return (
    <div className="viz">
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="범례">
        {SERIES.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label} <span className="tabular-nums text-foreground">{totals[i]}</span>
          </li>
        ))}
      </ul>
      <div ref={box} className="relative w-full overflow-hidden" onMouseLeave={() => setHover(null)}>
        <svg width={w} height={H} role="img" aria-label={`최근 ${days.length}일 날마다 조회수`} className="block">
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" className="fill-[var(--muted)] text-[10px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = PAD.left + i * band + (band - barW) / 2;
            const postH = (d.post / max) * plotH;
            const noteH = (d.note / max) * plotH;
            const gap = d.post > 0 && d.note > 0 ? 2 : 0;
            const dim = hover !== null && hover !== i;
            return (
              <g key={d.day} opacity={dim ? 0.45 : 1}>
                {d.post > 0 ? (
                  d.note > 0 ? (
                    <rect x={x} y={y(d.post)} width={barW} height={postH} fill="var(--series-1)" />
                  ) : (
                    <path d={topRounded(x, y(d.post), barW, postH)} fill="var(--series-1)" />
                  )
                ) : null}
                {d.note > 0 ? (
                  <path d={topRounded(x, y(d.post) - noteH - gap, barW, noteH)} fill="var(--series-2)" />
                ) : null}
                {/* 막대보다 넓은 자리로 올린다 */}
                <rect
                  x={PAD.left + i * band}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            );
          })}
          {[0, Math.floor(days.length / 2), days.length - 1].map((i) => (
            <text
              key={i}
              x={PAD.left + i * band + band / 2}
              y={H - 5}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px] tabular-nums"
            >
              {md(days[i].day)}
            </text>
          ))}
        </svg>
        {hd && hover !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow"
            style={{
              left: Math.min(Math.max(PAD.left + hover * band + band / 2 - 56, 0), w - 112),
            }}
          >
            <p className="font-medium tabular-nums">{md(hd.day)}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5 tabular-nums">
                <span aria-hidden className="size-2 rounded-sm" style={{ background: s.color }} />
                {s.label} {hd[s.key]}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>최근 {days.length}일 날마다 조회수</caption>
        <thead>
          <tr>
            <th scope="col">날</th>
            <th scope="col">블로그</th>
            <th scope="col">짧은 글</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{md(d.day)}</th>
              <td>{d.post}</td>
              <td>{d.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
