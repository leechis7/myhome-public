import { EditorChoiceProvider } from "@/components/admin/markdown/editor-choice";
import { editorOf } from "@/lib/posts/editor-kinds";
import { siteConfig } from "@/lib/site/settings";

/**
 * 관리 화면들의 틀.
 *
 * 전에는 머리글 아래에 관리 메뉴 띠(AdminBar)를 붙였다. 지금은 위쪽 메뉴의
 * "관리" 그룹이 그 일을 한다 — 같은 것을 두 군데 둘 이유가 없다(MYH-125).
 * 로그아웃도 그 그룹 맨 아래로 옮겼다.
 *
 * 고른 글 편집기(관리 › 설정 › 환경설정 · .env 의 DEFAULT_EDITOR)를 여기서 한 번 읽어 본문 칸들에 나른다
 * (MYH-118). DB 에 닿지 못하면 기본 편집기로 연다 - 글을 못 쓰게 되면 안 된다.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // .env 의 DEFAULT_EDITOR 가 먼저(MYH-232)
  const editor = editorOf((await siteConfig()).editor);
  return <EditorChoiceProvider value={editor}>{children}</EditorChoiceProvider>;
}
