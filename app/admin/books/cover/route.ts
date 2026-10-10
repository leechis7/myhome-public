import { isAdmin } from "@/lib/security/auth";
import { fetchCover } from "@/lib/books/lookup";

export const dynamic = "force-dynamic";

/**
 * 책 찾기(MYH-226)의 후보 표지를 우리 서버가 받아 보여 준다.
 *
 * 바깥 그림 주소를 화면에 바로 쓰면 CSP(img-src)를 열어야 한다. 운영은 앞단
 * Caddy 가 CSP 를 따로 걸어 그것까지 고쳐야 하고, 보는 사람의 주소도 바깥에
 * 알려진다. 여기서 받아 넘기면 img-src 는 'self' 그대로다.
 *
 * 관리자만, 정해 둔 곳(lib/books/lookup.ts 의 COVER_HOSTS)의 그림만 받는다 -
 * 아무 주소나 서버가 대신 열어 주는 통로가 되지 않게.
 */
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("not found", { status: 404 });
  const address = new URL(request.url).searchParams.get("u") ?? "";
  const file = await fetchCover(address).catch(() => null);
  if (!file || file.type === "image/svg+xml") {
    return new Response("not found", { status: 404 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return new Response(bytes, {
    headers: {
      "content-type": file.type,
      "content-length": String(bytes.byteLength),
      "x-content-type-options": "nosniff",
      // 같은 표지를 다시 고를 때 또 받지 않게. 관리자 것이라 공유 캐시는 안 된다
      "cache-control": "private, max-age=86400",
    },
  });
}
