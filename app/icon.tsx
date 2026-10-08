import { ImageResponse } from "next/og";
import { loadOgFont } from "@/lib/og";
import { getSite } from "@/lib/site-info";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// 글자는 사이트 이름의 첫 글자다(MYH-169). 빌드 때 미리 그리면 보기 값이 박힌다
export const dynamic = "force-dynamic";

/**
 * 파비콘. 시스템 폰트에 기대지 않도록 저장소에 넣어둔 폰트로 글자를 그린다.
 */
export default async function Icon() {
  const font = await loadOgFont();
  // 첫 글자 하나. 한글 한 자, 영문이면 대문자 한 자
  const letter = Array.from((await getSite()).name)[0]?.toUpperCase() ?? "·";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          color: "#ffffff",
          fontFamily: "Nanum",
          fontSize: 42,
          borderRadius: 14,
        }}
      >
        {letter}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Nanum", data: font, style: "normal", weight: 700 }],
    },
  );
}
