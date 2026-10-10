import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/page-metadata";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import ProjectList from "@/components/ProjectList";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
  title: "프로젝트",
  description: "지금 만들고 있는 것들.",
  path: "/projects",
});
}

export const dynamic = "force-dynamic";

/**
 * 지금 만들고 있는 것. 지나온 업무는 소개 화면의 "수행 업무" 에 있다.
 * 둘은 같은 테이블(projects)에 kind 로 구분해 담는다.
 */
export default function ProjectsPage() {
  return (
    <Container>
      <PageHeader
        title="프로젝트"
        description="지금 만들고 있는 것들입니다."
      />
      <ProjectList kind="project" empty="아직 등록한 프로젝트가 없습니다." />
    </Container>
  );
}
