import { ImageResponse } from "next/og";
import { loadOgFont } from "@/lib/og";
import { getSite } from "@/lib/site-info";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// 글자는 사이트 이름의 첫 글자다(MYH-169). 빌드 때 미리 그리면 보기 값이 박힌다
export const dynamic = "force-dynamic";

/** 홈 화면에 추가했을 때 쓰는 아이콘. iOS는 모서리를 알아서 깎으므로 꽉 채운다. */
export default async function AppleIcon() {
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
          fontSize: 116,
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
