import { createHash, randomBytes } from "node:crypto";
import type { FoundBook } from "@/lib/books/lookup";
import { publishedLabel, summarize } from "@/lib/books/lookup";

/**
 * 내 Calibre 서재에서 책 찾기(MYH-226). Calibre 콘텐츠 서버(calibre-server)의
 * AJAX API 를 쓴다. 서재에 있는 책이면 소개(comments) · ISBN · 표지를 가져온다 -
 * 원서도 Calibre 가 받아 둔 소개가 있어 AI 요약을 할 수 있다.
 *
 *   검색   GET /ajax/search?query=…&num=…   → { book_ids: [...] }
 *   책     GET /ajax/books?ids=1,2           → { "1": { title, authors, comments, identifiers, … } }
 *   표지   GET /get/cover/<id>
 *
 * 로그인은 Calibre 의 Digest 방식이다(--enable-auth). 앱 전용 읽기 계정을 권한다.
 * 주소 · 아이디 · 비밀번호는 환경설정(lib/site/settings.ts)에서.
 */

export type CalibreAccess = { url: string; user: string; password: string };

/** 표지 주소 꼴. 밖 주소가 아니라 Calibre 의 책 번호다 - 받을 때 로그인해서 받는다 */
export const CALIBRE_COVER = /^calibre:(\d{1,10})$/;

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

/** WWW-Authenticate: Digest realm="…", nonce="…", qop="auth", algorithm="MD5" */
export function parseDigest(header: string) {
  const out: Record<string, string> = {};
  for (const m of header.replace(/^Digest\s+/i, "").matchAll(/(\w+)=(?:"([^"]*)"|([^,\s]+))/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3];
  }
  return out;
}

/** Digest 응답 머리글(RFC 7616, MD5 · qop=auth) */
export function digestHeader(
  { user, password }: { user: string; password: string },
  challenge: Record<string, string>,
  method: string,
  uri: string,
  cnonce = randomBytes(8).toString("hex"),
) {
  const nc = "00000001";
  const ha1 = md5(`${user}:${challenge.realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const qop = challenge.qop?.split(",").map((q) => q.trim()).includes("auth") ? "auth" : "";
  const response = qop
    ? md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${challenge.nonce}:${ha2}`);
  const parts = [
    `username="${user}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    `algorithm=MD5`,
    `response="${response}"`,
  ];
  if (challenge.opaque) parts.push(`opaque="${challenge.opaque}"`);
  if (qop) parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  return `Digest ${parts.join(", ")}`;
}

/** 로그인해서 GET. 처음 401 이면 받은 challenge 로 한 번 더 */
async function get(access: CalibreAccess, path: string, timeoutMs = 8000) {
  const url = new URL(path, access.url.endsWith("/") ? access.url : `${access.url}/`);
  const init = { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" as const };
  const first = await fetch(url, init);
  if (first.status !== 401) return first;
  const challenge = first.headers.get("www-authenticate");
  if (!challenge || !/^digest/i.test(challenge)) return first;
  return fetch(url, {
    ...init,
    headers: {
      authorization: digestHeader(access, parseDigest(challenge), "GET", url.pathname + url.search),
    },
  });
}

type CalibreBook = {
  title?: string;
  authors?: string[];
  publisher?: string | null;
  comments?: string | null;
  identifiers?: Record<string, string>;
  /** 출판일(ISO). 모르면 0101-01-01 */
  pubdate?: string | null;
};

/** Calibre 의 소개는 HTML 이다. 글자만 */
export function plainText(html?: string | null) {
  return (html ?? "")
    .replace(/<\s*(br|\/p|\/div|\/li)\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function fromCalibre(id: string, b: CalibreBook, base: string): FoundBook {
  const description = plainText(b.comments) || null;
  const isbn = b.identifiers?.isbn?.replace(/[^\dX]/gi, "") || null;
  return {
    title: (b.title ?? "").trim(),
    author: (b.authors ?? []).join(", "),
    publisher: b.publisher?.trim() || null,
    isbn,
    // 서재의 책 화면. Calibre 웹 화면 주소
    url: `${base.replace(/\/$/, "")}/#book_id=${id}&panel=book_details`,
    cover: `calibre:${id}`,
    summary: summarize(description),
    description,
    published: publishedLabel(b.pubdate),
    source: "calibre",
  };
}

/**
 * Calibre 검색어. ISBN 이면 isbn:, 아니면 제목에서만 찾는다 - 그냥 넣으면 태그 ·
 * 출판사 · 소개까지 뒤져 엉뚱한 책이 섞인다. 낱말마다 title:"…" 를 and 로 잇는다
 * (차례 · 띄어쓰기가 달라도 찾게).
 */
export function calibreQuery(q: string, isbn: string | null, wide = false) {
  if (isbn) return `isbn:${isbn}`;
  // 넓게면 Calibre 의 보통 검색(제목 · 지은이 · 태그 · 소개 …)
  if (wide) return q.replace(/["\\]/g, " ").trim();
  const words = q
    .replace(/["\\]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.map((w) => `title:"${w}"`).join(" and ");
}

/** 서재에서 찾는다(제목만, ISBN 이면 ISBN 으로) */
export async function searchCalibre(
  access: CalibreAccess,
  q: string,
  isbn: string | null,
  limit: number,
  wide = false,
): Promise<FoundBook[]> {
  const query = calibreQuery(q, isbn, wide);
  const res = await get(access, `ajax/search?query=${encodeURIComponent(query)}&num=${limit}`);
  if (!res.ok) throw new Error(`Calibre ${res.status}`);
  const ids = ((await res.json()) as { book_ids?: number[] }).book_ids ?? [];
  if (ids.length === 0) return [];
  const books = await get(access, `ajax/books?ids=${ids.slice(0, limit).join(",")}`);
  if (!books.ok) throw new Error(`Calibre ${books.status}`);
  const data = (await books.json()) as Record<string, CalibreBook | null>;
  return ids
    .slice(0, limit)
    .map((id) => [String(id), data[String(id)]] as const)
    .filter((e): e is readonly [string, CalibreBook] => Boolean(e[1]?.title))
    .map(([id, b]) => fromCalibre(id, b, access.url));
}

/** 서재의 표지를 받는다(로그인해서) */
export async function calibreCover(access: CalibreAccess, id: string, maxBytes: number) {
  const res = await get(access, `get/cover/${id}`, 10000);
  if (!res.ok) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!type.startsWith("image/")) return null;
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) return null;
  return new File([bytes], "cover", { type });
}
