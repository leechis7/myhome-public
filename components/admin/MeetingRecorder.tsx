"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { endMeetingAction, startMeetingAction, transcribeChunkAction } from "@/app/admin/ai/meetings/actions";
import AssistantReply from "@/components/admin/AssistantReply";
import { recognitionClass, type Recognition } from "@/lib/ai/speech-browser";
import { encodeWav, isSilent, joinSamples } from "@/lib/ai/wav";

/** 한 조각의 길이. 짧으면 자주 보내고, 길면 받아쓰기가 늦게 보인다 */
const CHUNK_MS = 30_000;
/**
 * 실시간 자막을 못 쓰는 기기의 조각 길이(MYH-265). 안드로이드 크롬은 마이크를 한
 * 곳만 잡게 해서, 녹음이 마이크를 쥐면 음성 인식이 「audio-capture」 로 꺼진다. 그때는
 * 자막 대신 받아쓰기를 자주 해서 글이 빨리 보이게 한다
 */
const SHORT_CHUNK_MS = 10_000;
const RATE = 16_000;

/** 받아쓴 한 조각. at 은 녹음 시작부터 그 조각이 시작된 때(ms). command 는 「비서야 …」 로 시킨 일(MYH-267) */
type Line = { seq: number; at: number; text: string; state: "wait" | "done" | "error"; command?: string };

