/**
 * 사이트 정보 중 코드에 남는 것과, DB 가 비었을 때의 보기 값.
 *
 * 이름 · 제목 · 설명 · 대표 메일 · 한 줄 소개는 DB(site_settings)에 있고
 * 관리 › 설정 › 사이트 에서 고친다(MYH-169). 읽는 것은 `lib/site/info.ts`
 * 의 getSite() 다. 이 파일은 DB 를 부르지 않는다 — 브라우저 쪽 코드도 읽는다.
 */

export const site = {
  // 인스턴스마다 다르다. dev 서버는 dev 서브도메인을 쓴다.
  // 배포와 묶인 값이라 DB 가 아니라 환경변수다.
  //
  // **NEXT_PUBLIC_ 을 붙이지 않는다(MYH-170).** 그 접두어가 붙으면 Next 가
  // 빌드할 때 값을 코드에 박는다 — 서버 코드도 마찬가지다. 전에는 그 바람에
  // 운영이 실행 때 준 값이 아니라 이 줄의 기본값으로 돌고 있었다. 이 이름은
  // 서버가 실행할 때 읽는다. 브라우저 쪽 코드에서는 이 값을 쓰지 않는다.
  url: (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
} as const;

/** 화면이 쓰는 사이트 정보. 비는 칸이 없다 — 빈 것은 보기 값으로 채웠다 */
export type SiteInfo = {
  /** 머리글 왼쪽 · 저작권 줄 · 아이콘 글자(첫 글자) · 글쓴이 */
  name: string;
  /** 브라우저 탭과 검색 결과의 제목 */
  title: string;
  /** 공유 카드의 한 줄 소개 */
  tagline: string;
  /** 검색 결과 설명 · RSS 설명 */
  description: string;
  /** 대표 메일. 구조화 데이터(JSON-LD)처럼 하나만 적어야 하는 곳에 쓴다. 비면 싣지 않는다 */
  email: string | null;
  /** 사이트 주소. DB 가 아니라 환경변수(SITE_URL)다 */
  url: string;
};

/**
 * 막 설치해 아무것도 적지 않았을 때의 값. 화면이 깨지지 않게 하는 것이
 * 목적이라 누구의 것도 아닌 말로 둔다.
 */
export const DEFAULT_SITE: Omit<SiteInfo, "url"> = {
  // 첫 화면 제목이 「{이름}의 홈페이지」 라 이름은 사람 이름 꼴의 보기 값이다.
  // 「내 홈페이지」 로 두면 빈 설치에서 「내 홈페이지의 홈페이지」 가 됐다
  name: "홍길동",
  title: "홍길동의 홈페이지",
  tagline: "개발과 기록",
  description: "개발과 기록을 담는 개인 홈페이지입니다.",
  email: null,
};

type Stored = {
  name: string | null;
  title: string | null;
  tagline: string | null;
  description: string | null;
  email: string | null;
};

/**
 * DB 의 값을 보기 값 위에 얹는다. 비운 칸(빈 글자 포함)은 보기 값이 채운다.
 *
 * 제목을 비우면 이름을 쓴다 — 이름만 적은 사람의 탭에 보기 값 제목
 * (「홍길동의 홈페이지」)이 뜨면 이상하다. DB 를 보지 않는 함수라 따로 시험한다.
 */
export function mergeSite(stored: Stored | null | undefined): SiteInfo {
  const pick = (v: string | null | undefined) => v?.trim() || null;
  const name = pick(stored?.name) ?? DEFAULT_SITE.name;
  return {
    name,
    title: pick(stored?.title) ?? (pick(stored?.name) ? name : DEFAULT_SITE.title),
    tagline: pick(stored?.tagline) ?? DEFAULT_SITE.tagline,
    description: pick(stored?.description) ?? DEFAULT_SITE.description,
    email: pick(stored?.email),
    url: site.url,
  };
}
