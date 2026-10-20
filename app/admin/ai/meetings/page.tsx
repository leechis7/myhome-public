import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/Container";
import MeetingRecorder from "@/components/admin/MeetingRecorder";
import RecordingUpload from "@/components/admin/RecordingUpload";
import { formatDateTime } from "@/lib/format";
import { listMeetings } from "@/lib/my-space/meetings";
import { isAdmin } from "@/lib/security/auth";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { meetingAiOn, siteConfig } from "@/lib/site/settings";

export const metadata: Metadata = {
  title: "회의",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** 회의 길이 「42분」 */
function length(start: Date, end: Date | null, source: string) {
  if (source === "file") return end ? "녹음 파일" : "받아쓰는 중";
  if (!end) return "녹음 중이거나 끊김";
  const min = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min}분`;
}

/**
 * 회의(MYH-265, 회의 비서 MYH-264 의 1단계). 녹음하며 30초씩 받아쓰고, 지난 회의를
 * 글로 늘어놓는다. 누르면 그 회의의 대본.
 */
export default async function MeetingsPage() {
  if (!(await isAdmin())) redirect("/admin");
  if (!hasSecretKey()) notFound();

  const [list, on, config] = await Promise.all([listMeetings(), meetingAiOn(), siteConfig()]);
  const ready = !on
    ? "환경설정 › AI 사용 › 회의 받아쓰기 를 켜면 녹음할 수 있습니다."
    : !config.geminiApiKey
      ? "받아쓰기는 Gemini 가 합니다. 환경설정 › AI 사용 에 Gemini 키를 넣어 주세요."
      : null;

  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">회의</h1>
        <Link href="/admin/settings#meeting-ai" className="text-sm text-muted underline underline-offset-4">
          받아쓰기 설정
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        회의를 녹음하며 받아씁니다. 지난 회의는 아래에 글로 남습니다.
      </p>

      <MeetingRecorder ready={ready} />
      {/* 녹음 파일 올리기(MYH-271) */}
      <RecordingUpload disabled={ready !== null} />

      <h2 className="mt-10 text-lg font-semibold">지난 회의</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted">아직 없습니다.</p>
      ) : (
        <ul aria-label="회의 목록" className="mt-3 divide-y divide-border border-y border-border">
          {list.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/ai/meetings/${m.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 hover:bg-foreground/[0.03]"
              >
                <span className="font-medium">{m.title}</span>
                <span className="text-xs text-muted tabular-nums">
                  {formatDateTime(m.startedAt)} · {length(m.startedAt, m.endedAt, m.source)} · 조각 {m.chunks}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
