import { isAdmin } from "@/lib/security/auth";

/**
 * Caddy 의 forward_auth 가 `/grafana/*` 요청마다 여기에 먼저 묻는다.
 * 2xx 면 요청이 Grafana 로 넘어가고, 401 이면 그 응답이 그대로 브라우저로 간다.
 *
 * Grafana 자체 로그인은 꺼져 있고(익명 접속을 관리자 권한으로) 컨테이너는
 * 127.0.0.1:53000 에만 묶여 있다. 바깥에서 들어오는 문은 이것 하나뿐이다.
 *
 * `WWW-Authenticate` 는 절대 붙이지 않는다 — 붙이면 브라우저가 basic auth
 * 비밀번호 창을 띄우고, iframe 안에서는 그 창이 뜨지 않아 흰 화면이 된다.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return new Response("관리자만 볼 수 있습니다.\n", {
      status: 401,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(null, { status: 200 });
}
