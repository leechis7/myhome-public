import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import SecretForm from "@/components/admin/SecretForm";
import { isAdmin } from "@/lib/security/auth";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import {
  findSecret,
  listSecretAttachments,
  listSecretImages,
} from "@/lib/my-space/secrets";

export const metadata: Metadata = {
  title: "비밀글 고치기",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditSecretPage({
  params,
  searchParams,
}: PageProps<"/admin/secrets/[id]/edit">) {
  if (!(await isAdmin()) || !hasSecretKey()) notFound();

  const { id } = await params;
  const secretId = Number(id);
  if (!Number.isInteger(secretId)) notFound();

  const secret = await findSecret(secretId);
  if (!secret) notFound();

  // 열쇠가 맞지 않으면 고치게 두지 않는다. 그대로 저장하면 못 읽는 옛 글을
  // 빈 글로 덮어쓰게 된다.
  if (secret.title === null || secret.content === null) {
    return (
      <Container>
        <h1 className="text-2xl font-semibold tracking-tight">비밀글</h1>
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          지금 열쇠로는 이 글을 열 수 없습니다. 쓸 때 쓰던 열쇠를 넣어야 합니다.
          지금 고치면 내용이 사라지므로 폼을 보여주지 않습니다.
        </p>
      </Container>
    );
  }

  const query = await searchParams;
  const error =
    query.e === "required"
      ? "제목과 본문을 모두 적어야 합니다."
      : query.e === "too-big"
        ? "파일이 너무 큽니다."
        : null;

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">비밀글 고치기</h1>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        <SecretForm
          secret={{
            id: secret.id,
            title: secret.title,
            content: secret.content,
            tags: secret.tags,
            writtenAt: secret.writtenAt,
          }}
          attachments={await listSecretAttachments(secret.id)}
          images={await listSecretImages(secret.id)}
        />
      </div>
    </Container>
  );
}