function mmss(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * 회의 녹음(MYH-265). 마이크 소리를 16kHz 로 모아 30초마다 WAV 로 만들어 서버에
 * 보내고, 받아쓴 글을 아래에 쌓는다. 조용한 조각은 보내지 않는다. 녹음 중에는
 * 화면이 꺼지지 않게 하고(되는 브라우저에서), 떠나려 하면 한 번 묻는다.
 * 소리는 남기지 않는다 - 받아쓴 글만 서버에 암호화해 둔다.
 */
export default function MeetingRecorder({ ready }: { ready: string | null }) {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(ready);
  const [elapsed, setElapsed] = useState(0);

  const ctx = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const parts = useRef<Float32Array[]>([]);
  const seq = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const wake = useRef<{ release(): Promise<void> } | null>(null);
  /**
   * 실시간 자막: 브라우저 음성 인식이 말하는 대로 바로 쓴다(덜 정확, 남기지 않는다).
   * 30초마다 Gemini 가 받아쓴 글이 아래에 쌓이면 자막은 비운다. 인식은 1분쯤이면
   * 스스로 끝나서, 녹음 중이면 다시 켠다. 인식이 없는 브라우저(파이어폭스)는 30초 글만
   */
  const [caption, setCaption] = useState("");
  const live = useRef<Recognition | null>(null);
  const keepLive = useRef(false);
  /** 자막을 못 쓰는 기기라 짧게 받아쓰는 중인가 */
  const [shortChunks, setShortChunks] = useState(false);
  const meetingRef = useRef<number | null>(null);
  const began = useRef(0);
  const chunkStart = useRef(0);
  const quickEnds = useRef(0);
  const openedAt = useRef(0);

  /** 자막을 접고 10초마다 받아쓰기로 바꾼다 */
  const fallBack = () => {
    if (!keepLive.current) return;
    keepLive.current = false;
    live.current?.abort();
    setCaption("");
    setShortChunks(true);
    const id = meetingRef.current;
    if (timer.current && id !== null) {
      clearInterval(timer.current);
      timer.current = setInterval(() => flush(id), SHORT_CHUNK_MS);
    }
  };

  const startCaption = () => {
    const Klass = recognitionClass();
    if (!Klass || !keepLive.current) return;
    const r = new Klass();
    r.lang = "ko-KR";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) =>
      setCaption(
        Array.from(e.results)
          .map((res) => res[0]?.transcript ?? "")
          .join(" ")
          .slice(-400),
      );
    r.onstart = () => {
      openedAt.current = Date.now();
    };
    r.onerror = (e) => {
      // 마이크를 녹음과 나눠 쓰지 못하는 기기(안드로이드 크롬) · 막힌 경우
      if (["audio-capture", "not-allowed", "service-not-allowed"].includes(e.error)) fallBack();
    };
    r.onend = () => {
      if (!keepLive.current) return;
      // 켜자마자 끝나기를 되풀이하면 이 기기는 안 되는 것이다
      quickEnds.current = Date.now() - openedAt.current < 1500 ? quickEnds.current + 1 : 0;
      if (quickEnds.current >= 3) fallBack();
      else setTimeout(startCaption, 300);
    };
    live.current = r;
    try {
      r.start();
    } catch {
      // 이미 켜져 있다
    }
  };

  // 화면을 떠나면 자막 인식도 끈다
  useEffect(
    () => () => {
      keepLive.current = false;
      live.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!recording) return;
    const ask = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [recording]);

  /** 모은 소리를 한 조각으로 보낸다. 차례를 지키려고 줄을 세운다 */
  const flush = (id: number) => {
    const samples = joinSamples(parts.current);
    parts.current = [];
    const n = seq.current++;
    const at = chunkStart.current;
    chunkStart.current = Date.now() - began.current;
    setCaption("");
    if (samples.length === 0 || isSilent(samples)) return;
    setLines((now) => [...now, { seq: n, at, text: "", state: "wait" }]);
    const wav = new Blob([encodeWav(samples, ctx.current?.sampleRate ?? RATE)], { type: "audio/wav" });
    queue.current = queue.current.then(async () => {
      const form = new FormData();
      form.set("meetingId", String(id));
      form.set("seq", String(n));
      form.set("audio", new File([wav], `${n}.wav`, { type: "audio/wav" }));
      const r = await transcribeChunkAction(form).catch(
        () => ({ error: "보내지 못했습니다." }) as { text?: string; command?: string; error?: string },
      );
      setLines((now) =>
        now.map((l) =>
          l.seq === n
            ? { ...l, text: r.text ?? r.error ?? "", state: r.error ? "error" : "done", command: r.command }
            : l,
        ),
      );
    });
  };

  const start = async () => {
    setError(null);
    const made = await startMeetingAction();
    if (!made.id) {
      setError(made.error ?? "회의를 시작하지 못했습니다.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch {
      setError("마이크를 쓸 수 없습니다. 브라우저에서 마이크를 허용해 주세요.");
      await endMeetingAction(made.id);
      return;
    }
    const audio = new AudioContext({ sampleRate: RATE });
    const source = audio.createMediaStreamSource(stream.current);
    // ScriptProcessor 는 낡았지만 모든 브라우저에서 따로 파일 없이 된다
    const proc = audio.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => parts.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    source.connect(proc);
    proc.connect(audio.destination);
    ctx.current = audio;
    seq.current = 0;
    setMeetingId(made.id);
    setLines([]);
    setElapsed(0);
    setRecording(true);
    setShortChunks(false);
    quickEnds.current = 0;
    const id = made.id;
    meetingRef.current = id;
    began.current = Date.now();
    chunkStart.current = 0;
    timer.current = setInterval(() => flush(id), CHUNK_MS);
    keepLive.current = recognitionClass() !== null;
    if (keepLive.current) startCaption();
    else setShortChunks(true);
    if (!keepLive.current) {
      clearInterval(timer.current);
      timer.current = setInterval(() => flush(id), SHORT_CHUNK_MS);
    }
    clock.current = setInterval(() => setElapsed(Math.floor((Date.now() - began.current) / 1000)), 1000);
    try {
      const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } };
      wake.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      // 화면 꺼짐 막기는 덤이다
    }
  };

  const stop = async () => {
    if (!meetingId) return;
    setStopping(true);
    keepLive.current = false;
    live.current?.abort();
    setCaption("");
    if (timer.current) clearInterval(timer.current);
    if (clock.current) clearInterval(clock.current);
    flush(meetingId);
    stream.current?.getTracks().forEach((t) => t.stop());
    await ctx.current?.close().catch(() => {});
    await wake.current?.release().catch(() => {});
    await queue.current;
    await endMeetingAction(meetingId);
    setRecording(false);
    setStopping(false);
    router.push(`/admin/ai/meetings/${meetingId}`);
  };

  const clockText = mmss(elapsed * 1000);

  return (
    <section aria-label="회의 녹음" className="mt-6 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        {recording ? (
          <>
            <span className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
              <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-red-600" />
              녹음 중 <span className="tabular-nums">{clockText}</span>
            </span>
            <button
              type="button"
              onClick={stop}
              disabled={stopping}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {stopping ? "마무리하는 중…" : "■ 회의 끝"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={ready !== null}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            🎙 회의 시작
          </button>
        )}
        <p className="text-xs text-muted">
          말하는 대로 회색 자막이 바로 보이고, 30초마다 정확히 받아쓴 글이 쌓입니다. 「비서야, … 할 일로 넣어」 처럼 부르면 그 자리에서 카드를 띄웁니다.
          소리는 남기지 않고 글만 암호화해 둡니다. 녹음한다는 것을 참석자에게 알려 주세요.
        </p>
      </div>
      {recording && shortChunks ? (
        <p role="status" className="mt-3 text-xs text-muted">
          이 기기에서는 실시간 자막을 쓸 수 없어(녹음과 마이크를 나눠 쓰지 못합니다) 대신 10초마다 받아씁니다.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {recording || lines.length ? (
        <ol aria-label="받아쓴 대본" aria-live="polite" className="mt-4 space-y-2 text-sm">
          {lines.length === 0 && !caption ? (
            <li className="text-muted">첫 {shortChunks ? "10" : "30"}초를 기다리는 중…</li>
          ) : null}
          {lines.map((l) => (
            <li key={l.seq} className="flex gap-3">
              <span className="w-12 shrink-0 text-xs text-muted tabular-nums">{mmss(l.at)}</span>
              <div className="min-w-0 flex-1">
                <span
                  className={`whitespace-pre-wrap ${
                    l.state === "wait" ? "text-muted" : l.state === "error" ? "text-red-600 dark:text-red-400" : ""
                  }`}
                >
                  {l.state === "wait" ? "받아쓰는 중…" : l.text || "(말 없음)"}
                </span>
                {l.command ? (
                  <div aria-label="비서에게 시킨 일" className="mt-1.5 rounded-lg bg-foreground/[0.06] px-3 py-2 text-xs">
                    <AssistantReply content={`🤖 ${l.command}`} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
          {recording && caption ? (
            <li aria-label="실시간 자막" className="flex gap-3 text-muted italic">
              <span className="w-12 shrink-0 text-xs not-italic">지금</span>
              <span>{caption}</span>
            </li>
          ) : null}
        </ol>
      ) : null}
    </section>
  );
}
