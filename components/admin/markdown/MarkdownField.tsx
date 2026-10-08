"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentType } from "react";
import {
  EDITORS,
  EDITOR_LABELS,
  isEditorKind,
  type EditorKind,
} from "@/lib/editor-kinds";
import { useEditorChoice } from "./editor-choice";
import { imageFiles, type EditorProps, type UploadedImage } from "./types";
import "./prosemirror-reset.css";

/**
 * 본문 칸(MYH-118). 마크다운 · 편집기 · 미리보기 탭. 편집기 자리에는 설정에서
 * 고른 위지윅 편집기 하나(Milkdown · TipTap · Toast UI)가 나온다(editor-choice).
 *
 * **DB 에는 늘 마크다운만 간다.** 폼으로 보내는 것은 탭과 상관없이 늘 여기의
 * <textarea name=…> 하나다. 위지윅 탭은 그 값을 그려 보이고, 고치면 그
 * 편집기가 뽑은 마크다운으로 그 칸을 채운다.
 *
 * **탭을 여는 것만으로는 본문이 바뀌지 않는다.** 편집기는 손대지 않고 뽑아도
 * 모양이 조금 다르다(표 칸 공백, \ 붙이기 …). 그래서 편집기가 다 그렸을 때
 * 뽑은 것(기준)을 기억해 두고, 고친 결과가 그 기준과 같으면(되돌렸으면) 탭을
 * 열 때의 원문을 그대로 둔다. 실제로 고쳤을 때만 편집기가 뽑은 것으로 바뀐다.
 * 그래야 탭만 눌러 보고 저장해도 옛 글이 흔들리지 않는다.
 *
 * 편집기는 그 탭을 처음 열 때 불러온다. 마크다운 탭만 쓰면 무게는 전과 같다.
 * 마지막에 쓴 탭은 이 브라우저에 기억해 둔다.
 */

type TabId = "markdown" | "editor" | "preview";

/** 편집기마다 탭 아래 안내 한 줄. 그 편집기의 약한 곳을 적는다 */
const EDITOR_NOTES: Record<EditorKind, string> = {
  milkdown:
    "고치면 저장할 때 마크다운 모양이 조금 바뀝니다(화면은 같습니다). 표 칸에서 한글이 지워지면 마크다운 탭에서 고치세요.",
  tiptap: "고치면 저장할 때 마크다운 모양이 조금 바뀝니다(화면은 같습니다).",
  toast:
    '고치면 문단 안의 줄바꿈이 붙어 띄어쓰기가 사라질 수 있습니다("마음에⏎들었다" → "마음에들었다"). 더 관리되지 않는 편집기입니다.',
};

const MARKDOWN_NOTE =
  "마크다운으로 씁니다. ## 제목, - 목록, ```코드블록```, [링크](주소), 표 지원.";
const PREVIEW_NOTE = "사이트에 보일 모양 그대로입니다.";

function Loading() {
  return (
    <p className="min-h-60 p-4 text-sm text-muted">편집기를 불러오는 중…</p>
  );
}

// 편집기는 쓸 때만 불러온다. 모두 DOM 이 있어야 서니 서버에서는 그리지 않는다
const EDITOR_PARTS: Record<EditorKind, ComponentType<EditorProps>> = {
  milkdown: dynamic(() => import("./MilkdownEditor"), {
    ssr: false,
    loading: Loading,
  }),
  tiptap: dynamic(() => import("./TiptapEditor"), {
    ssr: false,
    loading: Loading,
  }),
  toast: dynamic(() => import("./ToastEditor"), {
    ssr: false,
    loading: Loading,
  }),
};

const Preview = dynamic(() => import("@/components/blog/Markdown"), {
  ssr: false,
  loading: Loading,
});

const STORAGE_KEY = "myhome:markdown-tab";

function isTab(value: unknown): value is TabId {
  return value === "markdown" || value === "editor" || value === "preview";
}

function readSaved(): TabId | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isTab(value) ? value : null;
  } catch {
    // 저장소를 못 쓰는 브라우저면 마크다운 탭으로 둔다
    return null;
  }
}

/** 이 브라우저에서 고른 편집기. 없으면 설정의 기본 편집기를 쓴다 */
const EDITOR_KEY = "myhome:markdown-editor";

