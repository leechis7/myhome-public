"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { missOf } from "@/lib/ai/gemini";
import { chatOpenClaw } from "@/lib/ai/openclaw";
import {
  callsAssistant,
  handoffPrompt,
  meetingCommand,
  readWakeWords,
  summarizeMeeting,
} from "@/lib/ai/meeting-summary";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { splitTranscript, transcribeFile } from "@/lib/ai/transcribe-file";
import {
  addMeetingChunk,
  createMeeting,
  endMeeting,
  getMeeting,
  previousChunkText,
  saveMeetingHandoff,
  saveMeetingSummary,
  removeMeeting,
  renameMeeting,
} from "@/lib/my-space/meetings";
import { requireAdmin } from "@/lib/security/auth";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { meetingAiOn, siteAi, siteConfig } from "@/lib/site/settings";

/**
 * 회의 받아쓰기(MYH-265). 화면(components/admin/MeetingRecorder.tsx)이 30초씩
 * 녹음한 WAV 를 보내면 Gemini 로 받아써 조각으로 남긴다.
 */

const BACK = "/admin/ai/meetings";
/** 16kHz · 16비트 · 한 소리길 30초면 1MB 안팎. 넉넉히 */
const MAX_BYTES = 4 * 1024 * 1024;

const MISS = {
  quota: "AI 사용 한도를 넘었습니다. 잠시 뒤 다음 조각부터 다시 받아씁니다.",
  slow: "받아쓰기가 너무 오래 걸렸습니다.",
  error: "받아쓰지 못했습니다.",
} as const;

const SUMMARY_MISS = {
  quota: "AI 사용 한도를 넘었습니다. 잠시 뒤 「요약 다시 만들기」 를 눌러 주세요.",
  slow: "요약이 너무 오래 걸렸습니다. 「요약 다시 만들기」 를 눌러 주세요.",
  error: "요약하지 못했습니다. 「요약 다시 만들기」 를 눌러 주세요.",
} as const;

const dayFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

async function ready() {
  if (!hasSecretKey()) return "회의를 암호화할 열쇠(SECRETS_KEY)가 없습니다.";
  if (!(await meetingAiOn())) return "환경설정 › AI 사용 › 회의 받아쓰기 를 켜 주세요.";
  if (!(await siteConfig()).geminiApiKey) return "받아쓰기는 Gemini 가 합니다. 환경설정 › AI 사용 에 Gemini 키를 넣어 주세요.";
  return null;
}

export async function startMeetingAction(): Promise<{ id?: number; error?: string }> {
  await requireAdmin();
  const error = await ready();
  if (error) return { error };
  const id = await createMeeting();
  revalidatePath(BACK);
  return { id };
}

export async function transcribeChunkAction(
  formData: FormData,
): Promise<{ text?: string; command?: string; error?: string }> {
  await requireAdmin();
  const error = await ready();
  if (error) return { error };
  const meetingId = Number(formData.get("meetingId"));
  const seq = Number(formData.get("seq"));
  const audio = formData.get("audio");
  if (!Number.isInteger(meetingId) || !Number.isInteger(seq) || seq < 0) return { error: "꼴이 틀립니다." };
  if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_BYTES || audio.type !== "audio/wav") {
    return { error: "녹음 조각이 맞지 않습니다." };
  }
  const key = (await siteConfig()).geminiApiKey!;
  try {
    const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const text = await transcribeAudio({ type: "audio/wav", data }, key);
    if (text) await addMeetingChunk(meetingId, seq, text);
    // 「비서야 …」(MYH-267): 그 자리에서 시킨 일을 카드로. 실패해도 받아쓰기는 그대로
    let command: string | undefined;
    const words = readWakeWords((await siteConfig()).meetingWakeWords);
    const access = callsAssistant(text, words) ? await siteAi() : null;
    if (access) {
      command = await meetingCommand(
        text,
        await previousChunkText(meetingId, seq),
        dayFmt.format(new Date()),
        access,
        words[0],
      ).catch(() => undefined);
    }
    return { text, command };
  } catch (e) {
    return { error: MISS[missOf(e)] };
  }
}

/** 요약을 만들어 남긴다(관리자 확인은 부르는 쪽이 한다) */
async function summarize(id: number): Promise<{ ok?: true; error?: string }> {
  const meeting = Number.isInteger(id) ? await getMeeting(id) : null;
  if (!meeting) return { error: "없는 회의입니다." };
  const transcript = meeting.chunks.map((c) => c.text).join("\n");
  if (!transcript.trim()) return { error: "받아쓴 말이 없어 요약할 것이 없습니다." };
  const access = await siteAi();
  if (!access) return { error: "쓸 AI 엔진이 없습니다. 환경설정 › AI 사용 에서 켜 주세요." };
  try {
    const summary = await summarizeMeeting(
      transcript,
      { day: dayFmt.format(meeting.startedAt), title: meeting.title },
      access,
    );
    await saveMeetingSummary(id, summary);
    revalidatePath(`${BACK}/${id}`);
    return { ok: true };
  } catch (e) {
    return { error: SUMMARY_MISS[missOf(e)] };
  }
}

