import { revalidatePath } from "next/cache";
import { apiAuthorized, logApi, unauthorized } from "@/lib/api/auth";
import { addMemo, listMemos } from "@/lib/my-space/memos";
import { hasSecretKey } from "@/lib/security/secret-crypto";

/**
 * 홈페이지 API · 메모(MYH-247). 토큰이 있어야 한다.
 *
 *   GET   최근 메모(?limit=20, 최대 100)
 *   POST  { text }
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await apiAuthorized(request))) return unauthorized();
  if (!hasSecretKey()) return Response.json({ error: "no SECRETS_KEY" }, { status: 503 });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 20, 1), 100);
  logApi(request, `list ${limit}`);
  const rows = (await listMemos()).slice(0, limit);
  return Response.json({
    memos: rows.map((m) => ({ id: m.id, text: m.content, source: m.source, createdAt: m.createdAt })),
  });
}

export async function POST(request: Request) {
  if (!(await apiAuthorized(request))) return unauthorized();
  if (!hasSecretKey()) return Response.json({ error: "no SECRETS_KEY" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = String(body?.text ?? "").trim().slice(0, 8000);
  if (!text) return Response.json({ error: "text 가 필요합니다" }, { status: 400 });
  const id = await addMemo(text, "api");
  revalidatePath("/admin/memos");
  logApi(request, `add #${id}`);
  return Response.json({ id }, { status: 201 });
}
