-- .env 에만 있던 바깥 연결 설정을 화면에서도 정한다(MYH-232).
--
-- 카카오 키(MYH-231)처럼 .env 에 값이 있으면 그것이 먼저고, 없으면 여기 것을
-- 쓴다. 봇 토큰은 그것만 있으면 남이 봇을 부릴 수 있어 암호화해 둔다.

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "telegram_bot_token" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "telegram_chat_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "umami_website_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "google_site_verification" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "monitoring_dashboard" text;--> statement-breakpoint
COMMENT ON COLUMN site_settings.telegram_bot_token IS '암호문. 텔레그램 알림 봇 토큰(MYH-232). .env 의 TELEGRAM_BOT_TOKEN 이 먼저';--> statement-breakpoint
COMMENT ON COLUMN site_settings.telegram_chat_id IS '텔레그램 내 대화방 번호. .env 의 TELEGRAM_CHAT_ID 가 먼저';--> statement-breakpoint
COMMENT ON COLUMN site_settings.umami_website_id IS 'umami 사이트 ID. .env 의 UMAMI_WEBSITE_ID 가 먼저';--> statement-breakpoint
COMMENT ON COLUMN site_settings.google_site_verification IS 'Search Console 소유 확인 값. .env 의 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION 이 먼저';--> statement-breakpoint
COMMENT ON COLUMN site_settings.monitoring_dashboard IS '감시 화면의 Grafana 대시보드 경로. .env 의 MONITORING_DASHBOARD 가 먼저';
