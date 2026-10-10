import type { SiteInfo } from "@/lib/site";

/**
 * 검색엔진이 읽는 구조화 데이터.
 * 화면에 보이지 않고 <script type="application/ld+json">으로만 들어간다.
 */
export function websiteJsonLd(site: SiteInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.title,
    url: site.url,
    description: site.description,
    inLanguage: "ko-KR",
    author: { "@type": "Person", name: site.name },
  };
}

export function personJsonLd(site: SiteInfo, headline?: string | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    url: site.url,
    email: site.email ?? undefined,
    description: headline ?? site.description,
  };
}

export function articleJsonLd(
  site: SiteInfo,
  post: {
  id: number;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  tags: readonly string[];
  },
) {
  const url = `${site.url}/blog/${post.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary ?? undefined,
    url,
    mainEntityOfPage: url,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    keywords: post.tags.join(", ") || undefined,
    image: `${url}/og`,
    inLanguage: "ko-KR",
    author: { "@type": "Person", name: site.name, url: site.url },
    publisher: { "@type": "Person", name: site.name, url: site.url },
  };
}
