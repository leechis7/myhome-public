import { configSources, saveConfig, siteConfig } from "@/lib/site/settings";

/**
 * 카카오 책 검색 키(MYH-231). .env 의 KAKAO_REST_API_KEY 가 먼저, 없으면 관리 ›
 * 설정 › 환경설정 에서 넣은 것(암호화해 DB 에). 둘 다 없으면 null - 책 찾기는
 * Open Library 로 간다. 읽고 쓰는 것은 lib/site-config.ts 가 한다.
 */

/** 어디서 온 키인가. 화면에 「설정됨」 을 어떻게 적을지 가른다 */
export async function kakaoKeySource() {
  return (await configSources()).kakaoRestKey;
}

export async function kakaoKey() {
  return (await siteConfig()).kakaoRestKey;
}

/** 키처럼 생겼는가. 카카오 REST API 키는 32자 영숫자다 - 조금 넉넉히 받는다 */
export function isKakaoKey(value: string) {
  return /^[A-Za-z0-9]{20,64}$/.test(value);
}

/** 넣거나(글자) 지운다(null) */
export async function saveKakaoKey(key: string | null) {
  await saveConfig({ kakaoRestKey: key });
}
