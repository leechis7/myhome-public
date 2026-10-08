-- 프로필 화면 다시 짜기(MYH-220).
--
-- 1. 소개에서 방문자에게 보일 항목. 처음은 전부(지금까지와 같다).
-- 2. 관리 › 설정 의 「프로필 · 이력서」 를 「프로필」 로(0047 이 붙인 이름일 때만).

ALTER TABLE "profile" ADD COLUMN "about_sections" text[] DEFAULT '{contacts,career,skills,books,work}'::text[] NOT NULL;--> statement-breakpoint
COMMENT ON COLUMN profile.about_sections IS '소개(/about)에서 방문자에게 보일 항목(contacts · career · skills · books · work). 관리자에게는 늘 전부';--> statement-breakpoint
UPDATE "menus" SET label = '프로필'
WHERE href = '/admin' AND label = '프로필 · 이력서';
