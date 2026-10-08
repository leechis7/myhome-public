import { listAllPublishedPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { getSite } from "@/lib/site-info";

export const dynamic = "force-dynamic";

/** XML에 그대로 넣을 수 없는 문자를 바꾼다 */
function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const info = await getSite();
  const posts = await listAllPublishedPosts();
  const now = new Date();

  const items = posts
    .map((post) => {
      // 짧은 글도 함께 나간다. 주소가 다르니 종류를 본다.
      const url = `${site.url}/${post.kind === "note" ? "notes" : "blog"}/${post.id}`;
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        post.summary
          ? `      <description>${escapeXml(post.summary)}</description>`
          : null,
        post.publishedAt
          ? `      <pubDate>${post.publishedAt.toUTCString()}</pubDate>`
          : null,
        ...post.tags.map(
          (tag) => `      <category>${escapeXml(tag)}</category>`,
        ),
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(info.title)}</title>
    <link>${site.url}</link>
    <description>${escapeXml(info.description)}</description>
    <language>ko</language>
    <lastBuildDate>${(posts.at(0)?.publishedAt ?? now).toUTCString()}</lastBuildDate>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      // 피드 리더가 자주 긁어가므로 잠깐 캐시한다
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });
}
