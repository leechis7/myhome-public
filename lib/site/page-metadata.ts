import type { Metadata } from "next";
import { site } from "@/lib/site";
import { getSite } from "@/lib/site/info";

/**
 * 쪽 하나의 메타데이터.
 *
 * **canonical 과 openGraph 는 쪽마다 준다.** 루트 레이아웃(`app/layout.tsx`)에
 * 적으면 아래 모든 쪽이 물려받는데, 그러면 `/blog` 도 `/about` 도 「나는 사실
 * 홈페이지다」 라고 말하게 된다(MYH-162). 내용이 다른 쪽들이 같은 canonical 을
 * 들고 있으면 구글은 그 말을 믿지 않고 스스로 대표를 고른다 — 그 바람에 검색
 * 결과에 글 제목 대신 「블로그 · 사이트 이름」 이 나왔다.
 *
 * openGraph 는 **통째로 갈린다.** 쪽에서 `openGraph` 를 주면 루트 것이
 * 섞이지 않고 사라진다(`siteName`·`locale` 까지). 그래서 여기서 다 적는다.
 *
 * 글 한 편(`/blog/[id]`)과 짧은 글은 제목과 그림이 저마다 달라 제 손으로
 * 만든다. 이 함수는 이름이 고정된 쪽들 — 홈·소개·프로젝트·연락처·블로그
 * 목록·짧은 글 목록 — 을 위한 것이다.
 */
export async function pageMetadata({
  title,
  description,
  path,
}: {
  /** 화면 제목. 루트의 template 이 뒤에 「· 사이트 이름」 을 붙여 준다 */
  title: string;
  description: string;
  /** 이 쪽의 주소. `/` 로 시작하는 경로다 */
  path: string;
}): Promise<Metadata> {
  const info = await getSite();
  // og:title 에는 template 이 닿지 않는다. 「블로그」 한 마디만 카드에 뜨면
  // 어느 집 블로그인지 알 수 없으니 여기서 직접 붙인다.
  const 카드제목 = path === "/" ? info.title : `${title} · ${info.name}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: info.name,
      locale: "ko_KR",
      url: path,
      title: 카드제목,
      description,
      // 이미지 주소는 절대 주소로 직접 지정한다. 파일 규약에 맡기면 dev
      // 서버가 실제 접속 주소(localhost:40002)를 박아 넣어 밖에서 깨진다.
      images: [
        {
          url: `${site.url}/og`,
          width: 1200,
          height: 630,
          alt: 카드제목,
        },
      ],
    },
  };
}
