import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import Container from "@/components/Container";
import PostForm from "@/components/admin/PostForm";
import { listAttachments, listPostImages } from "@/lib/attachments";
import { isAdmin } from "@/lib/auth";
import { listCodes, SERIES } from "@/lib/codes";
import { getDb, posts } from "@/lib/db";
import { postErrors } from "../errors";

export const metadata: Metadata = {
  title: "글 수정",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: PageProps<"/admin/posts/[id]">) {
  if (!(await isAdmin())) redirect("/admin");

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  // 번호만 보고 열면 짧은 글 번호로 블로그 편집기가 열린다. 짧은 글은
  // 제목도 주소도 다르게 다루므로 여기서 고치면 안 된다 - 없는 것으로 본다.
  const rows = await getDb()
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.kind, "post")))
    .limit(1);
  const post = rows.at(0);
  if (!post) notFound();

  const query = await searchParams;
  const code = typeof query.e === "string" ? query.e : undefined;
  const saved = query.ok === "1";

  return (
    <Container>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">글 수정</h1>
        <Link
          href="/admin/posts"
          className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
        >
          목록
        </Link>
      </div>

      {code ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {postErrors[code] ?? "저장하지 못했습니다."}
        </p>
      ) : null}
      {saved && !code ? (
        <p className="mt-4 rounded-lg border border-border px-4 py-3 text-sm text-foreground/60">
          저장했습니다.
        </p>
      ) : null}

      <div className="mt-8">
        <PostForm
          post={post}
          attachments={await listAttachments(post.id)}
          images={await listPostImages(post.id)}
          series={await listCodes(SERIES, { all: true })}
        />
      </div>
    </Container>
  );
}
