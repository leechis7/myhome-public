import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/Container";
import AssistantReply from "@/components/admin/AssistantReply";
import DeleteButton from "@/components/admin/DeleteButton";
import MeetingSummaryButton from "@/components/admin/MeetingSummaryButton";
import RefreshWhile from "@/components/admin/RefreshWhile";
import { deleteMeetingAction, renameMeetingAction } from "@/app/admin/ai/meetings/actions";
import { formatDateTime } from "@/lib/format";
import { getMeeting } from "@/lib/my-space/meetings";
import { isAdmin } from "@/lib/security/auth";
import { hasSecretKey } from "@/lib/security/secret-crypto";

export const metadata: Metadata = {
  title: "회의",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";

/**
 * 녹음 시작부터 몇 분 몇 초. 조각 길이가 기기마다 달라(30초 · 10초) 받아쓴 때로 센다 -
 * 받아쓰는 데 걸린 몇 초만큼 늦게 찍힌다
 */
function offset(at: Date, started: Date) {
  const s = Math.max(0, Math.floor((at.getTime() - started.getTime()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** 회의 하나(MYH-265): 제목 고치기, 대본, 지우기 */
export default async function MeetingPage({ params }: PageProps<"/admin/ai/meetings/[id]">) {
  if (!(await isAdmin())) redirect("/admin");
  if (!hasSecretKey()) notFound();
  const id = Number((await params).id);
  const meeting = Number.isInteger(id) ? await getMeeting(id) : null;
  if (!meeting) notFound();

  return (
    <Container>
      <Link href="/admin/ai/meetings" className="text-sm text-muted hover:text-foreground">
        ← 회의 목록
      </Link>
      <form action={renameMeetingAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={meeting.id} />
        <input
          name="title"
          defaultValue={meeting.title}
          aria-label="회의 제목"
          required
          maxLength={200}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-2xl font-semibold tracking-tight outline-none hover:border-border focus:border-foreground/40"
        />
        <button type="submit" className={button}>
          제목 저장
        </button>
      </form>
      <p className="mt-1 text-sm text-muted tabular-nums">
        {formatDateTime(meeting.startedAt)}
        {meeting.source === "file"
          ? meeting.endedAt
            ? " · 녹음 파일"
            : " · 녹음 파일을 받아쓰는 중입니다(길면 몇 분). 끝나면 저절로 보입니다"
          : meeting.endedAt
            ? ` ~ ${formatDateTime(meeting.endedAt)}`
            : " · 녹음이 끝나지 않았습니다"}
      </p>
      {meeting.source === "file" && !meeting.endedAt ? <RefreshWhile /> : null}

      {/* 요약 · 결정 · 할 일(MYH-266). 할 일은 카드 - 누를 때만 넣는다 */}
      <section aria-label="요약" className="mt-6 rounded-xl border border-border p-4 text-sm">
        {meeting.summary ? (
          <AssistantReply content={meeting.summary} />
        ) : (
          <p className="text-muted">아직 요약이 없습니다.</p>
        )}
        {meeting.chunks.length > 0 ? (
          <div className="mt-3">
            <MeetingSummaryButton id={meeting.id} again={meeting.summary !== null} />
          </div>
        ) : null}
      </section>

      {/* 오픈클로에 맡기기(MYH-268) */}
      {meeting.chunks.length > 0 ? (
        <section aria-label="오픈클로" className="mt-4 rounded-xl border border-border p-4 text-sm">
          {meeting.handoff ? (
            <div className="mb-3">
              <AssistantReply content={meeting.handoff} />
            </div>
          ) : (
            <p className="mb-3 text-muted">
              오픈클로가 자기 도구로 회의에서 나온 일을 처리하고 무엇을 했는지 알려 줍니다. 메일처럼 다른 사람에게
              닿는 일은 초안만 씁니다.
            </p>
          )}
          <MeetingSummaryButton id={meeting.id} again={meeting.handoff !== null} kind="handoff" />
        </section>
      ) : null}

      <h2 className="mt-8 text-lg font-semibold">대본</h2>
      {meeting.chunks.length === 0 ? (
        <p className="mt-3 text-sm text-muted">받아쓴 말이 없습니다.</p>
      ) : (
        <ol aria-label="대본" className="mt-3 space-y-2 text-sm">
          {meeting.chunks.map((c) => (
            <li key={c.seq} className="flex gap-3">
              {/* 올린 파일은 조각이 30초가 아니라 문단이다 - 시각을 적지 않는다 */}
              {meeting.source === "file" ? null : (
                <span className="w-12 shrink-0 text-xs text-muted tabular-nums">{offset(c.at, meeting.startedAt)}</span>
              )}
              <span className="whitespace-pre-wrap">{c.text}</span>
            </li>
          ))}
        </ol>
      )}

      <form action={deleteMeetingAction} className="mt-12 border-t border-border pt-6">
        <input type="hidden" name="id" value={meeting.id} />
        <DeleteButton
          aria-label="회의 삭제"
          className={`${button} text-red-600 dark:text-red-400`}
          confirmMessage={`「${meeting.title}」 을 지울까요? 대본도 함께 지워집니다.`}
        />
      </form>
    </Container>
  );
}
