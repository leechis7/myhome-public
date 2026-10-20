"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChatReply } from "@/lib/ai/chat-run";
import AssistantReply from "@/components/admin/AssistantReply";
import { recognitionClass, speak, type Recognition } from "@/lib/ai/speech-browser";

/** 붙인 그림(MYH-248). data 는 base64(data: 머리 없이) */
type Picture = { type: string; data: string };
type Turn = { role: "user" | "assistant"; content: string; engine?: string; images?: Picture[] };

const KEY = "myhome:ai-chat";
/** 한 번에 붙일 수 있는 그림 수. 서버도 같은 수로 자른다(lib/ai/chat-turns.ts) */
const MAX_PICTURES = 4;
/** 긴 변을 이만큼으로 줄여 보낸다. 엔진이 어차피 이 근처로 줄여 읽는다 */
const MAX_SIDE = 1568;

/**
 * 그림을 줄여 JPEG 로 만든다. 사진 한 장이 몇 MB 라 그대로 보내면 대화가 금방
 * 무거워진다. 투명한 곳은 흰 바탕으로 채운다
 */
async function shrink(file: Blob): Promise<Picture> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { type: "image/jpeg", data: url.slice(url.indexOf(",") + 1) };
}

const src = (p: Picture) => `data:${p.type};base64,${p.data}`;

