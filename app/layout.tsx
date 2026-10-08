import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Analytics from "@/components/Analytics";
import FontSwap from "@/components/FontSwap";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";
import { getSite } from "@/lib/site-info";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const info = await getSite();
  return {
    // 상대 경로로 적은 이미지·링크의 기준 주소
    metadataBase: new URL(site.url),
    title: {
      default: info.title,
      template: `%s · ${info.name}`,
    },
    description: info.description,
    // 피드 리더가 <head>에서 찾을 수 있게 알린다. 이것은 모든 쪽이
    // 물려받아도 되는 것이다 — 피드는 사이트에 하나뿐이다.
    //
    // **canonical 은 여기에 두지 않는다.** 루트에 적으면 아래 모든 쪽이
    // 물려받아 /blog 도 /about 도 "나는 사실 홈페이지다" 라고 말하게 된다
    // (MYH-162). 쪽마다 lib/page-metadata.ts 로 제 것을 준다. 없는 편이
    // 틀린 것보다 낫다 — 없으면 구글이 그 주소를 그대로 쓴다.
    alternates: {
      types: {
        "application/rss+xml": [{ url: "/rss.xml", title: info.title }],
      },
    },
    // 여기 openGraph 는 **제 것을 안 준 쪽을 위한 바닥값**이다. 쪽에서
    // openGraph 를 주면 이것은 섞이지 않고 통째로 갈린다.
    openGraph: {
      type: "website",
      siteName: info.name,
      locale: "ko_KR",
      url: site.url,
      title: info.title,
      description: info.description,
      // 이미지 주소를 직접 지정한다. 파일 규약(opengraph-image.tsx)에 맡기면
      // dev 서버가 실제 접속 주소(localhost:40000)를 박아 넣어서
      // 다른 기기에서 미리보기 이미지를 가져오지 못한다.
      images: [
        {
          url: `${site.url}/og`,
          width: 1200,
          height: 630,
          alt: info.title,
        },
      ],
    },
    // 홈 화면에 추가했을 때 앱처럼 열리게 한다
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: info.name,
      statusBarStyle: "black-translucent",
    },
    // Search Console 소유 확인용. 값이 없으면 태그가 나가지 않는다.
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
    twitter: {
      card: "summary_large_image",
      title: info.title,
      description: info.description,
      images: [`${site.url}/og`],
    },
  };
}

/** Pretendard 한글 웹폰트 (동적 서브셋) */
const FONT_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

/**
 * 첫 페인트 전에 저장된 테마를 적용해 화면 깜빡임(FOUC)을 막는다.
 * 저장값이 없으면 속성을 붙이지 않아 OS 설정을 그대로 따른다.
 */
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

/** 주소창·상태바 색. 다크/라이트에 따라 다르게 준다 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 폰트를 받아올 곳에 미리 연결해 둔다. 연결을 트고 TLS 를 맺는
            시간(0.1초쯤)을 글자가 필요해지기 전에 미리 치른다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        {/* 첫 그림을 붙잡지 않게 media="print" 로 받는다. 다 받으면
            FontSwap 이 media 를 all 로 바꿔 화면에 붙인다. 스크립트가 막혀
            있으면 인쇄할 때만 쓰이므로, noscript 로 그때는 그냥 붙인다. */}
        <link rel="preload" as="style" href={FONT_CSS} />
        <link id="font-css" rel="stylesheet" href={FONT_CSS} media="print" />
        <noscript>
          <link rel="stylesheet" href={FONT_CSS} />
        </noscript>
        <Analytics />
      </head>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {/* 폰트 CSS 를 다 받은 뒤 화면에 붙인다 */}
        <FontSwap />
        <Header />
        <main className="flex-1 py-14">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
