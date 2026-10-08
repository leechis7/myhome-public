import type { Metadata } from "next";
import Link from "next/link";
import { getSite } from "@/lib/site-info";
import { pageMetadata } from "@/lib/page-metadata";
import { desc, eq } from "drizzle-orm";
import Container from "@/components/Container";
import JsonLd from "@/components/JsonLd";
import PageHeader from "@/components/PageHeader";
import ContactRows from "@/components/ContactRows";
import ProjectList from "@/components/ProjectList";
import { getDb, profile, careers } from "@/lib/db";
import { listSkills } from "@/lib/skills";
import { isAdmin } from "@/lib/auth";
import type { AboutSection } from "@/lib/about-sections";
import { groupByCategory } from "@/lib/category";
import { personJsonLd } from "@/lib/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
  title: "소개",
  description: "저에 대한 간단한 소개입니다.",
  path: "/about",
});
}

// DB에서 읽으므로 빌드 시점에 미리 렌더하지 않는다.
// (Docker 이미지를 빌드할 때는 DB가 없다)
export const dynamic = "force-dynamic";

/** 2020-01-01 → 2020.01 */
function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return `${year}.${month}`;
}

function formatPeriod(startedOn: string, endedOn: string | null) {
  return `${formatMonth(startedOn)} — ${endedOn ? formatMonth(endedOn) : "현재"}`;
}

export default async function AboutPage() {
  const db = getDb();

  const [profileRows, careerRows, skillRows, admin] = await Promise.all([
    db.select().from(profile).where(eq(profile.id, 1)).limit(1),
    db.select().from(careers).orderBy(desc(careers.startedOn)),
    listSkills(),
    isAdmin(),
  ]);

  const me = profileRows.at(0);
  // 방문자에게 보일 항목(MYH-220). 관리자에게는 늘 전부 보이고, 끈 항목은
  // 표시를 단다. 방문자에게는 끈 항목을 아예 그리지 않는다
  const chosen = me?.aboutSections ?? [];
  const shown = (s: AboutSection) => admin || chosen.includes(s);
  const hiddenMark = (s: AboutSection) =>
    admin && !chosen.includes(s) ? (
      <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-normal text-amber-700 dark:text-amber-400">
        방문자에게 안 보임
      </span>
    ) : null;
  const paragraphs = me?.bio.split(/\n{2,}/).filter(Boolean) ?? [];
  // 소개글을 끄면 한 줄 소개도 함께 감춘다(MYH-222)
  const showProfile = shown("profile");

  return (
    <Container>
      <JsonLd data={personJsonLd(await getSite(), me?.headline)} />

      <PageHeader
        title="소개"
        description={
          (showProfile ? me?.headline : null) ?? "저에 대한 간단한 소개입니다."
        }
        action={
          // 경력 · 기술 · 수행 업무를 한 장으로(MYH-195)
          <Link
            href="/resume"
            className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
          >
            이력서 →
          </Link>
        }
      />

      {showProfile ? (
        <div className="space-y-4 leading-relaxed text-foreground/80">
          {hiddenMark("profile") ? <p className="text-sm">소개글{hiddenMark("profile")}</p> : null}
          {paragraphs.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
      ) : null}

      {/* 소개를 읽고 나서 바로 연락할 수 있게 여기 둔다. 값은 DB 에 있고
          관리 화면의 소개에서 고친다 — 연락처 화면도 같은 것을 쓴다. */}
      {shown("contacts") ? (
        <>
          {hiddenMark("contacts") ? (
            <p className="mt-10 text-sm">연락 수단{hiddenMark("contacts")}</p>
          ) : null}
          <ContactRows
            me={me}
            className={`${hiddenMark("contacts") ? "mt-3" : "mt-10"} flex flex-wrap gap-x-10 gap-y-3`}
          />
        </>
      ) : null}

      {shown("career") && careerRows.length > 0 ? (
        <>
          <h2 className="mt-12 mb-4 text-lg font-semibold">경력{hiddenMark("career")}</h2>
          <ul className="space-y-5">
            {careerRows.map((row) => (
              <li key={row.id} className="sm:flex sm:gap-6">
                <span className="shrink-0 text-sm text-muted sm:w-32">
                  {formatPeriod(row.startedOn, row.endedOn)}
                </span>
                <div>
                  <p className="font-medium">
                    {row.role} · {row.company}
                  </p>
                  {row.detail ? (
                    <p className="text-sm text-foreground/60">{row.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {shown("skills") && skillRows.length > 0 ? (
        <>
          <h2 className="mt-12 mb-4 text-lg font-semibold">기술{hiddenMark("skills")}</h2>
          <div className="flex flex-col gap-5">
            {groupByCategory(skillRows).map(([category, rows]) => (
              <div key={category}>
                {category ? (
                  <p className="mb-2 text-sm text-muted">{category}</p>
                ) : null}
                <ul className="flex flex-wrap gap-2">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-md border border-border px-3 py-1 text-sm text-foreground/70"
                    >
                      {row.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : null}


      {/* 해 온 일도 "내가 누구인지" 의 일부라 여기에 둔다. 예전에는
          /projects 라는 따로 된 화면이었다. */}
      {shown("work") ? (
        <>
          <h2 id="work" className="mt-14 mb-4 text-lg font-semibold">
            수행 업무{hiddenMark("work")}
          </h2>
          <ProjectList kind="work" empty="아직 등록한 수행 업무가 없습니다." />
        </>
      ) : null}
    </Container>
  );
}
