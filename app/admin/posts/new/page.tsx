import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import PostForm from "@/components/admin/PostForm";
import { isAdmin } from "@/lib/security/auth";
import { listCodes, SERIES } from "@/lib/codes";
import { postErrors } from "../errors";

export const metadata: Metadata = {
  title: "새 글",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewPostPage({
  searchParams,
}: PageProps<"/admin/posts/new">) {
  if (!(await isAdmin())) redirect("/admin");

  const params = await searchParams;
  const code = typeof params.e === "string" ? params.e : undefined;

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">새 글</h1>
      {code ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {postErrors[code] ?? "저장하지 못했습니다."}
        </p>
      ) : null}
      <div className="mt-8">
        <PostForm series={await listCodes(SERIES, { all: true })} />
      </div>
    </Container>
  );
}
