-- 책 소개를 한두 줄로 요약할 Gemini 키(MYH-233).
--
-- 외부 연동(MYH-232)의 다른 값처럼 .env 의 GEMINI_API_KEY 가 먼저고, 없으면
-- 화면에서 넣은 것을 쓴다. 남이 알면 내 한도를 쓰므로 암호화해 둔다.

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "gemini_api_key" text;--> statement-breakpoint
COMMENT ON COLUMN site_settings.gemini_api_key IS '암호문. Gemini API 키(MYH-233). .env 의 GEMINI_API_KEY 가 먼저';
