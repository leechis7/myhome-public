/**
 * 책 찾기가 묻는 곳(출처, MYH-226). 새 출처를 붙이려면 여기 한 줄과
 * lib/books/lookup.ts 의 searchBooks 에서 그 출처를 묻는 길을 더한다 - 환경설정 ›
 * 책 찾기 의 순서 · 사용 칸에는 저절로 나온다.
 *
 * 순서와 사용 여부는 site_settings.book_sources 에 「kakao,-calibre,openlibrary」
 * 꼴로 둔다(앞이 먼저, - 는 끔). 여기 있는데 저장된 것에 없는 출처(새로 붙인
 * 것)는 맨 뒤에 켠 채로 붙는다.
 *
 * DB 를 보지 않는다 - 화면(클라이언트)에서도 쓴다.
 */

export const BOOK_SOURCES = {
  kakao: { label: "카카오", needs: "카카오 키" },
  calibre: { label: "내 서재", needs: "Calibre 계정" },
  openlibrary: { label: "Open Library", needs: null },
} as const;

export type BookSource = keyof typeof BOOK_SOURCES;

export const SOURCE_NAMES = Object.keys(BOOK_SOURCES) as BookSource[];

export function isBookSource(value: unknown): value is BookSource {
  return typeof value === "string" && Object.hasOwn(BOOK_SOURCES, value);
}

export type SourceSetting = { source: BookSource; on: boolean };

/** 저장된 글을 읽는다. 비었으면 처음 값(다 켬, 위의 차례) */
export function readSources(stored: string | null | undefined): SourceSetting[] {
  const out: SourceSetting[] = [];
  for (const part of (stored ?? "").split(",")) {
    const off = part.startsWith("-");
    const name = off ? part.slice(1) : part;
    if (isBookSource(name) && !out.some((s) => s.source === name)) {
      out.push({ source: name, on: !off });
    }
  }
  for (const name of SOURCE_NAMES) {
    if (!out.some((s) => s.source === name)) out.push({ source: name, on: true });
  }
  return out;
}

export function writeSources(list: SourceSetting[]) {
  return list.map((s) => (s.on ? s.source : `-${s.source}`)).join(",");
}

/** 한 칸 위 · 아래로 */
export function moveSource(list: SourceSetting[], source: BookSource, dir: "up" | "down") {
  const i = list.findIndex((s) => s.source === source);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
