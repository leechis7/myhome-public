"use client";

import { createContext, useContext } from "react";
import { DEFAULT_EDITOR, type EditorKind } from "@/lib/posts/editor-kinds";

/**
 * 고른 글 편집기를 본문 칸까지 나른다. 관리 화면의 틀(app/admin/layout.tsx)이
 * 설정을 읽어 여기 담고, 본문 칸(MarkdownField)이 꺼내 쓴다.
 */
const EditorChoice = createContext<EditorKind>(DEFAULT_EDITOR);

export function EditorChoiceProvider({
  value,
  children,
}: {
  value: EditorKind;
  children: React.ReactNode;
}) {
  return <EditorChoice value={value}>{children}</EditorChoice>;
}

export function useEditorChoice() {
  return useContext(EditorChoice);
}
