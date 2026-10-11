-- 책 찾기에 내 Calibre 서재를 더한다(MYH-226).
--
-- Calibre 콘텐츠 서버의 주소 · 아이디 · 비밀번호. 서재에 있는 책은 소개 · 표지 ·
-- ISBN 을 가져온다(원서도). .env 의 CALIBRE_URL · CALIBRE_USER · CALIBRE_PASSWORD
-- 가 먼저다. 비밀번호는 암호화해 둔다.

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "calibre_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "calibre_user" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "calibre_password" text;--> statement-breakpoint
COMMENT ON COLUMN site_settings.calibre_password IS '암호문. Calibre 콘텐츠 서버 비밀번호(MYH-226). .env 의 CALIBRE_PASSWORD 가 먼저';