/**
 * 대본으로 요약 · 결정 · 할 일을 쓴다(MYH-266). 회의를 끝낼 때 부르고, 회의 화면의
 * 「요약 다시 만들기」 도 부른다. 엔진은 환경설정의 차례(작은 일 에이전트)
 */
export async function summarizeMeetingAction(id: number): Promise<{ ok?: true; error?: string }> {
  await requireAdmin();
  return summarize(id);
}

/** 회의를 끝내고 요약까지 만든다. 요약이 안 돼도 회의는 끝난다 */
export async function endMeetingAction(id: number) {
  await requireAdmin();
  if (!Number.isInteger(id)) return;
  await endMeeting(id);
  await summarize(id);
  revalidatePath(BACK);
  revalidatePath(`${BACK}/${id}`);
}

/**
 * 회의를 오픈클로에 맡긴다(MYH-268). 대화창 에이전트(main - 도구가 있다)에 요약 ·
 * 대본을 보내고 답을 회의에 남긴다. 다른 사람에게 닿는 일은 초안만 쓰게 한다
 */
export async function handOffMeetingAction(id: number): Promise<{ ok?: true; error?: string }> {
  await requireAdmin();
  if (!(await meetingAiOn())) return { error: "환경설정 › AI 사용 › 회의 받아쓰기 를 켜 주세요." };
  const meeting = Number.isInteger(id) ? await getMeeting(id) : null;
  if (!meeting) return { error: "없는 회의입니다." };
  const transcript = meeting.chunks.map((c) => c.text).join("\n");
  if (!transcript.trim()) return { error: "받아쓴 말이 없습니다." };
  const claw = (await siteAi({ chat: true }))?.find((a) => a.engine === "openclaw");
  if (!claw || claw.engine !== "openclaw") {
    return { error: "오픈클로가 연결돼 있지 않습니다. 환경설정 › AI 사용 › 오픈클로 를 확인하세요." };
  }
  try {
    const reply = await chatOpenClaw(
      [
        {
          role: "user",
          content: handoffPrompt(transcript, meeting.summary, dayFmt.format(meeting.startedAt), meeting.title),
        },
      ],
      claw,
      { timeoutMs: 300_000 },
    );
    if (!reply.trim()) return { error: "오픈클로가 답하지 않았습니다." };
    await saveMeetingHandoff(id, reply.trim());
    revalidatePath(`${BACK}/${id}`);
    return { ok: true };
  } catch (e) {
    return { error: missOf(e) === "slow" ? "오픈클로가 5분 안에 끝내지 못했습니다." : "오픈클로에 맡기지 못했습니다." };
  }
}

/** 받는 녹음 파일(MYH-271). Gemini 가 읽는 꼴로 이름을 맞춘다 */
const FILE_TYPES: Record<string, string> = {
  "audio/mpeg": "audio/mp3",
  "audio/mp3": "audio/mp3",
  "audio/mp4": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/wav": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/ogg": "audio/ogg",
  "audio/webm": "audio/webm",
  "audio/flac": "audio/flac",
};
/** Cloudflare 가 한 요청에 100MB 까지 넘긴다 */
const MAX_FILE_BYTES = 95 * 1024 * 1024;

/**
 * 녹음 파일을 올려 회의 하나로 받아쓴다(MYH-271). 길면 몇 분 걸려 응답을 붙잡지 않고
 * 뒤에서(after) 받아쓰고 요약까지 한다 - 회의 화면이 다 될 때까지 다시 읽는다.
 * 소리는 받아쓰고 나면 버린다
 */
export async function uploadRecordingAction(formData: FormData): Promise<{ id?: number; error?: string }> {
  await requireAdmin();
  const error = await ready();
  if (error) return { error };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "녹음 파일을 골라 주세요." };
  const type = FILE_TYPES[file.type] ?? (/\.m4a$/i.test(file.name) ? "audio/mp4" : null);
  if (!type) return { error: "m4a · mp3 · wav · ogg · aac · flac 녹음 파일만 받습니다." };
  if (file.size > MAX_FILE_BYTES) return { error: "95MB 까지 받습니다." };

  const bytes = Buffer.from(await file.arrayBuffer());
  const title = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || undefined;
  const id = await createMeeting(title, "file");
  const key = (await siteConfig()).geminiApiKey!;
  after(async () => {
    try {
      const text = await transcribeFile(bytes, type, key);
      const parts = splitTranscript(text);
      for (const [i, part] of parts.entries()) await addMeetingChunk(id, i, part);
      await endMeeting(id);
      if (parts.length) await summarize(id);
    } catch (e) {
      console.warn(`[meetings] 녹음 파일 받아쓰기 실패 ${id}`, e);
      await saveMeetingSummary(id, "받아쓰지 못했습니다. 파일을 다시 올려 주세요.");
      await endMeeting(id);
    }
    revalidatePath(BACK);
    revalidatePath(`${BACK}/${id}`);
  });
  revalidatePath(BACK);
  return { id };
}

export async function renameMeetingAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  if (Number.isInteger(id) && title) await renameMeeting(id, title);
  revalidatePath(BACK);
  revalidatePath(`${BACK}/${id}`);
}

export async function deleteMeetingAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await removeMeeting(id);
  revalidatePath(BACK);
  redirect(BACK);
}
