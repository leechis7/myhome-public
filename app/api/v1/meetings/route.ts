import { apiAuthorized, logApi, unauthorized } from "@/lib/api/auth";
import { listMeetings } from "@/lib/my-space/meetings";
import { hasSecretKey } from "@/lib/security/secret-crypto";

/**
 * 홈페이지 API · 회의(MYH-282). 토큰이 있어야 한다. 읽기 전용.
 *
 *   GET   최근 회의부터(?limit=20, 최대 100). 요약 · 대본은 /api/v1/meetings/{id}
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await apiAuthorized(request))) return unauthorized();
  if (!hasSecretKey()) return Response.json({ error: "no SECRETS_KEY" }, { status: 503 });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 20, 1), 100);
  logApi(request, `list ${limit}`);
  const rows = (await listMeetings()).slice(0, limit);
  return Response.json({
    meetings: rows.map((m) => ({
      id: m.id,
      title: m.title,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      source: m.source,
      chunks: m.chunks,
      hasSummary: m.hasSummary,
    })),
  });
}
