import { runChat } from "@/lib/ai/chat-run";
import { isAdmin } from "@/lib/security/auth";

/**
 * AI 대화창이 묻는 곳(MYH-274). 서버 액션은 보고 있는 화면의 주소로 가서, 블로그
 * 같은 화면에서 「+」 창으로 그림을 붙이면 앞단(Caddy)의 1MB 제한에 걸렸다. 대화는
 * 늘 이 주소로 보낸다 - Caddy 가 /admin/ai/* 는 크게 받는다.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { messages?: unknown; engine?: unknown } | null;
  const engine = typeof body?.engine === "string" && body.engine ? body.engine : undefined;
  return Response.json(await runChat(body?.messages, engine));
}
