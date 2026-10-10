-- 카카오 책 검색 키를 화면에서 넣는다(MYH-231).
--
-- 지금까지는 .env 의 KAKAO_REST_API_KEY 뿐이라 휴대폰에서는 넣을 수 없었다.
-- 관리 › 설정 › 사이트 에서 넣고, 암호화해서 둔다. .env 에 값이 있으면 그것이 먼저다.

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "kakao_rest_key" text;--> statement-breakpoint
COMMENT ON COLUMN site_settings.kakao_rest_key IS '암호문. 카카오 책 검색 REST API 키(MYH-231). .env 의 KAKAO_REST_API_KEY 가 먼저';
