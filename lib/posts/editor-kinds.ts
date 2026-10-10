/**
 * 글 편집기 고르기(MYH-118). 위지윅 편집기 셋 가운데 하나를 설정에서 고른다
 * (site_settings.editor). 서버(설정 화면 · 틀)와 클라이언트(본문 칸)가 함께
 * 쓰므로 "use client" 파일과 떼어 둔다.
 */
export const EDITORS = ["milkdown", "tiptap", "toast"] as const;
export type EditorKind = (typeof EDITORS)[number];

/** 기본값. 비교에서 왕복이 가장 고왔다 */
export const DEFAULT_EDITOR: EditorKind = "milkdown";

export const EDITOR_LABELS: Record<EditorKind, string> = {
  milkdown: "Milkdown",
  tiptap: "TipTap",
  toast: "Toast UI",
};

export function isEditorKind(value: unknown): value is EditorKind {
  return (EDITORS as readonly unknown[]).includes(value);
}

/** 저장된 값을 편집기로. 비었거나 모르는 값이면 기본값 */
export function editorOf(value: string | null | undefined): EditorKind {
  return isEditorKind(value) ? value : DEFAULT_EDITOR;
}
