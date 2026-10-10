import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import Markdown from "@/components/blog/Markdown";
import { isAdmin } from "@/lib/security/auth";
import { formatDate } from "@/lib/posts";
import { formatBytes } from "@/lib/uploads/limits";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { findSecret, listSecretAttachments } from "@/lib/my-space/secrets";

export const metadata: Metadata = {
  title: "비밀글",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 비밀글 보기.
 *
 * 고치기와 나눈 이유 — 일기는 쓰는 것보다 읽는 일이 많다. 목록에서 누르면
 * 편집기가 아니라 읽을 수 있는 화면이 나오는 편이 낫다.
 */
export default async function SecretPage({
  params,
}: PageProps<"/admin/secrets/[id]">) {
  if (!(await isAdmin()) || !hasSecretKey()) notFound();

  const { id } = await params;
  const secretId = Number(id);
  if (!Number.isInteger(secretId)) notFound();

  const secret = await findSecret(secretId);
  if (!secret) notFound();

  const files = await listSecretAttachments(secret.id);
  const locked = secret.title === null || secret.content === null;

  return (
    <Container>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {secret.title === null ? "열 수 없음" : secret.title || "제목 없음"}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/secrets/${secret.id}/edit`}
            className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
          >
            고치기
          </Link>
          <Link
            href="/admin/secrets"
            className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
          >
            목록
          </Link>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <time
          dateTime={secret.writtenAt.toISOString()}
          className="text-sm text-faint"
        >
          {formatDate(secret.writtenAt)}
        </time>
        {secret.tags.map((one) => (
          <Link
            key={one}
            href={`/admin/secrets?tag=${encodeURIComponent(one)}`}
            className="rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60 transition-colors hover:bg-foreground/10"
          >
            {one}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        {locked ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            지금 열쇠로는 열 수 없습니다. 쓸 때 쓰던 열쇠를 넣어야 읽힙니다.
          </p>
        ) : (
          <Markdown>{secret.content as string}</Markdown>
        )}
      </div>

      {files.length > 0 ? (
        <section className="mt-10 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">첨부파일</p>
          <ul className="mt-3 space-y-2">
            {files.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center gap-3">
                {file.filename ? (
                  <a
                    href={`/admin/secrets/files/${file.id}`}
                    className="text-sm underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
                  >
                    {file.filename}
                  </a>
                ) : (
                  <span className="text-sm text-red-600 dark:text-red-400">
                    열 수 없음
                  </span>
                )}
                <span className="text-xs text-faint">
                  {formatBytes(file.size)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