function load(): Turn[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/**
 * 떠 있는 「+」 창의 AI 탭(MYH-248). 대화를 통째로 홈페이지 서버에 보내고
 * (app/admin/chat/actions.ts), 서버가 환경설정의 차례대로 오픈클로 · Gemini 에
 * 묻는다. 대화는 이 탭(sessionStorage)에만 잠깐 둔다 - 닫으면 사라진다.
 * 물을 엔진을 고를 수 있다(처음 값은 환경설정 차례의 1순위).
 *
 * AI 의 답은 마크다운으로 그린다(코드 · 표 · 목록).
 * 바깥 「빠른 메모」 form 안에 놓이므로 form 을 따로 두지 않는다.
 * Enter 로 보내고 Shift+Enter 는 줄바꿈.
 */
export default function AiChat({
  height,
  engines = [],
  fill = false,
}: {
  height?: number;
  /** 고를 수 있는 엔진들. 맨 앞이 처음 값 */
  engines?: { key: string; label: string }[];
  /**
   * 화면에 꽉 차게(AI 화면, MYH-274). 텔레그램처럼 위 · 아래는 붙박이, 대화만 스크롤.
   * 보이는 화면(휴대폰 자판이 올라오면 그만큼 줄어든다)에 맞춰 높이를 잡고 페이지는
   * 스크롤하지 않게 한다
   */
  fill?: boolean;
}) {
  const [engine, setEngine] = useState(engines[0]?.key ?? "");
  const [turns, setTurns] = useState<Turn[]>(load);
  const [draft, setDraft] = useState("");
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [fitHeight, setFitHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!fill) return;
    const html = document.documentElement;
    const before = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const fit = () => {
      const top = shell.current?.getBoundingClientRect().top ?? 0;
      const seen = window.visualViewport?.height ?? window.innerHeight;
      setFitHeight(Math.max(240, Math.floor(seen - top - 12)));
    };
    window.scrollTo(0, 0);
    fit();
    window.visualViewport?.addEventListener("resize", fit);
    window.addEventListener("resize", fit);
    return () => {
      html.style.overflow = before.html;
      document.body.style.overflow = before.body;
      window.visualViewport?.removeEventListener("resize", fit);
      window.removeEventListener("resize", fit);
    };
  }, [fill]);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(turns));
    } catch {
      // 그림 때문에 넘쳤으면 그림만 빼고라도 기억한다. 못 해도 된다
      try {
        sessionStorage.setItem(KEY, JSON.stringify(turns.map((t) => ({ ...t, images: undefined }))));
      } catch {}
    }
    end.current?.scrollIntoView({ block: "end" });
  }, [turns, pending]);

  useEffect(() => box.current?.focus(), []);

  /** 고르거나 붙여 넣거나 끌어 놓은 파일 가운데 그림만 줄여서 붙인다 */
  const attach = async (files: File[]) => {
    const list = files.filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    const room = MAX_PICTURES - pictures.length;
    if (room <= 0 || list.length > room) setError(`그림은 한 번에 ${MAX_PICTURES}장까지 붙일 수 있습니다.`);
    else setError(null);
    try {
      const made = await Promise.all(list.slice(0, Math.max(room, 0)).map(shrink));
      setPictures((now) => [...now, ...made].slice(0, MAX_PICTURES));
    } catch {
      setError("그림을 읽지 못했습니다.");
    }
  };

  /** 말로 묻는 중(MYH-263). 말이 끝나면 바로 보내고, 답이 오면 소리로 읽는다 */
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  // 대화창은 「+」 창을 연 뒤에야 그려진다(서버 렌더 없음) - 처음 값에서 바로 본다
  const [canListen] = useState(() => recognitionClass() !== null);
  useEffect(() => () => recognition.current?.abort(), []);

  const listen = () => {
    if (listening) {
      recognition.current?.abort();
      setListening(false);
      return;
    }
    const Klass = recognitionClass();
    if (!Klass || pending) return;
    window.speechSynthesis?.cancel();
    const r = new Klass();
    r.lang = "ko-KR";
    r.interimResults = true;
    r.continuous = false;
    let heard = "";
    r.onresult = (e) => {
      heard = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join("");
      setDraft(heard);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") setError("말을 알아듣지 못했습니다. 마이크 허용을 확인하세요.");
    };
    r.onend = () => {
      setListening(false);
      recognition.current = null;
      if (heard.trim()) send(heard, true);
    };
    recognition.current = r;
    setError(null);
    setListening(true);
    r.start();
  };

  const send = (said?: string, voice = false) => {
    const content = (said ?? draft).trim();
    if ((!content && pictures.length === 0) || pending) return;
    const next: Turn[] = [
      ...turns,
      { role: "user", content, ...(pictures.length ? { images: pictures } : {}) },
    ];
    setTurns(next);
    setDraft("");
    setPictures([]);
    setError(null);
    start(async () => {
      // 늘 같은 주소로 묻는다(보고 있는 화면의 주소로 가면 그림이 1MB 제한에 걸린다)
      const reply: ChatReply = await fetch("/admin/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content, images }) => ({ role, content, ...(images ? { images } : {}) })),
          engine: engine || undefined,
        }),
      })
        .then((r) => r.json() as Promise<ChatReply>)
        .catch(() => ({ error: "보내지 못했습니다. 연결을 확인해 주세요." }));
      if (reply.text) {
        setTurns((now) => [...now, { role: "assistant", content: reply.text!, engine: reply.engine }]);
        if (voice) speak(reply.text);
      } else {
        setError(reply.error ?? "답을 받지 못했습니다.");
      }
    });
  };

  return (
    <div
      ref={shell}
      style={fill && fitHeight ? { height: fitHeight } : undefined}
      className={fill ? "flex flex-col" : undefined}
    >
      <div
        role="log"
        aria-label="AI 대화"
        aria-live="polite"
        style={!fill && height ? { height: `min(${height}px, calc(100vh - 17rem))` } : undefined}
        className={`space-y-2 overflow-y-auto overscroll-contain pr-1 text-sm ${
          fill ? "min-h-0 flex-1" : "h-[min(60vh,36rem)]"
        }`}
      >
        {turns.length === 0 ? (
          <p className="text-xs text-muted">
            무엇이든 물어보세요. 환경설정 › AI 사용 의 차례대로 오픈클로 · Gemini 가 답합니다.
          </p>
        ) : null}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="ml-8 space-y-1">
              {t.images?.length ? (
                <div className="flex flex-wrap justify-end gap-1">
                  {t.images.map((p, j) => (
                    // eslint-disable-next-line @next/next/no-img-element -- data: 주소라 next/image 가 할 일이 없다
                    <img key={j} src={src(p)} alt={`보낸 그림 ${j + 1}`} className="h-20 rounded-md object-cover" />
                  ))}
                </div>
              ) : null}
              {t.content ? (
                <p className="rounded-lg bg-foreground px-3 py-2 whitespace-pre-wrap text-background">
                  {t.content}
                </p>
              ) : null}
            </div>
          ) : (
            <div key={i} className="mr-8">
              <div className="rounded-lg bg-foreground/[0.06] px-3 py-2">
                <AssistantReply content={t.content} />
              </div>
              {t.engine ? <p className="mt-0.5 text-[11px] text-muted">{t.engine}</p> : null}
            </div>
          ),
        )}
        {pending ? <p className="mr-8 text-xs text-muted">생각하는 중…</p> : null}
        <div ref={end} />
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {pictures.length ? (
        <ul aria-label="붙인 그림" className="mt-2 flex flex-wrap gap-2">
          {pictures.map((p, i) => (
            <li key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: 주소라 next/image 가 할 일이 없다 */}
              <img src={src(p)} alt={`붙인 그림 ${i + 1}`} className="h-16 w-16 rounded-md border border-border object-cover" />
              <button
                type="button"
                aria-label={`붙인 그림 ${i + 1} 빼기`}
                onClick={() => setPictures((now) => now.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs text-background"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        ref={box}
        rows={3}
        aria-label="AI 에게 물을 말"
        placeholder="물을 말 (Enter 로 보내기, Shift+Enter 줄바꿈). 그림은 붙여넣기 · 끌어 놓기"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onPaste={(e) => {
          // 그림이 있을 때만 가로챈다. 글은 그대로 붙는다
          const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
          if (files.length === 0) return;
          e.preventDefault();
          void attach(files);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          if (e.dataTransfer.files.length === 0) return;
          e.preventDefault();
          void attach(Array.from(e.dataTransfer.files));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.stopPropagation();
            send();
          }
        }}
        className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setTurns([]);
            setError(null);
          }}
          disabled={turns.length === 0 || pending}
          className="text-xs text-muted hover:text-foreground disabled:opacity-40"
        >
          대화 지우기
        </button>
        <span className="ml-auto" />
        {canListen ? (
          <button
            type="button"
            onClick={listen}
            disabled={pending && !listening}
            aria-label={listening ? "말하기 멈춤" : "말로 묻기"}
            aria-pressed={listening}
            title={listening ? "듣는 중 · 누르면 멈춤" : "말로 묻기(말이 끝나면 보내고 답을 읽어 줍니다)"}
            className={`rounded-lg border px-2 py-1 text-xs disabled:opacity-40 ${
              listening ? "animate-pulse border-red-500 text-red-600" : "border-border"
            }`}
          >
            🎤
          </button>
        ) : null}
        <input
          ref={picker}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void attach(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={pending || pictures.length >= MAX_PICTURES}
          aria-label="그림 붙이기"
          title="그림 붙이기"
          className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
        >
          📎
        </button>
        {/* 물을 엔진(MYH-248). 처음 값은 환경설정 차례의 1순위. 하나뿐이면 이름만 */}
        {engines.length > 1 ? (
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            aria-label="AI 엔진"
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
          >
            {engines.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </select>
        ) : engines.length === 1 ? (
          <span className="text-xs text-muted">{engines[0].label}</span>
        ) : null}
        <button
          type="button"
          onClick={() => send()}
          disabled={pending || (!draft.trim() && pictures.length === 0)}
          className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "기다리는 중…" : "보내기"}
        </button>
      </div>
    </div>
  );
}
