import { Node, mergeAttributes } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import { Table, escapeTableCellPipes } from "@tiptap/extension-table";
import { escapeLineStarts } from "./markdown-fixes";

/**
 * TipTap 이 마크다운을 뽑을 때 우리 글을 흔드는 곳 셋을 고친다(MYH-118 비교).
 */

/**
 * 1. 문단 안 줄머리의 블록 표시를 다시 막는다(markdown-fixes.ts).
 */
// 원래 것은 this 를 쓰지 않는 함수라 그대로 불러 쓴다
const renderParagraph = Paragraph.config.renderMarkdown!;

export const SafeParagraph = Paragraph.extend({
  renderMarkdown(node, h, ctx) {
    return escapeLineStarts(renderParagraph.call(this, node, h, ctx));
  },
});

/**
 * 2. 표를 줄 맞추지 않고, 칸 안의 `|` 를 막는다.
 *
 * TipTap 은 칸 안 인라인 코드의 `\|` 를 풀어 칸이 둘로 쪼개졌다. 또 칸을
 * 공백으로 줄 맞춰 한 글자만 고쳐도 표 전체가 바뀌었다.
 */
type Cell = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
};
type Row = { content?: Cell[] };

export const SafeTable = Table.extend({
  renderMarkdown(node, h) {
    const rows = ((node.content ?? []) as Row[]).map((row) =>
      (row.content ?? []).map((cell) => ({
        header: cell.type === "tableHeader",
        align: (cell.attrs?.align as string | null | undefined) ?? null,
        text: escapeTableCellPipes(
          h
            .renderChildren((cell.content ?? []) as never)
            .replace(/\s*\n\s*/g, "<br>")
            .trim(),
        ),
      })),
    );
    if (rows.length === 0) return "";
    const width = Math.max(...rows.map((r) => r.length));
    const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
    const head = rows[0];
    const aligns = Array.from({ length: width }, (_, i) =>
      rows.map((r) => r[i]?.align).find(Boolean),
    );
    const delim = aligns.map((a) =>
      a === "left"
        ? ":---"
        : a === "right"
          ? "---:"
          : a === "center"
            ? ":---:"
            : "---",
    );
    const pad = (r: { text: string }[]) =>
      Array.from({ length: width }, (_, i) => r[i]?.text ?? "");
    return [
      line(pad(head)),
      line(delim),
      ...rows.slice(1).map((r) => line(pad(r))),
    ].join("\n");
  },
});

/**
 * 3. 본문 속 HTML 블록을 그대로 둔다.
 *
 * TipTap 은 `<details>` 같은 HTML 을 자기 노드로 풀어 버려 태그가 사라졌다.
 * 고칠 수 없는 한 덩어리로 들고 있다가 그대로 뽑는다. (문단 안의 짧은 HTML 은
 * 이 길로 오지 않는다. 운영 글에는 없다)
 */
export const RawHtmlBlock = Node.create({
  name: "rawHtmlBlock",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { html: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "pre[data-raw-html]",
        getAttrs: (el) => ({ html: (el as HTMLElement).textContent ?? "" }),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, {
        "data-raw-html": "",
        title: "HTML - 마크다운 탭에서 고칩니다",
        class: "rounded bg-foreground/5 p-3 font-mono text-xs text-muted",
      }),
      node.attrs.html as string,
    ];
  },
  markdownTokenName: "html",
  parseMarkdown(token) {
    const t = token as { block?: boolean; raw?: string; text?: string };
    // 블록 HTML 만 맡는다. 비어 있으면 넘긴다
    if (!t.block) return [];
    const html = (t.raw ?? t.text ?? "").replace(/\n+$/, "");
    return html.trim() ? { type: "rawHtmlBlock", attrs: { html } } : [];
  },
  renderMarkdown(node) {
    return (node.attrs?.html as string) ?? "";
  },
});
