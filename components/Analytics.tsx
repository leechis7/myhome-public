import { site } from "@/lib/site";

/**
 * 방문자 통계(umami) 추적 스크립트.
 *
 * 스크립트와 수집 주소를 우리 도메인(/stats/...)에서 준다. Caddy가 통계
 * 서버로 넘긴다. 통계 서버 주소를 그대로 쓰면 CSP를 풀어야 하고 광고
 * 차단기에도 걸린다.
 *
 * UMAMI_WEBSITE_ID 가 없으면 아무것도 내보내지 않는다. 개발 인스턴스와
 * 로컬에서는 설정하지 않으므로 통계에 섞이지 않는다.
 *
 * NEXT_PUBLIC_ 접두어를 쓰지 않는다. 그 접두어가 붙으면 빌드할 때 값이
 * 박혀 버려서, 이미지를 다시 만들지 않고는 바꿀 수 없다.
 */
export default function Analytics() {
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  if (!websiteId) return null;

  // 이 도메인에서 열었을 때만 센다. 미리보기 주소나 IP로 직접 들어온
  // 요청이 섞이지 않는다.
  const domain = new URL(site.url).host;

  return (
    <script
      defer
      src="/stats/script.js"
      data-website-id={websiteId}
      data-domains={domain}
    />
  );
}