function readSavedEditor(): EditorKind | null {
  try {
    const value = localStorage.getItem(EDITOR_KEY);
    return isEditorKind(value) ? value : null;
  } catch {
    return null;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 기억하지 못해도 쓰는 데는 지장이 없다
  }
}

/**
 * 바뀌어도 알리지 않는다. 다른 창에서 탭을 바꿨다고 쓰고 있던 편집기를
 * 갈아 끼우면 안 된다 - 처음 그릴 때 한 번 읽으면 된다
 */
function subscribe() {
  return () => {};
}

/**
 * 그림 올리는 길. 지금 「이미지 올리기」 칸이 쓰는 서버 액션을 그대로 쓴다 -
 * 블로그 · 짧은 글은 uploadImage, 비밀글은 uploadSecretImage.
 */
export type ImageUploadConfig = {
  action: (
    prev: never,
    formData: FormData,
  ) => Promise<{
    error?: string;
    markdown?: string;
    postId?: number;
    secretId?: number;
  }>;
  /** 글 번호를 보내는 칸 이름 */
  idField: "postId" | "secretId";
  /** 지금 글 번호. 새 글이면 null - 첫 그림을 올릴 때 서버가 초안을 만든다 */
  id: number | null;
  /** 함께 보낼 칸(예: kind=note) */
  fields?: Record<string, string>;
  /** 새 글에서 초안이 만들어졌을 때 그 번호를 알린다 */
  onCreated?: (id: number) => void;
};

/** 서버가 준 마크다운 한 줄(![이름](주소))에서 주소와 이름을 뽑는다 */
function parseImage(markdown: string): UploadedImage | null {
  const m = markdown.match(/^!\[(.*)\]\((.+)\)$/);
  return m ? { alt: m[1], url: m[2] } : null;
}

