import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFont } from "@/lib/site/og";
import { findPublishedPost, formatDate } from "@/lib/posts";
import { site } from "@/lib/site";
import { getSite } from "@/lib/site/info";

export const dynamic = "force-dynamic";

/** 글별 OG 이미지. 일반 라우트로 둔 이유는 app/og/route.tsx 주석 참고. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const info = await getSite();
  const { id } = await params;
  const [post, font] = await Promise.all([
    findPublishedPost(Number(id)),
    loadOgFont(),
  ]);

  const title = post?.title ?? "글을 찾을 수 없습니다";
  const meta = [post ? formatDate(post.publishedAt) : null, ...(post?.tags ?? [])]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily: "Nanum",
        }}
      >
        <div style={{ fontSize: 30, color: "#9ca3af" }}>
          {`${info.name}의 블로그`}
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 72,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: "auto", fontSize: 30, color: "#6b7280" }}>
          {meta || new URL(site.url).host}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Nanum", data: font, style: "normal", weight: 700 }],
    },
  );
}
