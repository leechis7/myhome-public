-- 스팸으로 보고 숨긴 댓글 · 방명록(MYH-252). 비어 있으면 보이는 글이다. 있던 글은 그대로 보인다.
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "hidden_reason" text;--> statement-breakpoint
COMMENT ON COLUMN comments.hidden_at IS '숨긴 때(MYH-252). AI 가 스팸으로 보았거나 관리자가 숨겼다. 비어 있으면 보인다';--> statement-breakpoint
COMMENT ON COLUMN comments.hidden_reason IS '숨긴 까닭 한 줄(AI 의 말). 관리자에게만 보인다';
