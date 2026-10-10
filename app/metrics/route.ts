import { headers } from "next/headers";
import { isAdmin } from "@/lib/security/auth";
import { renderMetrics } from "@/lib/ops/metrics";
import { isFromOurSide } from "@/lib/security/private-ip";

export const dynamic = "force-dynamic";

/**
 * Prometheus 가 긁어 가는 자리.
 *
 * 문은 두 겹이다. 앞은 Caddy 다 — 공개 도메인의 /metrics 는 404 로 막고,
 * 지표 전용 포트(59201)만 사설 대역에서 답한다. 여기서 한 겹 더 본다:
 * 사설 대역에서 온 요청이거나 관리자로 로그인한 경우만 답한다. Caddy
 * 설정이 어긋나도 남의 브라우저에는 아무것도 주지 않게 하려는 것이다.
 */
export async function GET() {
  const forwarded = (await headers()).get("x-forwarded-for");

  if (!isFromOurSide(forwarded) && !(await isAdmin())) {
    // 없는 주소처럼 답한다. 있다는 것조차 알릴 이유가 없다.
    return new Response("Not Found", { status: 404 });
  }

  const { body, contentType } = await renderMetrics();
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      // 색인될 자리가 아니다
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
