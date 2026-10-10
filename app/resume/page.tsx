import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import Container from "@/components/Container";
import PrintButton from "@/components/PrintButton";
import { isAdmin } from "@/lib/security/auth";
import { groupByCategory } from "@/lib/codes/category";
import { careers, getDb, profile } from "@/lib/db";
import { pageMetadata } from "@/lib/site/page-metadata";
import { formatPeriod as projectPeriod, listProjects } from "@/lib/profile/projects";
import {
  ageOn,
  careerYears,
  dotted,
  readResume,
  RESUME_SECTION_LABELS,
  RESUME_SECTIONS,
  todayInSeoul,
  type ResumeSection,
} from "@/lib/profile/resume";
import { listSkills } from "@/lib/profile/skills";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "이력서",
    description: "경력 · 기술 · 수행 업무를 한 장에 모았습니다.",
    path: "/resume",
  });
}

// 소개와 같은 DB 를 읽는다. 빌드할 때는 DB 가 없다
export const dynamic = "force-dynamic";

/** 2020-01-01 → 2020.01 */
function month(value: string | null | undefined) {
  return value ? dotted(value.slice(0, 7)) : "";
}

const cell = "border border-foreground/30 px-2.5 py-1.5 align-top";
const head = `${cell} bg-foreground/[0.05] text-center font-medium whitespace-nowrap`;

