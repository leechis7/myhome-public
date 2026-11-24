import { apiAuthorized, logApi, unauthorized } from "@/lib/api/auth";
import { getMeeting } from "@/lib/my-space/meetings";
import { hasSecretKey } from "@/lib/security/secret-crypto";

/**
 * 홈페이지 API · 회의 하나(MYH-282). 토큰이 있어야 한다. 읽기 전용.
 *
 *   GET   제목 · 요약 · 대본(조각을 차례대로 이은 글) · 오픈클로에 맡긴 결과
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAuthorized(request))) return unauthorized();
  if (!hasSecretKey()) return Response.json({ error: "no SECRETS_KEY" }, { status: 503 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: "not found" }, { status: 404 });
  const m = await getMeeting(id);
  logApi(request, `get #${id}${m ? "" : " (없음)"}`);
  if (!m) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({
    id: m.id,
    title: m.title,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    source: m.source,
    summary: m.summary,
    transcript: m.chunks.map((c) => c.text).filter(Boolean).join("\n"),
    handoff: m.handoff,
  });
}
