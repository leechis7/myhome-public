import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import Container from "@/components/Container";
import CareerEditor from "@/components/admin/CareerEditor";
import LoginForm from "@/components/admin/LoginForm";
import SetupForm from "@/components/admin/SetupForm";
import ProfileForm from "@/components/admin/ProfileForm";
import ProjectEditor from "@/components/admin/ProjectEditor";
import SkillEditor from "@/components/admin/SkillEditor";
import { isAdmin, needsSetup } from "@/lib/auth";
import { hasPasskey } from "@/lib/passkeys";
import { listProjects } from "@/lib/projects";
import { getDb, profile, careers } from "@/lib/db";
import { listSkills } from "@/lib/skills";
import { listCodes, SKILL_CATEGORY } from "@/lib/codes";

export const metadata: Metadata = {
  title: "관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const loginErrors: Record<string, string> = {
  bad: "비밀번호가 맞지 않습니다.",
  rate: "시도가 너무 많습니다. 10분 후에 다시 해주세요.",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  if (!(await isAdmin())) {
    // 빈 DB 로 처음 띄워 비밀번호가 아직 없다(MYH-172)
    if (await needsSetup()) {
      return (
        <Container>
          <SetupForm />
        </Container>
      );
    }
    const params = await searchParams;
    const code = typeof params.e === "string" ? params.e : undefined;
    return (
      <Container>
        <LoginForm
          error={code ? loginErrors[code] : undefined}
          passkeyReady={await hasPasskey()}
        />
      </Container>
    );
  }

  const db = getDb();
  const [profileRows, careerRows, skillRows, projectRows, skillCodes] =
    await Promise.all([
      db.select().from(profile).where(eq(profile.id, 1)).limit(1),
      db.select().from(careers).orderBy(desc(careers.startedOn)),
      listSkills(),
      listProjects("work"),
      listCodes(SKILL_CATEGORY, { all: true }),
    ]);

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">소개 관리</h1>

      <section className="mt-10">
        <h2 className="mb-5 text-lg font-semibold">프로필</h2>
        <ProfileForm me={profileRows.at(0)} />
      </section>

      <section className="mt-14">
        <h2 className="mb-5 text-lg font-semibold">경력</h2>
        <CareerEditor rows={careerRows} />
      </section>

      <section className="mt-14">
        <h2 className="mb-5 text-lg font-semibold">기술</h2>
        <SkillEditor rows={skillRows} codes={skillCodes} />
      </section>

      {/* 수행 업무. 공개 화면에서도 소개 안에 있으니 고치는 자리도 여기다 */}
      <section className="mt-14">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 className="text-lg font-semibold">수행 업무</h2>
          <Link
            href="/about#work"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            공개 화면에서 보기 ↗
          </Link>
        </div>
        <p className="mb-5 text-sm text-muted">
          정렬 순서가 작을수록 위에 나옵니다. 같으면 최근 시작한 것부터. 종료일을
          비우면 진행 중으로 보입니다.
        </p>
        <ProjectEditor rows={projectRows} kind="work" />
      </section>
    </Container>
  );
}
