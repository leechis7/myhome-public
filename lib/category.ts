/**
 * 분류별로 묶는다. 정렬 순서는 이미 매겨져 있으므로 처음 나온 순서를 지킨다.
 * 분류가 없는 것은 맨 뒤에 하나로 모은다.
 *
 * 기술과 내 서비스가 같은 방식으로 묶인다. 테이블만 다르고 규칙은 하나다.
 */
export function groupByCategory<T extends { category: string | null }>(
  rows: T[],
) {
  const groups = new Map<string | null, T[]>();
  for (const row of rows) {
    const key = row.category?.trim() || null;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups].sort(
    (a, b) => Number(a[0] === null) - Number(b[0] === null),
  );
}
