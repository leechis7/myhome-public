import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/Container";
import { isAdmin } from "@/lib/auth";
import { listDiaryMonth } from "@/lib/diary";
import {
  MOODS,
  monthGrid,
  monthLabel,
  parseMonth,
  shiftMonth,
} from "@/lib/diary-calendar";
import { todayInSeoul } from "@/lib/resume-sections";
import { hasSecretKey } from "@/lib/secret-crypto";

export const metadata: Metadata = {
  title: "일기장",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/**
 * 일기장(MYH-213). 한 달 달력이다. 쓴 날에는 기분(없으면 점)이 찍히고,
 * 날을 누르면 그 날의 일기를 읽거나 쓴다. 하루 한 편이다.
 */
export default async function DiaryPage({
  searchParams,
}: PageProps<"/admin/diary">) {
  if (!(await isAdmin())) redirect("/admin");
  if (!hasSecretKey()) notFound();

  const today = todayInSeoul();
  const month = parseMonth((await searchParams).month) ?? today.slice(0, 7);
  const written = await listDiaryMonth(month);
  const weeks = monthGrid(month);

  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">일기장</h1>
        <Link href={`/admin/diary/${today}`} className={primary}>
          오늘 일기 쓰기
        </Link>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href={`/admin/diary?month=${shiftMonth(month, -1)}`}
          className={button}
          aria-label="이전 달"
        >
          ←
        </Link>
        <h2 className="text-lg font-semibold tabular-nums">
          {monthLabel(month)}
          <span className="ml-2 text-sm font-normal text-muted">
            {written.size}편
          </span>
        </h2>
        <Link
          href={`/admin/diary?month=${shiftMonth(month, 1)}`}
          className={button}
          aria-label="다음 달"
        >
          →
        </Link>
      </div>

      <table className="mt-4 w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">{monthLabel(month)} 일기</caption>
        <thead>
          <tr className="text-muted">
            {"일월화수목금토".split("").map((d, i) => (
              <th
                key={d}
                scope="col"
                className={`py-2 font-normal ${i === 0 ? "text-red-500/80" : ""}`}
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((day, i) => {
                if (!day) return <td key={i} className="h-16" />;
                const has = written.has(day);
                const mood = written.get(day);
                const n = Number(day.slice(8));
                return (
                  <td key={day} className="h-16 p-0.5 align-top">
                    <Link
                      href={`/admin/diary/${day}`}
                      aria-label={`${n}일${has ? " 일기 있음" : ""}${
                        mood ? ` · ${MOODS[mood].label}` : ""
                      }`}
                      className={`flex h-full flex-col items-center rounded-lg pt-1.5 transition-colors hover:bg-foreground/5 ${
                        day === today ? "ring-1 ring-foreground/30" : ""
                      } ${has ? "bg-foreground/[0.04]" : ""}`}
                    >
                      <span
                        className={`tabular-nums ${
                          i === 0 ? "text-red-500/80" : has ? "" : "text-muted"
                        }`}
                      >
                        {n}
                      </span>
                      {has ? (
                        <span aria-hidden className="mt-0.5 text-base leading-none">
                          {mood ? MOODS[mood].emoji : "•"}
                        </span>
                      ) : null}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {month !== today.slice(0, 7) ? (
        <p className="mt-4 text-center text-sm">
          <Link
            href="/admin/diary"
            className="text-muted transition-colors hover:text-foreground"
          >
            이번 달로
          </Link>
        </p>
      ) : null}
    </Container>
  );
}
