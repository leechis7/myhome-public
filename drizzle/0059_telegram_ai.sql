-- 텔레그램으로 온 글을 AI(Gemini)로 먼저 가를지(MYH-233).
--
-- 켜면 할 일 · 메모 · 저장 안 함을 AI 가 정하고 제목 · 날짜를 다듬는다. 실패하면
-- 지금 규칙으로. 기본은 끔 - 보낸 글이 Google 로 나가므로 켜는 것은 사람이 정한다.

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "telegram_ai" boolean DEFAULT false NOT NULL;--> statement-breakpoint
COMMENT ON COLUMN site_settings.telegram_ai IS '텔레그램 글을 AI 로 먼저 가르나(MYH-233). 기본 끔';
