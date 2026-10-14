import path from "node:path";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, posts } from "@/lib/db";
import { site } from "@/lib/site";
import { siteConfig } from "@/lib/site/settings";
import { findIndexNowKey, indexNowHost, submitToIndexNow } from "./indexnow";

/**
 * 글을 내거나 고치면 IndexNow 로 그 주소를 알린다(MYH-257). 빙 · 네이버가 받는다.
 *
 * 응답을 붙잡지 않게 after() 로 돌린다. 저장한 뒤 그 글이 정말 모두에게
 * 보이는지 DB 에서 다시 본다 - 임시저장 · 나만 보기 · 예약은 알리지 않는다.
 * 예약한 글이 때가 되어 열릴 때는 알리지 않는다(sitemap 이 맡는다).
 * 실패해도 글 저장과는 상관없다. 기록만 남긴다
 */
export function announcePost(id: number | undefined) {
  if (!id) return;
  const host = indexNowHost(site.url);
  if (!host) return;

  after(async () => {
    try {
      // 환경설정 › 검색 등록 의 열쇠(.env 가 먼저), 없으면 public/<32자리>.txt
      const { indexnowKey } = await siteConfig();
      const key = findIndexNowKey(path.join(process.cwd(), "public"), indexnowKey ?? undefined);
      if (!key) return;
      const [post] = await getDb()
        .select({
          kind: posts.kind,
          published: posts.published,
          private: posts.private,
          publishedAt: posts.publishedAt,
        })
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);
      const open =
        post?.published &&
        !post.private &&
        post.publishedAt !== null &&
        post.publishedAt <= new Date();
      if (!open) return;

      const list = `${site.url}/${post.kind === "note" ? "notes" : "blog"}`;
      const result = await submitToIndexNow({ host, key, urls: [`${list}/${id}`, list] });
      console.info(`[indexnow] ${result.status} ${list}/${id}`);
    } catch (e) {
      console.warn(`[indexnow] 보내지 못했다 ${id}`, e);
    }
  });
}
