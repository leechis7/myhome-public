import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/Container";
import Markdown from "@/components/blog/Markdown";
import DeleteButton from "@/components/admin/DeleteButton";
import MarkdownField from "@/components/admin/markdown/MarkdownField";
import {
  deleteDiaryAction,
  saveDiaryAction,
  uploadDiaryImage,
} from "@/app/admin/diary/actions";
import { isAdmin } from "@/lib/auth";
import { findDiary } from "@/lib/diary";
import { MOODS, dayLabel, parseDay, type Mood } from "@/lib/diary-calendar";
import { formatDate } from "@/lib/posts";
import { hasSecretKey } from "@/lib/secret-crypto";

export const metadata: Metadata = {
  title: "일기",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/** 2026-10-08 의 하루 앞뒤 */
function neighbor(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * 하루의 일기(MYH-213). 쓴 날은 읽는 화면이 먼저 나오고 「고치기」 로
 * 쓰는 칸을 연다. 아직 안 쓴 날은 곧바로 쓰는 칸이다.
 */
export default async function DiaryDayPage({
  params,
  searchParams,
}: PageProps<"/admin/diary/[day]">) {
  if (!(await isAdmin())) redirect("/admin");
  if (!hasSecretKey()) notFound();

  const day = parseDay((await params).day);
  if (!day) notFound();
  const diary = await findDiary(day);
  const written = Boolean(diary?.content);
  const editing = !written || (await searchParams).edit === "1";
  const month = day.slice(0, 7);

  return (
    <Container>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/diary/${neighbor(day, -1)}`}
            className={button}
            aria-label="전날"
          >
            ←
          </Link>
          <h1 className="text-xl font-semibold tracking-tight tabular-nums">
            {dayLabel(day)}
          </h1>
          <Link
            href={`/admin/diary/${neighbor(day, 1)}`}
            className={button}
            aria-label="다음 날"
          >
            →
          </Link>
        </div>
        <Link href={`/admin/diary?month=${month}`} className={button}>
          달력
        </Link>
      </div>

      {editing ? (
        <form
          action={saveDiaryAction}
          aria-label="일기 쓰기"
          className="mt-8 space-y-5"
        >
          <input type="hidden" name="day" value={day} />
          <fieldset>
            <legend className="text-sm text-muted">기분 (선택)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm has-[:checked]:border-foreground/50 has-[:checked]:bg-foreground/5">
                <input
                  type="radio"
                  name="mood"
                  value=""
                  defaultChecked={!diary?.mood}
                  className="sr-only"
                />
                없음
              </label>
              {(Object.keys(MOODS) as Mood[]).map((key) => (
                <label
                  key={key}
                  className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm has-[:checked]:border-foreground/50 has-[:checked]:bg-foreground/5"
                >
                  <input
                    type="radio"
                    name="mood"
                    value={key}
                    defaultChecked={diary?.mood === key}
                    className="sr-only"
                  />
                  {MOODS[key].emoji} {MOODS[key].label}
                </label>
              ))}
            </div>
          </fieldset>
          <MarkdownField
            id="diary-content"
            name="content"
            label="일기"
            rows={20}
            required
            defaultValue={diary?.content ?? ""}
            placeholder="오늘 있었던 일, 든 생각. 마크다운으로 씁니다. 암호화해서 저장됩니다."
            textareaClassName={`${field} font-mono leading-relaxed`}
            // 붙여넣은 그림도 암호화해서 둔다. 저장 전이면 그 날의 줄을 먼저 만든다
            imageUpload={{
              action: uploadDiaryImage,
              idField: "secretId",
              id: diary?.id ?? null,
              fields: { day },
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={primary}>
              저장
            </button>
            {written ? (
              <Link href={`/admin/diary/${day}`} className={button}>
                그만 고치기
              </Link>
            ) : null}
          </div>
        </form>
      ) : (
        <article className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {diary?.mood ? (
                <span className="mr-3 text-foreground">
                  {MOODS[diary.mood].emoji} {MOODS[diary.mood].label}
                </span>
              ) : null}
              {diary ? `고침 ${formatDate(diary.updatedAt)}` : null}
            </p>
            <Link href={`/admin/diary/${day}?edit=1`} className={button}>
              고치기
            </Link>
          </div>
          <div className="mt-6">
            <Markdown>{diary!.content!}</Markdown>
          </div>
        </article>
      )}

      {diary ? (
        <form action={deleteDiaryAction} className="mt-12 border-t border-border pt-6">
          <input type="hidden" name="day" value={day} />
          <DeleteButton
            aria-label="이 날 일기 지우기"
            className={`${button} text-red-600 dark:text-red-400`}
            confirmMessage="이 날의 일기와 그림을 지울까요? 되돌릴 수 없습니다."
          >
            일기 지우기
          </DeleteButton>
        </form>
      ) : null}
    </Container>
  );
}
