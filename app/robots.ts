import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// 주소는 실행 때 읽는다(SITE_URL). 빌드 때 미리 만들면 빌드한 곳의 주소가 박힌다
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // dev 인스턴스는 운영과 같은 내용을 서비스하므로 통째로 색인에서 제외한다.
  // 그대로 두면 중복 문서로 잡히고 검색 결과에 dev 주소가 뜰 수 있다.
  if (isDevHost(site.url)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 관리 화면은 색인할 이유가 없다
      disallow: "/admin",
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}

function isDevHost(url: string) {
  try {
    return new URL(url).hostname.startsWith("dev.");
  } catch {
    return false;
  }
}
