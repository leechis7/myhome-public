import { unstable_cache, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, siteSettings } from "@/lib/db";
import { mergeSite, type SiteInfo } from "@/lib/site";

/** 사이트 정보 캐시의 이름. 고친 뒤 invalidateSite 로 비운다 */
const SITE_TAG = "site";

/**
 * DB 의 사이트 정보를 읽는다. 캐시를 씌운다 — 모든 화면이 부른다.
 *
 * **DB 에 닿지 못하면 보기 값으로 넘어간다.** 이미지를 만들 때(next build)는
 * DB 가 없는데, 그때 메타데이터를 미리 만드는 쪽이 있으면 빌드가 깨진다.
 * 요청 때는 DB 가 있으니 제 값이 나온다.
 *
 * 고치면 비운다. psql 로 손댄 것은 비울 길이 없어 한 시간이 지나면 새로 읽는다.
 */
const readSite = unstable_cache(
  async () => {
    const [row] = await getDb()
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1);
    return row ?? null;
  },
  ["site"],
  { tags: [SITE_TAG], revalidate: 3600 },
);

/** 화면이 쓰는 사이트 정보. 빈 칸은 보기 값으로 채워져 있다 */
export async function getSite(): Promise<SiteInfo> {
  try {
    return mergeSite(await readSite());
  } catch {
    return mergeSite(null);
  }
}

/** 고치는 화면이 쓰는 날 값. 캐시를 거치지 않는다 */
export async function getStoredSite() {
  const [row] = await getDb()
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  return row ?? null;
}

/** 사이트 정보 캐시를 비운다. 고친 서버 액션에서 부른다 */
export function invalidateSite() {
  updateTag(SITE_TAG);
}
