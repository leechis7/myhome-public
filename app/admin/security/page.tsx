import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import PasskeyList from "@/components/admin/PasskeyList";
import PasskeyRegister from "@/components/admin/PasskeyRegister";
import PasswordForm from "@/components/admin/PasswordForm";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-limits";
import { isAdmin } from "@/lib/auth";
import { listPasskeys } from "@/lib/passkeys";

export const metadata: Metadata = {
  title: "암호설정",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  if (!(await isAdmin())) redirect("/admin");

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">암호설정</h1>

      <section className="mt-10">
        <h2 className="mb-2 text-lg font-semibold">비밀번호</h2>
        <p className="mb-5 text-sm text-muted">
          되돌릴 수 없는 형태로 DB에 저장됩니다. 잊으면 다시 알아낼 방법이
          없으니 적어 두세요.
        </p>
        <PasswordForm minLength={MIN_PASSWORD_LENGTH} />
      </section>

      <section className="mt-14">
        <h2 className="mb-2 text-lg font-semibold">패스키</h2>
        <p className="mb-5 text-sm text-muted">
          얼굴·지문으로 들어옵니다. 들어올 기기마다 한 번씩 등록하세요. 기기가
          하나뿐이면 그것을 잃었을 때 못 들어옵니다. 비밀번호는 그대로 쓸 수
          있으니 막히면 그쪽으로 들어오세요.
        </p>
        <div className="max-w-md space-y-8">
          <PasskeyList rows={await listPasskeys()} />
          <PasskeyRegister />
        </div>
      </section>
    </Container>
  );
}
