-- 사이트 정보를 DB 로 옮긴다(MYH-169).
--
-- 이름 · 제목 · 설명 · 대표 메일 · 한 줄 소개가 lib/site.ts 에 박혀 있어서
-- 남이 받아 쓰려면 코드를 고쳐야 했다. 한 행짜리 테이블로 옮기고 관리 ›
-- 설정 › 사이트 에서 고친다.
--
-- **처음 값을 넣지 않는다.** 이 파일은 공개 저장소로도 나간다. 행이 없으면
-- 앱이 보기 값(lib/site.ts 의 DEFAULT_SITE)을 쓴다. 이미 쓰고 있는 사이트는
-- 이 마이그레이션이 돌기 전에 행을 미리 넣어 두면 배포하는 순간 보기 값으로
-- 바뀌지 않는다 — CREATE TABLE IF NOT EXISTS 라 먼저 만들어 둬도 된다.

CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text,
	"title" text,
	"tagline" text,
	"description" text,
	"email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_single_row" CHECK ("site_settings"."id" = 1)
);--> statement-breakpoint
COMMENT ON TABLE site_settings IS '사이트 정보 (한 행). 비면 앱의 보기 값을 쓴다';--> statement-breakpoint
COMMENT ON COLUMN site_settings.name IS '머리글 왼쪽 · 저작권 줄 · 아이콘 글자 · 글쓴이';--> statement-breakpoint
COMMENT ON COLUMN site_settings.title IS '브라우저 탭과 검색 결과의 제목';--> statement-breakpoint
COMMENT ON COLUMN site_settings.tagline IS '공유 카드의 한 줄 소개';--> statement-breakpoint
COMMENT ON COLUMN site_settings.description IS '검색 결과 설명 · RSS 설명';--> statement-breakpoint
COMMENT ON COLUMN site_settings.email IS '대표 메일 (구조화 데이터)';--> statement-breakpoint
-- 이미 쓰고 있는 메뉴에 「사이트」 줄을 더한다. 관리 › 설정 묶음이 있을 때만,
-- 그 안의 맨 앞(프로필 앞)에. 메뉴를 고쳐서 설정 묶음이 없으면 더하지 않는다
-- — /admin/site 주소로는 늘 들어간다.
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT s.id, 5, '사이트', '/admin/site', 'admin'
FROM "menus" s
JOIN "menus" g ON g.id = s.parent_id AND g.parent_id IS NULL AND g.label = '관리'
WHERE s.label = '설정' AND s.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/site')
LIMIT 1;
