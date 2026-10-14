import { siteConfig } from "@/lib/site/settings";

/**
 * IndexNow 열쇠 파일(MYH-257). next.config.ts 가 /<열쇠>.txt 를 이리로 넘긴다.
 * 환경설정 › 검색 등록 의 열쇠(.env 의 INDEXNOW_KEY 가 먼저)와 같을 때만 그 열쇠를
 * 글로 돌려주고, 아니면 없는 주소다. 검색엔진은 이 파일을 보고 알림을 보낸 곳이
 * 정말 이 사이트인지 확인한다
 */
export async function GET(_request: Request, { params }: RouteContext<"/indexnow/[key]">) {
  const { key } = await params;
  const { indexnowKey } = await siteConfig();
  if (!indexnowKey || key !== indexnowKey) return new Response("Not Found", { status: 404 });
  return new Response(indexnowKey, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