export default function MarkdownField({
  name,
  id,
  label = "본문",
  showLabel = true,
  defaultValue = "",
  rows = 18,
  required,
  placeholder,
  textareaClassName = "",
  imageUpload,
}: {
  /**
   * 붙여넣거나 끌어놓은 그림을 올리는 길(MYH-192). 없으면 그림을 받지 않는다.
   * 서버 화면에서도 넘길 수 있게 서버 액션과 값만 받는다.
   */
  imageUpload?: ImageUploadConfig;
  name: string;
  id?: string;
  /** 읽어 주는 이름. 칸 이름으로도 보인다(showLabel) */
  label?: string;
  showLabel?: boolean;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  textareaClassName?: string;
}) {
  const [markdown, setMarkdown] = useState(defaultValue);
  // 마지막에 쓴 탭(이 브라우저). 서버에서는 없는 것으로 그린다
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  const [chosen, setChosen] = useState<TabId | null>(null);
  const tab: TabId = chosen ?? saved ?? "markdown";
  // 위지윅 탭을 열 때마다 번호를 올려 편집기를 새로 만든다 - 지금 본문으로 그린다
  const [session, setSession] = useState(0);
  const opened = useRef({
    source: defaultValue,
    baseline: null as string | null,
  });

  // 편집기: 이 브라우저에서 고른 것 > 설정의 기본 편집기
  const defaultKind = useEditorChoice();
  const savedKind = useSyncExternalStore(
    subscribe,
    readSavedEditor,
    () => null,
  );
  const [pickedKind, setPickedKind] = useState<EditorKind | null>(null);
  const kind: EditorKind = pickedKind ?? savedKind ?? defaultKind;
  const menu = useRef<HTMLDetailsElement>(null);

  /** 편집기를 새로 연다. 지금 본문으로 그린다 */
  function reopen(source = markdown) {
    opened.current = { source, baseline: null };
    setSession((n) => n + 1);
  }

  function choose(next: TabId) {
    if (next === tab) return;
    setChosen(next);
    reopen();
    remember(STORAGE_KEY, next);
  }

  function pick(next: EditorKind) {
    if (menu.current) menu.current.open = false;
    if (next === kind && tab === "editor") return;
    setPickedKind(next);
    setChosen("editor");
    reopen();
    remember(EDITOR_KEY, next);
    remember(STORAGE_KEY, "editor");
  }

  // 그림 올리기(MYH-192). 한 번에 하나씩 차례로 올린다 - 새 글에서 여러 장을
  // 한꺼번에 넣어도 초안이 하나만 생기게 첫 그림이 받은 번호를 뒤가 이어받는다
  const upload = useRef(imageUpload);
  const postId = useRef<number | null>(imageUpload?.id ?? null);
  useEffect(() => {
    upload.current = imageUpload;
    if (imageUpload?.id != null) postId.current = imageUpload.id;
  });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onImage = useCallback((file: File): Promise<UploadedImage> => {
    const cfg = upload.current;
    if (!cfg) return Promise.reject(new Error("그림을 올릴 수 없는 칸입니다."));
    setUploading((n) => n + 1);
    setUploadError(null);
    const job = queue.current.then(async () => {
      const form = new FormData();
      form.append("file", file);
      if (postId.current !== null)
        form.append(cfg.idField, String(postId.current));
      for (const [k, v] of Object.entries(cfg.fields ?? {})) form.append(k, v);
      const result = await cfg.action(undefined as never, form);
      if (result.error || !result.markdown) {
        throw new Error(result.error ?? "그림을 올리지 못했습니다.");
      }
      const made = result.postId ?? result.secretId;
      if (made !== undefined && postId.current === null) {
        postId.current = made;
        cfg.onCreated?.(made);
      }
      const image = parseImage(result.markdown);
      if (!image) throw new Error("그림 주소를 읽지 못했습니다.");
      return image;
    });
    // 하나가 실패해도 뒤의 것은 올린다
    queue.current = job.catch(() => undefined);
    return job
      .catch((err: Error) => {
        setUploadError(`${file.name}: ${err.message}`);
        throw err;
      })
      .finally(() => setUploading((n) => n - 1));
  }, []);

  // 지금 본문. 그림이 늦게 올라와 넣을 때 그 순간의 본문을 본다.
  // 본문을 바꾸는 곳마다 여기도 함께 바꾼다(put). 그린 뒤 effect 에서 맞추면
  // 한 박자 늦어, 그림 두 장이 잇달아 올라올 때 첫 장을 넣은 본문을 옛 값으로
  // 덮었다(CI 에서 「첫째.png」 가 사라졌다)
  const latest = useRef(markdown);
  const put = useCallback((value: string) => {
    latest.current = value;
    setMarkdown(value);
  }, []);

  /**
   * 마크다운 탭: 붙여넣거나 끌어놓은 그림을 커서 자리에 넣는다. 올리는 것은
   * 차례로 끝나므로, 넣을 자리를 앞의 그림 뒤로 밀며 하나씩 넣는다.
   */
  function dropImages(files: File[], at: number) {
    let offset = at;
    for (const file of files) {
      onImage(file)
        .then(({ url, alt }) => {
          const prev = latest.current;
          const pos = Math.min(offset, prev.length);
          const before = prev.slice(0, pos);
          // 그림은 제 줄에 둔다
          const lead = before === "" || before.endsWith("\n") ? "" : "\n";
          const line = `${lead}![${alt}](${url})\n`;
          const next = before + line + prev.slice(pos);
          offset = pos + line.length;
          put(next);
        })
        .catch(() => {});
    }
  }

  const onReady = useCallback((baseline: string) => {
    opened.current.baseline = baseline;
  }, []);

  const onChange = useCallback((out: string) => {
    const { source, baseline } = opened.current;
    // 되돌려 손대지 않은 모양이 되면 원문 그대로
    put(baseline !== null && out === baseline ? source : out);
  }, [put]);

  const tabs: { id: TabId; label: string; note: string }[] = [
    { id: "markdown", label: "마크다운", note: MARKDOWN_NOTE },
    { id: "editor", label: EDITOR_LABELS[kind], note: EDITOR_NOTES[kind] },
    { id: "preview", label: "미리보기", note: PREVIEW_NOTE },
  ];
  const current = tabs.find((t) => t.id === tab)!;
  const Editor = tab === "editor" ? EDITOR_PARTS[kind] : null;

  return (
    <div data-markdown-field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showLabel ? (
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
        ) : (
          <span />
        )}
        <div
          role="tablist"
          aria-label="편집기 고르기"
          className="flex flex-wrap gap-1 rounded-lg border border-border p-0.5"
        >
          {tabs.map((t) => {
            const active = t.id === tab;
            const button = (
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => choose(t.id)}
                className={`px-2.5 py-1 text-xs ${
                  t.id === "editor" ? "rounded-l-md" : "rounded-md"
                } ${active ? "font-medium" : "text-muted"}`}
              >
                {t.label}
              </button>
            );
            const look = active ? "bg-foreground/10" : "hover:bg-foreground/5";
            if (t.id !== "editor") {
              return (
                <span
                  key={t.id}
                  className={`flex rounded-md transition-colors ${look}`}
                >
                  {button}
                </span>
              );
            }
            // 편집기 탭은 이름과 ▾ 가 한 덩어리다. 이름은 탭, ▾ 는 셋 중 고르기
            return (
              <span
                key={t.id}
                className={`relative flex items-stretch rounded-md transition-colors ${look}`}
              >
                {button}
                <details ref={menu} className="flex">
                  <summary
                    aria-label="편집기 바꾸기"
                    className={`flex cursor-pointer list-none items-center rounded-r-md border-l border-border px-1.5 text-[10px] [&::-webkit-details-marker]:hidden ${
                      active ? "" : "text-muted"
                    }`}
                  >
                    ▾
                  </summary>
                  <div
                    role="menu"
                    aria-label="편집기"
                    className="absolute top-full right-0 z-20 mt-1 w-40 rounded-lg border border-border bg-background p-1 shadow-lg"
                  >
                    {EDITORS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        role="menuitemradio"
                        aria-checked={e === kind}
                        onClick={() => pick(e)}
                        className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-foreground/5 ${
                          e === kind ? "font-medium" : "text-muted"
                        }`}
                      >
                        {EDITOR_LABELS[e]}
                        {e === defaultKind ? " (기본)" : ""}
                      </button>
                    ))}
                  </div>
                </details>
              </span>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">{current.note}</p>

      {/* 탭과 상관없이 늘 폼에 있다. 저장되는 것은 이것이다 */}
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={markdown}
        onChange={(e) => {
          put(e.target.value);
          // 숨은 칸이 바뀌는 것은 밖에서 넣었을 때뿐이다(보관본 되살리기,
          // MYH-193). 열린 편집기를 그 본문으로 새로 그린다
          if (tab !== "markdown") reopen(e.target.value);
        }}
        onPaste={(e) => {
          const files = imageFiles(e.clipboardData.files);
          if (!imageUpload || files.length === 0) return;
          e.preventDefault();
          dropImages(files, e.currentTarget.selectionStart);
        }}
        onDragOver={(e) => {
          if (imageUpload && e.dataTransfer.types.includes("Files"))
            e.preventDefault();
        }}
        onDrop={(e) => {
          const files = imageFiles(e.dataTransfer.files);
          if (!imageUpload || files.length === 0) return;
          e.preventDefault();
          dropImages(files, e.currentTarget.selectionStart);
        }}
        required={required}
        placeholder={placeholder}
        aria-label={label}
        hidden={tab !== "markdown"}
        className={`mt-2 ${textareaClassName}`}
      />

      {Editor ? (
        // 긴 글도 칸 높이는 마크다운 칸과 비슷하게 둔다. 안에서 굴린다
        <div
          className={
            // Toast UI 는 제 높이로 안에서 굴린다(도구 줄이 남도록)
            kind === "toast"
              ? "mt-2 rounded-lg"
              : "mt-2 max-h-[70vh] overflow-auto rounded-lg"
          }
          role="tabpanel"
          aria-label={current.label}
        >
          <Editor
            key={`${kind}-${session}`}
            initial={markdown}
            onReady={onReady}
            onChange={onChange}
            onImage={imageUpload ? onImage : undefined}
          />
        </div>
      ) : null}

      {tab === "preview" ? (
        <div
          className="mt-2 max-h-[70vh] overflow-auto rounded-lg border border-border p-5"
          role="tabpanel"
          aria-label="미리보기"
        >
          {markdown.trim() ? (
            <Preview>{markdown}</Preview>
          ) : (
            <p className="text-sm text-muted">본문이 비어 있습니다.</p>
          )}
        </div>
      ) : null}
      {uploading > 0 ? (
        <p role="status" className="mt-2 text-xs text-muted">
          그림 올리는 중… ({uploading})
        </p>
      ) : null}
      {uploadError ? (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
