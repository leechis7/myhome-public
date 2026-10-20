import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { isAdmin } from "@/lib/security/auth";
import { diaryAiOn, meetingAiOn, siteConfig } from "@/lib/site/settings";
import { inboxReady } from "@/lib/telegram/bot";

export const metadata: Metadata = {
  title: "음성",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 음성으로 할 수 있는 것을 한곳에(MYH-274). 저마다 어디서 쓰는지와, 쓸 수 있는지
 * (켜야 할 것)를 보인다. 소리는 어디에도 남기지 않는다 - 받아쓴 글만.
 */
export default async function VoicePage() {
  if (!(await isAdmin())) redirect("/admin");
  const [config, meeting, diary, telegram] = await Promise.all([
    siteConfig(),
    meetingAiOn(),
    diaryAiOn(),
    inboxReady(),
  ]);
  const gemini = Boolean(config.geminiApiKey);
  const items: { icon: string; title: string; where: string; href: string; ready: boolean; need?: string }[] = [
    {
      icon: "🎤",
      title: "말로 묻고 소리로 듣기",
      where: "대화 탭 · 「+」 창의 AI 탭 아래 🎤, 답마다 🔊",
      href: "/admin/ai",
      ready: true,
      need: "브라우저 음성 인식(크롬 · 엣지 · 사파리). 파이어폭스는 듣기만",
    },
    {
      icon: "🎙",
      title: "회의 받아쓰기",
      where: "회의 탭에서 녹음 → 30초씩 받아쓰기 · 끝나면 요약 · 할 일 카드 · 오픈클로에 맡기기",
      href: "/admin/ai/meetings",
      ready: meeting && gemini,
      need: "환경설정 › 회의 받아쓰기 켜기 · Gemini 키",
    },
    {
      icon: "📁",
      title: "녹음 파일 받아쓰기",
      where: "회의 탭의 「📁 받아쓰기」 로 휴대폰 · 통화 녹음 올리기",
      href: "/admin/ai/meetings",
      ready: meeting && gemini,
      need: "회의 받아쓰기와 같다",
    },
    {
      icon: "📱",
      title: "텔레그램 음성 메시지",
      where: "봇에 말로 보내면 받아써서 할 일 · 메모로",
      href: "/admin/memos",
      ready: telegram && gemini,
      need: "텔레그램 받기(웹훅) · Gemini 키",
    },
    {
      icon: "📔",
      title: "일기를 말로",
      where: "일기 쓰기 화면의 🎙 → 받아써서 일기 문장으로",
      href: "/admin/diary",
      ready: diary && gemini,
      need: "환경설정 › 나만 보는 글을 AI 로 보내기 켜기 · Gemini 키",
    },
    {
      icon: "🔊",
      title: "오늘을 소리로",
      where: "대시보드의 「🔊 오늘 듣기」 → 할 일 · 일정 · 새 메시지를 읽어 준다",
      href: "/admin",
      ready: true,
      need: "브라우저 읽기(대부분 됨)",
    },
    {
      icon: "📚",
      title: "독서 노트를 말로",
      where: "관리 › 책 의 독서 노트 칸 🎤 → 말한 것을 노트 끝에",
      href: "/admin/books",
      ready: true,
      need: "브라우저 음성 인식",
    },
  ];
  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">음성</h1>
      <p className="mt-2 text-sm text-muted">
        음성으로 할 수 있는 것들입니다. 소리는 어디에도 남기지 않고 받아쓴 글만 남깁니다(회의 · 일기는 암호화).
      </p>
      <ul aria-label="음성 기능" className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.title} className="rounded-xl border border-border p-4">
            <div className="flex items-baseline justify-between gap-2">
              <Link href={it.href} className="font-medium hover:underline">
                {it.icon} {it.title}
              </Link>
              <span
                className={`shrink-0 text-xs ${
                  it.ready ? "text-emerald-700 dark:text-emerald-400" : "text-muted"
                }`}
              >
                {it.ready ? "● 쓸 수 있음" : "○ 설정 필요"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{it.where}</p>
            {it.need ? <p className="mt-1 text-xs text-muted">{it.need}</p> : null}
          </li>
        ))}
      </ul>
    </Container>
  );
}
