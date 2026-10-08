-- 글 편집기 고르기(MYH-118).
--
-- 본문 칸의 「편집기」 탭에 어느 위지윅 편집기를 띄울지. 비어 있으면 기본값
-- (Milkdown, components/admin/markdown/editor-choice.tsx)이다. 사이트 정보와
-- 같은 한 줄에 둔다 - 관리 › 설정 › 사이트 화면에서 고친다.

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "editor" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_editor" CHECK ("editor" IS NULL OR "editor" IN ('milkdown', 'tiptap', 'toast'));--> statement-breakpoint
COMMENT ON COLUMN site_settings.editor IS '글 편집기: milkdown / tiptap / toast. 비우면 milkdown';
