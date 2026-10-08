import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import Container from "@/components/Container";
import CareerEditor from "@/components/admin/CareerEditor";
import LoginForm from "@/components/admin/LoginForm";
import SetupForm from "@/components/admin/SetupForm";
import ProfileForm from "@/components/admin/ProfileForm";
import ContactInfoForm from "@/components/admin/ContactInfoForm";
import ProjectEditor from "@/components/admin/ProjectEditor";
import ResumeAdmin, { ResumeVisibility } from "@/components/admin/ResumeAdmin";
import { saveAboutVisibility } from "@/app/admin/resume/actions";
import { ABOUT_SECTION_LABELS, ABOUT_SECTIONS } from "@/lib/about-sections";
import { readResume } from "@/lib/resume";
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

  const params = await searchParams;
  const resumeError = typeof params.re === "string" ? params.re : undefined;
  const db = getDb();
  const [profileRows, careerRows, skillRows, projectRows, skillCodes, resume] =
    await Promise.all([
      db.select().from(profile).where(eq(profile.id, 1)).limit(1),
      db.select().from(careers).orderBy(desc(careers.startedOn)),
      listSkills(),
      listProjects("work"),
      listCodes(SKILL_CATEGORY, { all: true }),
      readResume(),
    ]);
  const me = profileRows.at(0);

  // 맨 위는 보일 항목(소개 · 이력서), 그 아래는 사용자가 정한 순서(MYH-220)
  const toc = [
    ["visibility", "보일 항목"],
    ["profile", "프로필"],
    ["contacts", "연락 수단"],
    ["personal", "인적 사항"],
    ["schools", "학력"],
    ["trainings", "교육"],
    ["licenses", "자격증"],
    ["careers", "경력"],
    ["skills", "기술"],
    ["work", "수행 업무"],
  ];

  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">프로필</h1>
        <p className="flex gap-4 text-sm">
          <Link href="/about" className="text-muted transition-colors hover:text-foreground">
            소개 보기 ↗
          </Link>
          <Link href="/resume" className="text-muted transition-colors hover:text-foreground">
            이력서 보기 ↗
          </Link>
        </p>
      </div>

      {/* 소개와 이력서를 한 화면에서 고친다(MYH-218 · MYH-220) */}
      <nav aria-label="이 화면 목차" className="sticky top-16 z-10 -mx-2 mt-6 flex flex-wrap gap-1 rounded-xl border border-border bg-background/95 px-2 py-2 text-sm backdrop-blur">
        {toc.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-md px-2 py-1 text-foreground/70 hover:bg-foreground/5 hover:text-foreground">
            {label}
          </a>
        ))}
      </nav>

      <section id="visibility" aria-labelledby="visibility-h" className="mt-10 scroll-mt-32">
        <h2 id="visibility-h" className="text-lg font-semibold">
          방문자에게 보일 항목
        </h2>
        <p className="mt-1 text-sm text-muted">
          로그인한 나에게는 늘 전부 보입니다. 끈 항목은 방문자에게 보내는 화면에 아예
          넣지 않습니다.
        </p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-sm font-medium">소개에 보일 항목</p>
            {me ? (
              <form action={saveAboutVisibility} aria-label="소개에 보일 항목" className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {ABOUT_SECTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="section"
                      value={s}
                      defaultChecked={me.aboutSections.includes(s)}
                    />
                    {ABOUT_SECTION_LABELS[s]}
                  </label>
                ))}
                <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5">
                  저장
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted">프로필을 먼저 저장하세요.</p>
            )}
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-sm font-medium">이력서에 보일 항목</p>
            <ResumeVisibility chosen={resume.publicSections} />
          </div>
        </div>
      </section>

      <section id="profile" className="mt-14 scroll-mt-32">
        <h2 className="mb-5 text-lg font-semibold">프로필</h2>
        <ProfileForm me={me} />
      </section>

      {/* 연락 수단은 프로필에서 떼어 따로 저장한다(MYH-222). 소개 · 방명록에 나온다 */}
      <section id="contacts" className="mt-14 scroll-mt-32">
        <h2 className="mb-5 text-lg font-semibold">연락 수단</h2>
        <ContactInfoForm me={me} />
      </section>

      {/* 인적 사항 · 학력 · 교육 · 자격증 - 이력서에만 나온다 */}
      <ResumeAdmin errorCode={resumeError} />

      <section id="careers" className="mt-14 scroll-mt-32">
        <h2 className="mb-5 text-lg font-semibold">경력</h2>
        <CareerEditor rows={careerRows} />
      </section>

      <section id="skills" className="mt-14 scroll-mt-32">
        <h2 className="mb-5 text-lg font-semibold">기술</h2>
        <SkillEditor rows={skillRows} codes={skillCodes} />
      </section>

      {/* 수행 업무. 공개 화면에서도 소개 안에 있으니 고치는 자리도 여기다 */}
      <section id="work" className="mt-14 scroll-mt-32">
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
