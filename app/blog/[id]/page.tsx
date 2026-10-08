import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import AdminLinkButton from "@/components/admin/AdminLinkButton";
import AttachmentList from "@/components/blog/AttachmentList";
import JsonLd from "@/components/JsonLd";
import AdjacentPosts from "@/components/blog/AdjacentPosts";
import RelatedPosts from "@/components/blog/RelatedPosts";
import SeriesBox from "@/components/blog/SeriesBox";
import Comments from "@/components/blog/Comments";
import TableOfContents from "@/components/blog/TableOfContents";
import ViewCounter from "@/components/blog/ViewCounter";
import Markdown from "@/components/blog/Markdown";
import { listAttachments } from "@/lib/attachments";
import { isAdmin } from "@/lib/auth";
import { extractHeadings } from "@/lib/headings";
import { articleJsonLd } from "@/lib/jsonld";
import { needsBadge, stateLabel } from "@/lib/post-state";
import {
  findAdjacentPosts,
  findRelatedPosts,
  findSeries,
  seriesPosition,
  findPublishedPost,
  formatDate,
  listedAt,
  readingMinutes,
  revisionInfo,
} from "@/lib/posts";
import { site } from "@/lib/site";
import { getSite } from "@/lib/site-info";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/blog/[id]">): Promise<Metadata> {
  const { id } = await params;
  const admin = await isAdmin();
  const post = await findPublishedPost(Number(id), "post", admin);
  // 지워진 글 주소가 구글에 남아 있으면 404 가 검색 결과에 뜬다.
  // 색인에 담길 자리가 아니다(MYH-162).
  if (!post)
    return { title: "글을 찾을 수 없습니다", robots: { index: false, follow: false } };

  // 나만 보는 글은 검색엔진에 알리지 않는다. 주소를 알아도 남은 못 보지만,
  // 색인에 제목이 남을 자리조차 두지 않는다.
  if (post.private) {
    return { title: post.title, robots: { index: false, follow: false } };
  }

  const url = `/blog/${post.id}`;
  // 이미지 주소는 절대 주소로 직접 지정한다. 파일 규약에 맡기면 dev 서버가
  // 실제 접속 주소(localhost:40000)를 박아 넣어 외부에서 미리보기가 깨진다.
  const image = `${site.url}${url}/og`;

  return {
    title: post.title,
    description: post.summary ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.summary ?? undefined,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: [...post.tags],
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary ?? undefined,
      images: [image],
    },
  };
}

export default async function PostPage({
  params,
  searchParams,
}: PageProps<"/blog/[id]">) {
  const { id } = await params;
  const admin = await isAdmin();
  const post = await findPublishedPost(Number(id), "post", admin);
  if (!post) notFound();

  const query = await searchParams;
  const commentError = typeof query.ce === "string" ? query.ce : undefined;
  const files = await listAttachments(post.id);
  const headings = extractHeadings(post.content);
  const minutes = readingMinutes(post.content);
  const revision = revisionInfo(post);
  // 앞뒤 글도 목록과 같은 기준(개정일이 있으면 그것)으로 찾는다
  const listed = listedAt(post);
  const { previous, next } = listed
    ? await findAdjacentPosts(post.id, listed, "post", admin)
    : { previous: undefined, next: undefined };
  // 연재(MYH-187). 이 글이 보이는 사람에게 보이는 편만 센다
  const series = post.seriesCode
    ? await findSeries(post.seriesCode, admin)
    : null;
  const position = series ? seriesPosition(series.episodes, post.id) : null;
  // 관련 글(MYH-188). 같은 태그가 많은 공개 글
  const related = await findRelatedPosts(post);

  return (
    <Container>
      <JsonLd data={articleJsonLd(await getSite(), post)} />

      <article>
        <p className="flex flex-wrap gap-x-3 text-sm text-muted">
          <time dateTime={post.publishedAt?.toISOString()}>
            {formatDate(post.publishedAt)}
          </time>
          {/* 개정은 제목 아래 버전 줄에서 밝힌다. 버전 없이 손만 본 글의
              "고침" 만 여기 남긴다. 낸 직후 30분 안쪽은 밝히지 않는다. */}
          {revision && !post.version ? (
            <time dateTime={revision.at.toISOString()}>{revision.label}</time>
          ) : null}
          <span>{`읽는 데 ${minutes}분`}</span>
          <span>{`조회 ${post.viewCount}`}</span>
        </p>
        {/* 나만 보는 글 · 예약 글임을 먼저 알린다. 공개된 줄 알고 쓰면 안 된다 */}
        {needsBadge(post) ? (
          <p className="mt-3">
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
              {stateLabel(post)}
            </span>
          </p>
        ) : null}
        {/* 고치기는 제목과 같은 줄 오른쪽에. 관리자에게만 보인다 */}
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <AdminLinkButton href={`/admin/posts/${post.id}`} label="고치기" />
        </div>
        {series && position && position.total > 1 ? (
          <p className="mt-2 text-sm text-muted">
            {`연재 · ${series.name} (${position.number}/${position.total})`}
          </p>
        ) : null}
        {/* 문서 버전은 제목 바로 아래. 몇 판을 읽고 있는지가 제목만큼 중요한
            글이 있다. 개정일도 여기서 같이 밝힌다. */}
        {post.version ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="rounded border border-border px-2 py-0.5 text-xs tabular-nums">
              {`버전 ${post.version}`}
            </span>
            {revision ? (
              <time dateTime={revision.at.toISOString()}>{revision.label}</time>
            ) : null}
          </p>
        ) : null}
        {post.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60 transition-colors hover:text-foreground"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <TableOfContents headings={headings} />

        <div className="mt-10">
          <Markdown>{post.content}</Markdown>
        </div>
      </article>

      <AttachmentList rows={files} />

      <ViewCounter postId={post.id} />

      {series && position ? (
        <SeriesBox
          name={series.name}
          episodes={series.episodes}
          current={post.id}
        />
      ) : null}

      <RelatedPosts rows={related} />

      <AdjacentPosts previous={previous} next={next} />

      <Comments postId={post.id} errorCode={commentError} />

      <p className="mt-16 border-t border-border pt-6 text-sm">
        <Link
          href="/blog"
          className="text-foreground/60 transition-colors hover:text-foreground"
        >
          ← 글 목록으로
        </Link>
      </p>
    </Container>
  );
}
