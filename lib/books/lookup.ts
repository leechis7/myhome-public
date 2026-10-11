import { CALIBRE_COVER, calibreCover, searchCalibre, type CalibreAccess } from "@/lib/books/calibre";
import { BOOK_SOURCES, type BookSource } from "@/lib/books/sources";

/**
 * 책 찾기(MYH-226). 관리 › 책 에서 제목이나 ISBN 을 넣으면 후보를 보이고,
 * 고르면 제목 · 지은이 · 링크 · 표지를 채운다.
 *
 * 찾는 곳은 카카오 → 내 Calibre 서재(lib/books/calibre.ts) → Open Library 차례다.
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
  /** 출판일. 「2015.6.1」 · 「2015.6」 · 「2015」 처럼 아는 만큼 */
  published: string | null;
  /** 어디서 찾았나 */
  source: BookSource;
  /** 같은 ISBN 을 합친 줄이면 그 출처들(맨 앞이 source). 목록에 딱지로 보인다 */
  sources?: BookSource[];
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

/**
 * 출판일을 「2015.6.1」 꼴로. ISO 날짜(2015-06-01T…) · 해(2015)를 받는다.
 * Calibre 는 모를 때 0101-01-01 을 주므로 그런 것은 버린다.
 */
export function publishedLabel(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const m = String(value).match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 1400 || year > 2100) return null;
  const month = m[2] ? Number(m[2]) : null;
  const day = m[3] ? Number(m[3]) : null;
  return [year, month, day].filter((n) => n).join(".");
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
  /** 출판일(ISO 날짜) */
  datetime?: string;
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
        published: publishedLabel(d.datetime),
        source: "kakao" as const,
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
  first_publish_year?: number;
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
      published: publishedLabel(d.first_publish_year),
      source: "openlibrary" as const,
    }));
}

const LIMIT = 6;

/** 찾는 곳 이름. 화면에 작게 적는다 */
export function lookupSource(order: BookSource[]) {
  return order.map((s) => BOOK_SOURCES[s].label).join(" · ") || "(쓰는 출처 없음)";
}

/**
 * 찾는다. 기본은 제목에서만(ISBN 이면 ISBN), wide 면 지은이 · 내용까지.
 * 차례와 쓸 출처는 환경설정 › 책 찾기(order, lib/books/sources.ts) -
 * 처음 값은 카카오 → 내 서재 → Open Library. 키 · 계정이 없는 출처는 건너뛴다.
 * 한쪽이 실패해도 다른 쪽은 보인다. 같은 ISBN 은 한 줄로 합친다 - 위의 출처의
 * 것을 두고, 빈 지은이 · 소개 · 표지는 뒤의 것(서재의 원서 소개 같은)으로 채운다.
 */
export async function searchBooks(
  query: string,
  {
    kakaoKey: key,
    calibre,
    order,
    wide = false,
  }: {
    kakaoKey: string | null;
    calibre: CalibreAccess | null;
    order: BookSource[];
    /** 지은이 · 내용까지 넓게. 기본은 제목에서만(ISBN 이면 ISBN 으로) */
    wide?: boolean;
  },
): Promise<FoundBook[]> {
  const q = query.trim();
  if (!q) return [];
  const isbn = asIsbn(q);
  const ask: Record<BookSource, () => Promise<FoundBook[]>> = {
    kakao: () => (key ? searchKakao(q, isbn, key, wide) : Promise.resolve([])),
    calibre: () => (calibre ? searchCalibre(calibre, q, isbn, LIMIT, wide) : Promise.resolve([])),
    openlibrary: () => searchOpenLibrary(q, isbn, wide),
  };
  const lists = await Promise.all(order.map((source) => ask[source]().catch(() => [])));
  return mergeFound(lists.flat()).slice(0, MAX_FOUND);
}

/** 찾은 책을 모두 합쳐 이 이상은 보이지 않는다 */
const MAX_FOUND = 12;

/** 같은 ISBN 을 한 줄로. 앞의 것을 두고 빈 칸(지은이 · 소개 · 표지 …)만 뒤의 것으로 채운다 */
export function mergeFound(books: FoundBook[]) {
  const out: FoundBook[] = [];
  const byIsbn = new Map<string, FoundBook>();
  for (const book of books) {
    const same = book.isbn ? byIsbn.get(book.isbn) : undefined;
    if (!same) {
      out.push(book);
      if (book.isbn) byIsbn.set(book.isbn, book);
      continue;
    }
    // 카카오의 원서 줄은 지은이 · 출판사가 비어 오기도 한다(「The Mythical Man-Month」)
    if (!same.author) same.author = book.author;
    same.description ??= book.description;
    same.summary ??= book.summary;
    same.cover ??= book.cover;
    same.publisher ??= book.publisher;
    same.published ??= book.published;
    same.sources = [...new Set([...(same.sources ?? [same.source]), book.source])];
  }
  return out;
}

async function searchKakao(q: string, isbn: string | null, key: string, wide: boolean) {
  const url = new URL("https://dapi.kakao.com/v3/search/book");
  url.searchParams.set("query", isbn ?? q);
  url.searchParams.set("size", String(LIMIT));
  // 기본은 제목에서만. 넓게면 target 을 두지 않는다(카카오가 제목 · 지은이 · 출판사를 다 본다)
  if (isbn) url.searchParams.set("target", "isbn");
  else if (!wide) url.searchParams.set("target", "title");
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`카카오 책 검색 ${res.status}`);
  return fromKakao(await res.json());
}

async function searchOpenLibrary(q: string, isbn: string | null, wide: boolean) {
  const url = new URL("https://openlibrary.org/search.json");
  if (isbn) url.searchParams.set("isbn", isbn);
  else url.searchParams.set(wide ? "q" : "title", q);
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("fields", "title,author_name,publisher,isbn,key,cover_i,first_publish_year");
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
export async function fetchCover(
  address: string,
  calibre: CalibreAccess | null = null,
): Promise<File | null> {
  // 내 Calibre 서재의 표지는 로그인해서 받는다
  const mine = address.match(CALIBRE_COVER);
  if (mine) return calibre ? calibreCover(calibre, mine[1], MAX_COVER_BYTES) : null;
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
