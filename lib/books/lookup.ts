/**
 * 책 찾기(MYH-226). 관리 › 책 에서 제목이나 ISBN 을 넣으면 후보를 보이고,
 * 고르면 제목 · 지은이 · 링크 · 표지를 채운다.
 *
 * 찾는 곳은 둘이다.
 *   - 카카오 키가 있으면 카카오 책 검색. 한국 책이 잘 나온다. 키는 .env 의
 *     KAKAO_REST_API_KEY 나 관리 › 설정 › 환경설정(lib/books/lookup-key.ts, MYH-231).
 *   - 없으면 Open Library. 열쇠가 필요 없지만 한국 책이 적다.
 * Google Books 도 열쇠 없이 쓰려 했으나 열쇠 없는 하루 한도가 0 이다.
 *
 * 표지는 서버가 받아 올린 그림(uploads)으로 저장한다. 밖의 주소를 그대로
 * 걸지 않는다. 받는 곳은 아래 COVER_HOSTS 로만 - 폼이 보낸 아무 주소나
 * 서버가 대신 열어 주지 않게 한다.
 */

export type FoundBook = {
  title: string;
  author: string;
  publisher: string | null;
  isbn: string | null;
  /** 책 소개 화면(카카오 · Open Library) */
  url: string | null;
  /** 표지 그림 주소. 저장할 때 서버가 받는다 */
  cover: string | null;
  /** 한두 줄 소개 밑그림. 카카오의 책 소개 앞부분(Open Library 는 없다) */
  summary: string | null;
  /** 받은 책 소개 그대로. 고를 때 Gemini 로 요약한다(MYH-233) */
  description: string | null;
};

/** 표지를 받아도 되는 곳. 정확히 같거나 그 아래 이름 */
const COVER_HOSTS = [
  "search1.kakaocdn.net",
  "t1.daumcdn.net",
  "covers.openlibrary.org",
  // Open Library 표지는 archive.org 로 넘겨준다
  "archive.org",
];

export function isCoverUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.username === "" &&
    url.port === "" &&
    COVER_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
  );
}

/** 숫자(과 끝의 X)만 남겨 10 · 13자리면 ISBN 으로 본다 */
export function asIsbn(query: string) {
  const digits = query.replace(/[\s-]/g, "").toUpperCase();
  return /^(\d{9}[\dX]|\d{13})$/.test(digits) ? digits : null;
}

type KakaoDoc = {
  title?: string;
  authors?: string[];
  publisher?: string;
  isbn?: string;
  url?: string;
  thumbnail?: string;
  /** 책 소개. 출판사 글의 앞부분이 잘려 온다 */
  contents?: string;
};

/** 한두 줄 소개는 이보다 길 까닭이 없다 */
const SUMMARY_MAX = 120;

/**
 * 책 소개 앞부분을 한두 줄로 줄인다. 문장 끝(. ! ? 。 · 「다.」)에서 끊되
 * SUMMARY_MAX 를 넘지 않게. 끊을 자리가 없으면 낱말 사이에서 자르고 … 를 붙인다.
 * AI 로 요약하지 않는다 - 출판사가 쓴 첫 문장들이 대개 그 책의 한 줄이다.
 */
export function summarize(text?: string | null) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length <= SUMMARY_MAX && /[.!?。]$/.test(t)) return t;
  const ends = [...t.matchAll(/[.!?。](?=\s|$)/g)].map((m) => m.index + 1);
  const cut = ends.filter((i) => i <= SUMMARY_MAX).pop();
  if (cut && cut >= 20) return t.slice(0, cut);
  const head = t.slice(0, SUMMARY_MAX);
  const space = head.lastIndexOf(" ");
  return `${(space > 40 ? head.slice(0, space) : head).replace(/[,·\s]+$/, "")}…`;
}

/**
 * 카카오 응답. ISBN 은 "10자리 13자리" 로 붙어 온다 - 13자리를 쓴다.
 * 표지는 작은 썸네일(120px) 주소 안에 원본 주소(fname)가 들어 있어 그것을 쓴다.
 */
