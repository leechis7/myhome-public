import { siteConfig } from "@/lib/site/settings";
import type { CalibreAccess } from "@/lib/books/calibre";
import { readSources, type SourceSetting } from "@/lib/books/sources";

/**
 * 카카오 책 검색 키(MYH-231). .env 의 KAKAO_REST_API_KEY 가 먼저, 없으면 관리 ›
 * 설정 › 환경설정 에서 넣은 것(암호화해 DB 에). 둘 다 없으면 null - 책 찾기는
 * Open Library 로 간다. 읽고 쓰는 것은 lib/site/settings.ts 가 한다.
 */

export async function kakaoKey() {
  return (await siteConfig()).kakaoRestKey;
}

/** 키처럼 생겼는가. 카카오 REST API 키는 32자 영숫자다 - 조금 넉넉히 받는다 */
export function isKakaoKey(value: string) {
  return /^[A-Za-z0-9]{20,64}$/.test(value);
}


/** 내 Calibre 서재(MYH-226). 주소 · 아이디 · 비밀번호가 다 있어야 쓴다 */
export async function calibreAccess(): Promise<CalibreAccess | null> {
  const { calibreUrl: url, calibreUser: user, calibrePassword: password } = await siteConfig();
  return url && user && password ? { url, user, password } : null;
}

/** 책 찾기 출처의 순서 · 사용(MYH-226) */
export async function bookSources(): Promise<SourceSetting[]> {
  // .env 의 BOOK_SOURCES 가 먼저(MYH-232)
  return readSources((await siteConfig()).bookSources);
}

/** 책 찾기에 넘길 것 한 묶음: 키 · 계정 · 켠 출처의 차례 */
export async function lookupAccess() {
  const [key, calibre, sources] = await Promise.all([kakaoKey(), calibreAccess(), bookSources()]);
  return {
    kakaoKey: key,
    calibre,
    order: sources.filter((s) => s.on).map((s) => s.source),
  };
}
