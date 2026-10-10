import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import SecretForm from "@/components/admin/SecretForm";
import { isAdmin } from "@/lib/security/auth";
import { hasSecretKey } from "@/lib/security/secret-crypto";

export const metadata: Metadata = {
  title: "비밀글 쓰기",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewSecretPage({
  searchParams,
}: PageProps<"/admin/secrets/new">) {
  if (!(await isAdmin()) || !hasSecretKey()) notFound();

  const query = await searchParams;
  const missing = query.e === "required";

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">비밀글 쓰기</h1>

      {missing ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          제목과 본문을 모두 적어야 합니다.
        </p>
      ) : null}

      <div className="mt-8">
        <SecretForm />
      </div>
    </Container>
  );
}
