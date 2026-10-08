import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFont } from "@/lib/og";
import { site } from "@/lib/site";
import { getSite } from "@/lib/site-info";

/**
 * 사이트 대표 OG 이미지.
 *
 * 파일 규약(opengraph-image.tsx) 대신 일반 라우트로 둔다. 파일 규약은 주소를
 * Next가 만들어 주는데, dev 서버에서는 실제 접속 주소(localhost:40000)를 박아
 * 넣어서 다른 기기에서 미리보기 이미지를 가져오지 못한다.
 */
// 사이트 정보를 DB 에서 읽는다. 빌드 때 미리 만들면 보기 값이 박힌다
export const dynamic = "force-dynamic";

export async function GET() {
  const info = await getSite();
  const font = await loadOgFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily: "Nanum",
        }}
      >
        <div style={{ fontSize: 88, letterSpacing: "-0.02em" }}>
          {info.name}
        </div>
        <div style={{ marginTop: 24, fontSize: 40, color: "#9ca3af" }}>
          {info.description}
        </div>
        <div style={{ marginTop: "auto", fontSize: 30, color: "#6b7280" }}>
          {new URL(site.url).host}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Nanum", data: font, style: "normal", weight: 700 }],
      headers: { "cache-control": "public, max-age=3600, s-maxage=3600" },
    },
  );
}
