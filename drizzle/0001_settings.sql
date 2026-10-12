-- 환경설정을 키 · 값 테이블로(MYH-232). 설정마다 site_settings 에 컬럼을 더하던
-- 것을 그만두고, 키 하나에 줄 하나로 둔다. 어떤 키가 있는지는 lib/site/settings.ts
-- 의 SETTINGS 에 적는다 - 설정을 더해도 마이그레이션이 없다.
--
-- site_settings 의 설정 컬럼 값을 그대로 옮긴다(암호문은 암호문 그대로). 키는 옛
-- 컬럼 이름. telegram_ai 는 켰을 때만 'on' 으로. site_settings 에는 사이트 정보
-- (이름 · 제목 · 한 줄 소개 · 설명 · 대표 메일)만 남는다.
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
COMMENT ON TABLE settings IS '환경설정 (키 하나에 줄 하나). 키 목록 · 종류는 lib/site/settings.ts. 비밀인 값은 암호문';--> statement-breakpoint
COMMENT ON COLUMN settings.key IS '설정 이름 (telegram_bot_token 같은 것)';--> statement-breakpoint
COMMENT ON COLUMN settings.value IS '값. 비밀인 키는 암호문(SECRETS_KEY), 켜기/끄기는 on · off';--> statement-breakpoint
COMMENT ON COLUMN settings.updated_at IS '고친 때';--> statement-breakpoint
-- 컬럼 이름을 적지 않고 줄을 jsonb 로 펴서 옮긴다 - 어느 판의 DB 든(설정 컬럼이
-- 몇 개든) 있는 것만 옮긴다
INSERT INTO settings (key, value, updated_at)
SELECT e.key,
       CASE WHEN e.key = 'telegram_ai' THEN 'on' ELSE e.value END,
       s.updated_at
FROM site_settings s,
     jsonb_each_text(
       to_jsonb(s) - ARRAY['id', 'name', 'title', 'tagline', 'description', 'email', 'updated_at']
     ) e
WHERE e.value IS NOT NULL
  AND e.value <> ''
  AND NOT (e.key = 'telegram_ai' AND e.value = 'false')
ON CONFLICT (key) DO NOTHING;--> statement-breakpoint
ALTER TABLE site_settings
	DROP CONSTRAINT IF EXISTS site_settings_editor,
	DROP COLUMN IF EXISTS editor,
	DROP COLUMN IF EXISTS calendar_ical,
	DROP COLUMN IF EXISTS kakao_rest_key,
	DROP COLUMN IF EXISTS telegram_bot_token,
	DROP COLUMN IF EXISTS telegram_chat_id,
	DROP COLUMN IF EXISTS umami_website_id,
	DROP COLUMN IF EXISTS google_site_verification,
	DROP COLUMN IF EXISTS monitoring_dashboard,
	DROP COLUMN IF EXISTS gemini_api_key,
	DROP COLUMN IF EXISTS telegram_ai,
	DROP COLUMN IF EXISTS calibre_url,
	DROP COLUMN IF EXISTS calibre_user,
	DROP COLUMN IF EXISTS calibre_password,
	DROP COLUMN IF EXISTS book_sources,
	DROP COLUMN IF EXISTS book_summary_prompt;
