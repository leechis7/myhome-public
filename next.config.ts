import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// 화면에 보여줄 버전. 빌드 시점의 package.json 값을 박아 넣는다.
const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

/**
 * 보안 머리글(MYH-178). 운영은 앞의 Caddy 도 같은 것을 붙이지만, 앱과 DB 만으로
 * 띄우는 최소 구성(compose.yaml)에는 프록시가 없어 앱이 직접 붙인다. 값은 운영
 * Caddy 와 같다. HSTS 는 https 를 맡는 프록시의 일이라 여기 두지 않는다.
 *
 * Next.js 가 인라인 스크립트를 쓰므로 script-src 에 unsafe-inline 을 둔다.
 * 외부 도메인 스크립트는 막힌다.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "font-src 'self' https://cdn.jsdelivr.net data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // /projects 는 다시 화면이 됐다. 지나온 업무는 소개 안의 "수행 업무" 다.
  async redirects() {
    return [
      // 수행 업무를 고치는 자리는 소개 관리 안이다
      { source: "/admin/works", destination: "/admin", permanent: false },
    ];
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  experimental: {
    serverActions: {
      // 올리기와 붙이기가 모두 서버 액션으로 간다. 기본 1MB 로는 사진
      // 한 장도 못 올린다.
      //
      // **lib/upload-limits.ts 의 두 한도(각 90MB)보다 커야 한다.** 여기가
      // 더 낮으면 우리 검사에 닿기도 전에 Next 가 끊고 "Body exceeded Nmb
      // limit" 으로 터진다 — 안내 문구가 나올 자리가 없다(2026-09-19).
      //
      // **이 값은 서버 액션 전부에 걸린다.** 댓글처럼 아무나 쓰는 자리도
      // 같이 넓어진다는 뜻이다. 앱은 다 받은 뒤에야 글자 수를 셀 수 있으니
      // 여기서는 막을 수 없다 — 바깥에서 오는 POST 는 Caddy 가 1MB 에서
      // 자른다(infra/caddy/Caddyfile).
      bodySizeLimit: "100mb",
    },
  },
  // Dockerfile에서 쓰는 standalone 출력.
  // 실행에 필요한 파일과 node_modules만 .next/standalone 에 모아준다.
  output: "standalone",
  // OG 이미지에 쓰는 한글 폰트는 코드에서 경로로 읽기 때문에
  // 추적 대상에 잡히지 않는다. standalone 빌드에 직접 포함시킨다.
  outputFileTracingIncludes: {
    "/**": ["./assets/fonts/**"],
  },
  // dev 서버를 리버스 프록시 뒤에서 돌릴 때, 그 주소에서 오는 dev 리소스 /
  // HMR 요청을 허용한다. 목록에 없는 주소로 dev 서버에 접속하면 HMR 연결이
  // 막히고 하이드레이션이 끝나지 않는다.
  //
  // 주소는 설치마다 다르니 코드에 적지 않는다(MYH-170). ALLOWED_DEV_ORIGINS
  // 에 쉼표로 적는다(예: "dev.example.com,example.com"). 로컬 주소는 늘 넣는다.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    ...(process.env.ALLOWED_DEV_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ],
};

export default nextConfig;