function Table({
  columns,
  widths,
  children,
}: {
  columns: string[];
  /** 칸 너비(colgroup). 비우면 저절로 */
  widths?: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        {widths ? (
          <colgroup>
            {widths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className={head}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/**
 * 이력서(MYH-195, MYH-198). 한국 기술이력서 꼴로 번호 붙은 절과 칸이 그어진
 * 표로 그린다. PDF 는 브라우저 인쇄로 만든다(globals.css 의 @media print).
 *
 * 관리자에게는 항목이 전부 보이고, 방문자에게는 관리 › 설정 › 이력서에서 고른
 * 것만 보인다. 방문자에게 안 보일 항목은 HTML 에도 넣지 않는다. 절 번호는
 * 보이는 것만 차례로 센다.
 */
export default async function ResumePage() {
  const db = getDb();
  const [admin, [me], careerRows, skillRows, work, r] = await Promise.all([
    isAdmin(),
    db.select().from(profile).where(eq(profile.id, 1)).limit(1),
    db.select().from(careers).orderBy(desc(careers.startedOn)),
    listSkills(),
    listProjects("work"),
    readResume(),
  ]);
  const today = todayInSeoul();
  const p = r.profile;

  const has: Record<ResumeSection, boolean> = {
    personal: true,
    schools: r.schools.length > 0,
    career: careerRows.length > 0,
    trainings: r.trainings.length > 0,
    licenses: r.licenses.length > 0,
    skills: skillRows.length > 0,
    work: work.length > 0,
  };
  const shown = RESUME_SECTIONS.filter(
    (s) => has[s] && (admin || r.publicSections.includes(s)),
  );
  const number = (s: ResumeSection) => shown.indexOf(s) + 1;

  // 절 머리. 컴포넌트가 아니라 함수로 부른다(렌더 안에서 컴포넌트를 만들지 않는다)
  const title = (section: ResumeSection, right?: ReactNode) => {
    return (
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold">
          {`${number(section)}. ${RESUME_SECTION_LABELS[section]}`}
          {admin && !r.publicSections.includes(section) ? (
            <span data-print-hide className="ml-2 text-xs font-normal text-faint">
              방문자에게 안 보임
            </span>
          ) : null}
        </h2>
        {right}
      </div>
    );
  };

  return (
    <Container>
      <div data-print-hide className="mb-6 flex flex-wrap justify-end gap-2">
        {admin ? (
          <Link
            href="/admin/profile#resume"
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-foreground/5"
          >
            고치기
          </Link>
        ) : null}
        <PrintButton />
      </div>

      <h1 className="text-center text-3xl font-semibold tracking-[0.2em]">
        {`${me?.name ?? ""} 기술이력서`}
      </h1>
      {me?.headline ? (
        <p className="mt-3 text-center text-sm text-foreground/70">{me.headline}</p>
      ) : null}

      <div className="mt-10 space-y-9">
        {shown.includes("personal") ? (
          <section data-print-keep>
            {title(
              "personal",
              p?.updatedAt ? (
                <span className="text-sm font-medium">
                  {`최종수정일: ${dotted(todayInSeoul(p.updatedAt))}`}
                </span>
              ) : null,
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <tbody>
                  {[
                    [
                      ["성명", me?.name],
                      ["생년월일", dotted(p?.birthDate)],
                      ["연령", p?.birthDate ? `${ageOn(p.birthDate, today)}세` : ""],
                    ],
                    [
                      ["소속사", p?.company],
                      [
                        "전산 경력",
                        r.careerStart ? `${careerYears(r.careerStart, today)}년` : "",
                      ],
                      ["성별", p?.gender],
                    ],
                    [
                      ["최종학교", p?.finalSchool],
                      ["전공", p?.major],
                      ["학위", p?.degree],
                    ],
                  ].map((line, i) => (
                    <tr key={i}>
                      {line.map(([label, value]) => (
                        <Pair key={label} label={label!} value={value} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {shown.includes("schools") ? (
          <section>
            {title("schools")}
            <Table columns={["기간", "학교명", "전공", "비고"]} widths={["10.5rem", "", "", "6rem"]}>
              {r.schools.map((s) => (
                <tr key={s.id} data-print-keep>
                  <td className={`${cell} text-center tabular-nums whitespace-nowrap`}>
                    {`${month(s.startedOn)}~${month(s.endedOn)}`}
                  </td>
                  <td className={cell}>{s.school}</td>
                  <td className={cell}>{s.major}</td>
                  <td className={cell}>{s.note}</td>
                </tr>
              ))}
            </Table>
          </section>
        ) : null}

        {shown.includes("career") ? (
          <section>
            {title("career")}
            <Table
              columns={["재직 기간", "회사명", "직위", "주요 수행 프로젝트"]}
              widths={["11rem", "8rem", "4.5rem", ""]}
            >
              {careerRows.map((c) => (
                <tr key={c.id} data-print-keep>
                  <td className={`${cell} text-center tabular-nums whitespace-nowrap`}>
                    {`${month(c.startedOn)} ~ ${c.endedOn ? month(c.endedOn) : "현재"}`}
                  </td>
                  <td className={`${cell} text-center`}>{c.company}</td>
                  <td className={`${cell} text-center whitespace-nowrap`}>{c.role}</td>
                  <td className={cell}>{c.detail}</td>
                </tr>
              ))}
            </Table>
          </section>
        ) : null}

        {shown.includes("trainings") ? (
          <section>
            {title("trainings")}
            <Table columns={["기간", "교육 과정", "교육 기관", "비고"]} widths={["8rem", "", "", "6rem"]}>
              {r.trainings.map((t) => (
                <tr key={t.id} data-print-keep>
                  <td className={`${cell} text-center tabular-nums`}>{month(t.takenOn)}</td>
                  <td className={cell}>{t.course}</td>
                  <td className={cell}>{t.institution}</td>
                  <td className={cell}>{t.note}</td>
                </tr>
              ))}
            </Table>
          </section>
        ) : null}

        {shown.includes("licenses") ? (
          <section>
            {title("licenses")}
            <Table columns={["취득일", "자격증명", "번호", "발행처"]} widths={["8rem", "", "", ""]}>
              {r.licenses.map((l) => (
                <tr key={l.id} data-print-keep>
                  <td className={`${cell} text-center tabular-nums`}>{dotted(l.acquiredOn)}</td>
                  <td className={cell}>{l.name}</td>
                  <td className={cell}>{l.number}</td>
                  <td className={cell}>{l.issuer}</td>
                </tr>
              ))}
            </Table>
          </section>
        ) : null}

        {shown.includes("skills") ? (
          <section>
            {title("skills")}
            <Table columns={["분류", "기술"]} widths={["9rem", ""]}>
              {groupByCategory(skillRows).map(([category, rows]) => (
                <tr key={category ?? ""} data-print-keep>
                  <td className={`${cell} text-center`}>{category || "기타"}</td>
                  <td className={cell}>{rows.map((s) => s.name).join(", ")}</td>
                </tr>
              ))}
            </Table>
          </section>
        ) : null}

        {shown.includes("work") ? (
          <section>
            {title("work")}
            <Table columns={["기간", "프로젝트", "내용", "기술"]} widths={["10.5rem", "11rem", "", "9rem"]}>
              {work.map((w) => (
                <tr key={w.id} data-print-keep>
                  <td className={`${cell} text-center tabular-nums whitespace-nowrap`}>
                    {projectPeriod(w.startedOn, w.endedOn)}
                  </td>
                  <td className={`${cell} font-medium`}>{w.name}</td>
                  <td className={cell}>{w.summary}</td>
                  <td className={`${cell} text-xs`}>{w.stack.join(", ")}</td>
                </tr>
              ))}
            </Table>
          </section>
        ) : null}
      </div>

      <p data-print-hide className="mt-14 text-sm">
        <Link
          href="/about"
          className="text-foreground/60 transition-colors hover:text-foreground"
        >
          ← 소개로
        </Link>
      </p>
    </Container>
  );
}

/** 인적 사항 표의 「항목 · 값」 한 쌍 */
function Pair({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <th scope="row" className={`${head} w-[6.5rem]`}>
        {label}
      </th>
      <td className={cell}>{value}</td>
    </>
  );
}