export function fromKakao(json: { documents?: KakaoDoc[] }): FoundBook[] {
  return (json.documents ?? [])
    .filter((d) => d.title)
    .map((d) => {
      const isbns = (d.isbn ?? "").split(/\s+/).filter(Boolean);
      return {
        title: d.title!.trim(),
        author: (d.authors ?? []).join(", "),
        publisher: d.publisher?.trim() || null,
        isbn: isbns.find((i) => i.length === 13) ?? isbns[0] ?? null,
        url: d.url || null,
        cover: kakaoCover(d.thumbnail),
        summary: summarize(d.contents),
        description: d.contents?.trim() || null,
      };
    });
}

function kakaoCover(thumbnail?: string) {
  if (!thumbnail) return null;
  try {
    const original = new URL(thumbnail).searchParams.get("fname");
    if (original) {
      const https = original.replace(/^http:/, "https:");
      if (isCoverUrl(https)) return https;
    }
  } catch {
    return null;
  }
  return isCoverUrl(thumbnail) ? thumbnail : null;
}

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  publisher?: string[];
  isbn?: string[];
  key?: string;
  cover_i?: number;
};

export function fromOpenLibrary(json: { docs?: OpenLibraryDoc[] }): FoundBook[] {
  return (json.docs ?? [])
    .filter((d) => d.title)
    .map((d) => ({
      title: d.title!.trim(),
      author: (d.author_name ?? []).join(", "),
      publisher: d.publisher?.[0] ?? null,
      isbn: d.isbn?.find((i) => i.length === 13) ?? d.isbn?.[0] ?? null,
      url: d.key ? `https://openlibrary.org${d.key}` : null,
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
      summary: null,
      description: null,
    }));
}

const LIMIT = 6;

/** 찾는 곳 이름. 화면에 작게 적는다 */
export function lookupSource(key: string | null) {
  return key ? "카카오(없으면 Open Library)" : "Open Library";
}

/** key 는 카카오 키(lib/books/lookup-key.ts). 없으면 Open Library 로 찾는다 */
export async function searchBooks(query: string, key: string | null): Promise<FoundBook[]> {
  const q = query.trim();
  if (!q) return [];
  const isbn = asIsbn(q);

  // 카카오는 국내에서 파는 책만 안다. 원서(「Magical Haskell」)는 비어 오므로
  // 그때 · 카카오가 실패한 때는 Open Library 에 한 번 더 묻는다
  if (key) {
    const found = await searchKakao(q, isbn, key).catch(() => []);
    if (found.length > 0) return found;
  }
  return searchOpenLibrary(q, isbn);
}

async function searchKakao(q: string, isbn: string | null, key: string) {
  const url = new URL("https://dapi.kakao.com/v3/search/book");
  url.searchParams.set("query", isbn ?? q);
  url.searchParams.set("size", String(LIMIT));
  if (isbn) url.searchParams.set("target", "isbn");
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`카카오 책 검색 ${res.status}`);
  return fromKakao(await res.json());
}

async function searchOpenLibrary(q: string, isbn: string | null) {
  const url = new URL("https://openlibrary.org/search.json");
  if (isbn) url.searchParams.set("isbn", isbn);
  else url.searchParams.set("q", q);
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("fields", "title,author_name,publisher,isbn,key,cover_i");
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const books = fromOpenLibrary(await res.json());
  // 판이 여럿인 책은 엉뚱한 판의 ISBN 이 앞에 온다. 찾은 ISBN 을 쓴다
  return isbn ? books.map((b) => ({ ...b, isbn })) : books;
}

/** 표지는 이보다 클 까닭이 없다 */
const MAX_COVER_BYTES = 5 * 1024 * 1024;

/**
 * 찾은 표지를 받는다. 넘겨주기(redirect)도 한 번씩 따라가되 매번 받아도 되는
 * 곳인지 다시 본다. 그림이 아니거나 너무 크면 null.
 */
export async function fetchCover(address: string): Promise<File | null> {
  let current = address;
  for (let hop = 0; hop < 4; hop++) {
    if (!isCoverUrl(current)) return null;
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) return null;
      current = new URL(next, current).toString();
      continue;
    }
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!type.startsWith("image/")) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_COVER_BYTES) return null;
    return new File([bytes], "cover", { type });
  }
  return null;
}
