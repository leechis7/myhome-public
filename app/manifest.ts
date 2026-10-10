import type { MetadataRoute } from "next";
import { getSite } from "@/lib/site/info";

/**
 * 홈 화면에 추가했을 때 앱처럼 열리게 한다.
 * 아이콘은 /icon, /apple-icon 이 만들어 준다.
 */
// 사이트 정보를 DB 에서 읽는다. 빌드 때 미리 만들면 보기 값이 박힌다
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const info = await getSite();
  return {
    name: info.title,
    short_name: info.name,
    description: info.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "ko",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
