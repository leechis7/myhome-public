import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import ProjectEditor from "@/components/admin/ProjectEditor";
import { isAdmin } from "@/lib/security/auth";
import { listProjects } from "@/lib/profile/projects";

export const metadata: Metadata = {
  title: "프로젝트 관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 지금 만들고 있는 것만 다룬다. 지나온 업무는 소개 관리의 "수행 업무" 다.
 * 같은 테이블(projects)을 kind 로 나눠 쓴다.
 */
export default async function AdminProjectsPage() {
  if (!(await isAdmin())) redirect("/admin");

  const rows = await listProjects("project");

  return (
    <Container>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">프로젝트 관리</h1>
        <Link
          href="/projects"
          className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
        >
          보기
        </Link>
      </div>

      <p className="mt-3 text-sm text-muted">
        지금 만들고 있는 것을 적습니다. 지나온 업무는 소개 관리의 &ldquo;수행
        업무&rdquo;에 있습니다. 정렬 순서가 작을수록 위에 나옵니다.
      </p>

      <div className="mt-8">
        <ProjectEditor rows={rows} kind="project" />
      </div>
    </Container>
  );
}
