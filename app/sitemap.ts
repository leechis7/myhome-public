import type { MetadataRoute } from "next";
import { listAllPublishedPosts } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listAllPublishedPosts();
  // 목록 화면의 lastmod. 글 하나만 고쳐도 목록은 달라지므로 가장 최근
  // 수정 시각을 쓴다.
  const latest =
    posts
      .map((post) => post.updatedAt)
      .sort((a, b) => b.getTime() - a.getTime())
      .at(0) ?? new Date();

  const staticPages: MetadataRoute.Sitemap = [
    // 루트도 끝에 / 를 붙인다. 검사 도구가 경로 없는 주소를 문제 삼는 경우가 있다
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/resume`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/projects`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/notes`, changeFrequency: "weekly", priority: 0.7 },
    {
      url: `${site.url}/blog`,
      lastModified: latest,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    { url: `${site.url}/books`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${site.url}/guestbook`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  return [
    ...staticPages,
    // 블로그 글과 짧은 글이 한 테이블에 있다. 주소가 다르므로 종류를 본다.
    ...posts.map((post) => ({
      url: `${site.url}/${post.kind === "note" ? "notes" : "blog"}/${post.id}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
