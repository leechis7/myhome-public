"use client";

import { useEffect, useRef } from "react";
import Editor from "@toast-ui/editor";
import DOMPurify from "dompurify";
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";
// 도구 줄의 풀이 글자를 우리말로
import "@toast-ui/editor/dist/i18n/ko-kr";
import { fixTablePipes } from "./markdown-fixes";
import type { EditorProps } from "./types";
import { useTheme } from "@/components/useTheme";

/**
 * Toast UI Editor(바닐라). React 래퍼는 React 17 용이라 직접 감싼다.
 *
 * - 저장소가 보관(archived) 상태다. 안에 묶인 DOMPurify 가 2.3.3(2021)이라
 *   알려진 XSS 우회가 있어, 지금 쓰는 DOMPurify 3 을 sanitizer 로 끼운다
 * - 기본값으로 사용 통계를 Google Analytics 에 보낸다. 끈다
 * - 고치면 문단 안의 줄바꿈과 두 칸 줄바꿈이 붙는다("마음에⏎들었다" →
 *   "마음에들었다"). 고칠 길을 찾지 못했다 - 탭 안내에 적어 둔다
 */
export default function ToastEditor({
  initial,
  onReady,
  onChange,
  onImage,
}: EditorProps) {
  const root = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onReady, onChange, onImage });
  useEffect(() => {
    handlers.current = { onReady, onChange, onImage };
  });
  // initial 은 만들 때만 읽는다. 바뀌면 부모가 key 로 새로 만든다
  const start = useRef(initial);

  useEffect(() => {
    if (!root.current) return;
    let ready = false;
    const editor = new Editor({
      el: root.current,
      initialValue: start.current,
      initialEditType: "wysiwyg",
      hideModeSwitch: true,
      // 높이를 정해 두면 Toast UI 가 안에서 굴리고 도구 줄은 제자리에 남는다.
      // "auto" 로 두고 바깥에서 굴리면 도구 줄이 같이 올라가 버렸다
      height: "70vh",
      minHeight: "240px",
      language: "ko-KR",
      usageStatistics: false,
      customHTMLSanitizer: (html: string) => DOMPurify.sanitize(html),
      // 붙여넣거나 끌어놓은 그림, 도구 줄의 그림 넣기(MYH-192). 올릴 길이
      // 없으면 Toast UI 기본(글 안에 base64 로 박기)을 막는다 - 본문이 부푼다
      hooks: {
        addImageBlobHook: (blob, done) => {
          const send = handlers.current.onImage;
          if (!send || !(blob instanceof File)) return;
          send(blob)
            .then(({ url, alt }) => done(url, alt))
            .catch(() => {});
        },
      },
      events: {
        change: () => {
          if (ready)
            handlers.current.onChange(fixTablePipes(editor.getMarkdown()));
        },
      },
    });
    ready = true;
    handlers.current.onReady(fixTablePipes(editor.getMarkdown()));
    return () => editor.destroy();
  }, []);

  // 어두운 테마. Toast UI 는 바깥 틀에 붙는 class 하나로 바뀐다. 테마를
  // 바꿔도 편집기를 새로 만들지 않고 class 만 갈아 끼운다
  const theme = useTheme();
  useEffect(() => {
    root.current
      ?.querySelector(".toastui-editor-defaultUI")
      ?.classList.toggle("toastui-editor-dark", theme === "dark");
  }, [theme]);

  return <div ref={root} data-editor="toast" />;
}
