import { revalidatePath } from "next/cache";
import { apiAuthorized, logApi, unauthorized } from "@/lib/api/auth";
import { getDb, posts } from "@/lib/db";
import { noteTitle } from "@/lib/posts/notes";

/**
 * 홈페이지 API · 글 초안(MYH-247). 임시저장으로만 넣는다 - 공개는 사람이 관리
 * 화면에서 한다. 고치기 · 지우기는 없다.
 *
 *   POST  { kind: "post" | "note", title?, content, tags?: string[] }
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await apiAuthorized(request))) return unauthorized();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = body?.kind === "note" ? "note" : "post";
  const content = String(body?.content ?? "").trim().slice(0, 200_000);
  const title = String(body?.title ?? "").trim().slice(0, 200);
  if (!content) return Response.json({ error: "content 가 필요합니다" }, { status: 400 });
  if (kind === "post" && !title) return Response.json({ error: "블로그 글은 title 이 필요합니다" }, { status: 400 });
  const tags = Array.isArray(body?.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
    : [];
  const [row] = await getDb()
    .insert(posts)
    // 짧은 글의 제목은 본문 첫 줄이다(관리 화면과 같게)
    .values({ kind, title: kind === "note" ? noteTitle(content) : title, content, tags, published: false })
    .returning({ id: posts.id });
  revalidatePath(kind === "note" ? "/admin/notes" : "/admin/posts");
  logApi(request, `${kind} draft #${row.id}`);
  return Response.json({ id: row.id, kind, published: false }, { status: 201 });
}
