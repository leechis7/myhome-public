/**
 * 지표로 낼 "쌓인 것" 의 칸과 값.
 *
 * 셀 것이 없으면 그 줄이 아예 나가지 않는다. 그러면 대시보드에서 0 이
 * 아니라 빈칸으로 보이고, "지표가 고장난 건가" 와 "정말 없는 건가" 가
 * 구분되지 않는다. 그래서 있을 수 있는 칸을 미리 0 으로 깔고 센 값으로
 * 덮는다.
 *
 * DB 없이 확인할 수 있게 섞는 것만 여기 두고, 세는 것은 lib/ops/metrics.ts 에
 * 남긴다.
 */
export type ContentCount = { kind: string; state: string; count: number };

/** 있을 수 있는 칸. 하나도 없어도 0 으로 나간다 */
export const CONTENT_CELLS: { kind: string; state: string }[] = [
  // 글과 짧은 글은 상태가 셋이다 (lib/posts/state.ts 와 같은 갈래)
  ...["post", "note"].flatMap((kind) =>
    ["public", "private", "draft"].map((state) => ({ kind, state })),
  ),
  { kind: "comment", state: "all" },
  { kind: "message", state: "unread" },
  { kind: "message", state: "read" },
];

/**
 * 센 결과를 칸에 얹는다.
 *
 * 깔아 둔 칸에 없는 것이 와도 버리지 않는다 — 나중에 상태가 하나 늘어도
 * 지표에서는 보이게 하려는 것이다(그때 CONTENT_CELLS 도 같이 고치면 된다).
 */
export function mergeContentCounts(rows: ContentCount[]): ContentCount[] {
  const merged = new Map<string, ContentCount>();

  for (const cell of CONTENT_CELLS) {
    merged.set(`${cell.kind}/${cell.state}`, { ...cell, count: 0 });
  }
  for (const row of rows) {
    merged.set(`${row.kind}/${row.state}`, {
      kind: row.kind,
      state: row.state,
      count: Number(row.count),
    });
  }

  return [...merged.values()];
}
