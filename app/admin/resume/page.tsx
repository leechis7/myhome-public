import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Container from "@/components/Container";
import DeleteButton from "@/components/admin/DeleteButton";
import { isAdmin } from "@/lib/auth";
import {
  ageOn,
  careerYears,
  dotted,
  readResume,
  RESUME_SECTION_LABELS,
  RESUME_SECTIONS,
  todayInSeoul,
} from "@/lib/resume";
import { formatDate } from "@/lib/posts";
import {
  deleteLicense,
  deleteSchool,
  deleteTraining,
  saveLicense,
  savePersonal,
  saveSchool,
  saveTraining,
  saveVisibility,
} from "./actions";

export const metadata: Metadata = {
  title: "이력서 관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

const errors: Record<string, string> = {
  school: "학교명을 적어 주세요.",
  training: "교육 과정을 적어 주세요.",
  license: "자격증명을 적어 주세요.",
};

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-14 scroll-mt-24">
      <h2 id={`${id}-h`} className="text-lg font-semibold">
        {title}
      </h2>
      {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** 한 줄을 고치는 폼과 지우는 폼. 줄과 더하기가 같은 칸을 쓴다 */
function Row({
  label,
  id,
  save,
  remove,
  fields,
}: {
  label: string;
  id?: number;
  save: (formData: FormData) => Promise<void>;
  remove?: (formData: FormData) => Promise<void>;
  fields: ReactNode;
}) {
  return (
    <li className="rounded-lg border border-border p-3">
      <form action={save} aria-label={label} className="grid gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto] sm:items-center">
        {id ? <input type="hidden" name="id" value={id} /> : null}
        {fields}
        <button type="submit" className={id ? button : primary}>
          {id ? "저장" : "추가"}
        </button>
      </form>
      {id && remove ? (
        <form action={remove} className="mt-2">
          <input type="hidden" name="id" value={id} />
          <DeleteButton
            aria-label={`${label} 삭제`}
            className="text-xs text-faint transition-colors hover:text-red-600 dark:hover:text-red-400"
            confirmMessage={`「${label}」 을 지울까요?`}
          />
        </form>
      ) : null}
    </li>
  );
}

/**
 * 이력서 관리(MYH-198). 이력서에만 쓰는 인적 사항 · 학력 · 교육 · 자격증과,
 * 방문자에게 보일 항목. 경력 · 기술 · 수행 업무는 소개 관리(프로필)에서 고친다.
 */
export default async function AdminResumePage({
  searchParams,
}: PageProps<"/admin/resume">) {
  if (!(await isAdmin())) redirect("/admin");
  const params = await searchParams;
  const error = typeof params.re === "string" ? errors[params.re] : undefined;
  const r = await readResume();
  const p = r.profile;
  const today = todayInSeoul();

  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="text-2xl font-semibold tracking-tight">이력서 관리</h1>
        <Link
          href="/resume"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          이력서 보기 ↗
        </Link>
      </div>
      <p className="mt-3 text-sm text-muted">
        여기 적는 것은 이력서에만 나오고 소개 화면에는 나오지 않습니다. 경력 · 기술 ·
        수행 업무는 <Link href="/admin" className="underline underline-offset-4">프로필</Link>에서
        고칩니다.
      </p>
      {error ? (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <Section
        id="visibility"
        title="방문자에게 보일 항목"
        note="로그인한 나에게는 늘 전부 보입니다. 끈 항목은 방문자에게 보내는 화면에 아예 넣지 않습니다."
      >
        <form action={saveVisibility} className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {RESUME_SECTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="section"
                value={s}
                defaultChecked={r.publicSections.includes(s)}
              />
              {RESUME_SECTION_LABELS[s]}
            </label>
          ))}
          <button type="submit" className={button}>
            저장
          </button>
        </form>
      </Section>

      <Section
        id="personal"
        title="기본 인적 사항"
        note={`성명은 프로필의 이름입니다. 연령과 전산 경력은 오늘 기준으로 셉니다${
          p?.updatedAt ? ` · 최종수정일 ${formatDate(p.updatedAt)}` : ""
        }.`}
      >
        <form action={savePersonal} aria-label="기본 인적 사항" className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            생년월일
            <input name="birthDate" type="date" defaultValue={p?.birthDate ?? ""} className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-muted">
            소속사
            <input name="company" defaultValue={p?.company ?? ""} className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-muted">
            성별
            <input name="gender" defaultValue={p?.gender ?? ""} className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-muted">
            최종학교
            <input name="finalSchool" defaultValue={p?.finalSchool ?? ""} className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-muted">
            전공
            <input name="major" defaultValue={p?.major ?? ""} className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-muted">
            학위
            <input name="degree" defaultValue={p?.degree ?? ""} className={`${field} mt-1`} />
          </label>
          <p className="text-sm text-muted sm:col-span-2">
            {p?.birthDate ? `연령 ${ageOn(p.birthDate, today)}세` : "연령: 생년월일을 적으면 셉니다"}
            {" · "}
            {r.careerStart
              ? `전산 경력 ${careerYears(r.careerStart, today)}년 (${dotted(r.careerStart.slice(0, 7))} 부터)`
              : "전산 경력: 프로필에 경력을 적으면 셉니다"}
          </p>
          <div className="sm:text-right">
            <button type="submit" className={primary}>
              저장
            </button>
          </div>
        </form>
      </Section>

      <Section id="schools" title="학력" note="기간은 년 · 월입니다.">
        <ul className="space-y-2">
          {[...r.schools, undefined].map((row) => (
            <Row
              key={row?.id ?? "new"}
              id={row?.id}
              label={row ? row.school : "학력 추가"}
              save={saveSchool}
              remove={deleteSchool}
              fields={
                <>
                  <span className="flex items-center gap-1">
                    <input name="startedOn" type="month" defaultValue={row?.startedOn ?? ""} aria-label="입학" className={field} />
                    <span className="text-faint">~</span>
                    <input name="endedOn" type="month" defaultValue={row?.endedOn ?? ""} aria-label="졸업" className={field} />
                  </span>
                  <input name="school" defaultValue={row?.school ?? ""} placeholder="학교명" aria-label="학교명" required className={field} />
                  <input name="major" defaultValue={row?.major ?? ""} placeholder="전공" aria-label="전공" className={field} />
                  <input name="note" defaultValue={row?.note ?? ""} placeholder="비고 (졸업 등)" aria-label="비고" className={field} />
                </>
              }
            />
          ))}
        </ul>
      </Section>

      <Section id="trainings" title="교육" note="때는 년 · 월입니다.">
        <ul className="space-y-2">
          {[...r.trainings, undefined].map((row) => (
            <Row
              key={row?.id ?? "new"}
              id={row?.id}
              label={row ? row.course : "교육 추가"}
              save={saveTraining}
              remove={deleteTraining}
              fields={
                <>
                  <input name="takenOn" type="month" defaultValue={row?.takenOn ?? ""} aria-label="때" className={field} />
                  <input name="course" defaultValue={row?.course ?? ""} placeholder="교육 과정" aria-label="교육 과정" required className={field} />
                  <input name="institution" defaultValue={row?.institution ?? ""} placeholder="교육 기관" aria-label="교육 기관" className={field} />
                  <input name="note" defaultValue={row?.note ?? ""} placeholder="비고 (수료 등)" aria-label="비고" className={field} />
                </>
              }
            />
          ))}
        </ul>
      </Section>

      <Section id="licenses" title="자격증">
        <ul className="space-y-2">
          {[...r.licenses, undefined].map((row) => (
            <Row
              key={row?.id ?? "new"}
              id={row?.id}
              label={row ? row.name : "자격증 추가"}
              save={saveLicense}
              remove={deleteLicense}
              fields={
                <>
                  <input name="acquiredOn" type="date" defaultValue={row?.acquiredOn ?? ""} aria-label="취득일" className={field} />
                  <input name="name" defaultValue={row?.name ?? ""} placeholder="자격증명" aria-label="자격증명" required className={field} />
                  <input name="number" defaultValue={row?.number ?? ""} placeholder="번호" aria-label="번호" className={field} />
                  <input name="issuer" defaultValue={row?.issuer ?? ""} placeholder="발행처" aria-label="발행처" className={field} />
                </>
              }
            />
          ))}
        </ul>
      </Section>
    </Container>
  );
}
