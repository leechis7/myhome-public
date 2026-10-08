"use client";

import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import { RawHtmlBlock, SafeParagraph, SafeTable } from "./tiptap-markdown";
import { imageFiles, type EditorProps, type UploadedImage } from "./types";
import type { EditorView } from "@tiptap/pm/view";

/**
 * TipTap + @tiptap/markdown. 한글 입력이 가장 곱고 가볍다. 뽑는 쪽의 약한
 * 곳 셋은 tiptap-markdown.ts 에서 고쳤다.
 */
export default function TiptapEditor({
  initial,
  onReady,
  onChange,
  onImage,
}: EditorProps) {
  // useEditor 는 옵션을 만들 때 한 번 읽는다. initial 이 바뀌면 부모가 key 로
  // 새로 만들고, onReady · onChange 는 부모가 바뀌지 않는 함수로 준다
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ paragraph: false }),
      SafeParagraph,
      SafeTable,
      TableRow,
      TableHeader,
      TableCell,
      Image,
      RawHtmlBlock,
      Markdown,
    ],
    content: initial,
    contentType: "markdown",
    immediatelyRender: false,
    onCreate: ({ editor }) => onReady(editor.getMarkdown()),
    onUpdate: ({ editor }) => onChange(editor.getMarkdown()),
    editorProps: {
      // 붙여넣거나 끌어놓은 그림을 올려 그 자리에 넣는다(MYH-192)
      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!onImage || files.length === 0) return false;
        insertImages(view, files, view.state.selection.from, onImage);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = imageFiles(event.dataTransfer?.files);
        if (moved || !onImage || files.length === 0) return false;
        const at =
          view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
          view.state.selection.from;
        insertImages(view, files, at, onImage);
        return true;
      },
      attributes: {
        "data-editor": "tiptap",
        class: [
          "min-h-60 space-y-3 rounded-lg border border-border p-4 leading-relaxed text-foreground outline-none focus:border-foreground/40",
          "[&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted",
          "[&_pre]:rounded [&_pre]:bg-foreground/5 [&_pre]:p-3 [&_pre]:text-sm [&_code]:font-mono",
          // 인라인 코드는 사이트 본문과 같은 모양. 코드 블록 안에서는 뺀다
          "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-foreground/[0.07] [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.9em]",
          "[&_table]:w-full [&_td]:border [&_th]:border [&_td]:border-border [&_th]:border-border [&_td]:px-2 [&_th]:px-2",
          "[&_img]:max-w-full [&_a]:underline",
        ].join(" "),
      },
    },
  });

  return (
    <div>
      {editor ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * 그림을 차례로 올리고, 다 올라오는 대로 정한 자리부터 넣는다. 올리는 사이에
 * 글이 바뀌었을 수 있어 넣을 자리는 문서 길이 안으로 줄인다.
 */
function insertImages(
  view: EditorView,
  files: File[],
  at: number,
  onImage: (file: File) => Promise<UploadedImage>,
) {
  let pos = at;
  for (const file of files) {
    onImage(file)
      .then(({ url, alt }) => {
        if (view.isDestroyed) return;
        const image = view.state.schema.nodes.image?.create({ src: url, alt });
        if (!image) return;
        const where = Math.min(pos, view.state.doc.content.size);
        view.dispatch(view.state.tr.insert(where, image));
        pos = where + image.nodeSize;
      })
      .catch(() => {});
  }
}

/**
 * 도구 줄. TipTap 은 화면이 없는 편집기라 단추를 우리가 둔다. 우리 글에 쓰는
 * 것만 둔다 - 마크다운 단축 입력(## · - · > · ```)도 그대로 된다.
 */
function Toolbar({ editor }: { editor: Editor }) {
  // 커서가 있는 곳에 따라 단추를 눌린 모양으로 보인다
  const on = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("code"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
    }),
  });
  const run = () => editor.chain().focus();
  const items: {
    label: string;
    title: string;
    active?: boolean;
    act: () => void;
  }[] = [
    {
      label: "B",
      title: "굵게",
      active: on.bold,
      act: () => run().toggleBold().run(),
    },
    {
      label: "I",
      title: "기울임",
      active: on.italic,
      act: () => run().toggleItalic().run(),
    },
    {
      label: "H2",
      title: "제목 둘",
      active: on.h2,
      act: () => run().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "H3",
      title: "제목 셋",
      active: on.h3,
      act: () => run().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "•",
      title: "점 목록",
      active: on.bullet,
      act: () => run().toggleBulletList().run(),
    },
    {
      label: "1.",
      title: "번호 목록",
      active: on.ordered,
      act: () => run().toggleOrderedList().run(),
    },
    {
      label: "❝",
      title: "인용",
      active: on.quote,
      act: () => run().toggleBlockquote().run(),
    },
    {
      label: "`",
      title: "인라인 코드",
      active: on.code,
      act: () => run().toggleCode().run(),
    },
    {
      label: "{ }",
      title: "코드 블록",
      active: on.codeBlock,
      act: () => run().toggleCodeBlock().run(),
    },
    {
      label: "링크",
      title: "링크",
      active: on.link,
      act: () => {
        const url = window.prompt(
          "주소",
          editor.getAttributes("link").href ?? "https://",
        );
        if (url === null) return;
        if (url.trim() === "") run().unsetLink().run();
        else run().extendMarkRange("link").setLink({ href: url.trim() }).run();
      },
    },
    {
      label: "표",
      title: "표 넣기(3×3)",
      act: () =>
        run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    { label: "―", title: "가로줄", act: () => run().setHorizontalRule().run() },
  ];
  return (
    <div
      role="toolbar"
      aria-label="TipTap 도구"
      className="sticky top-0 z-10 mb-2 flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1"
    >
      {items.map((it) => (
        <button
          key={it.title}
          type="button"
          title={it.title}
          aria-label={it.title}
          aria-pressed={it.active ?? undefined}
          onMouseDown={(e) => e.preventDefault()}
          onClick={it.act}
          className={`min-w-8 rounded px-2 py-1 text-xs ${it.active ? "bg-foreground/10 font-semibold" : "hover:bg-foreground/5"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
