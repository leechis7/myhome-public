-- 이력서에만 쓰는 인적 사항 · 학력 · 교육 · 자격증(MYH-198).
--
-- 소개 화면에는 나오지 않는다. /resume 에서 관리자에게는 늘 전부, 방문자에게는
-- resume_profile.public_sections 에 고른 항목만 보인다. 처음 값은 지금까지
-- 보이던 경력 · 기술 · 수행 업무다.
--
-- 관리 › 설정 › 의 프로필 뒤(순서 15)에 「이력서」 줄을 더한다. 설정 그룹이 있을 때만.

CREATE TABLE IF NOT EXISTS "resume_profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"birth_date" date,
	"company" text,
	"gender" text,
	"final_school" text,
	"major" text,
	"degree" text,
	"public_sections" text[] DEFAULT '{career,skills,work}'::text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resume_profile_single_row" CHECK ("id" = 1)
);--> statement-breakpoint
INSERT INTO "resume_profile" ("id") VALUES (1) ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resume_schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_on" varchar(7),
	"ended_on" varchar(7),
	"school" text NOT NULL,
	"major" text,
	"note" text
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resume_trainings" (
	"id" serial PRIMARY KEY NOT NULL,
	"taken_on" varchar(7),
	"course" text NOT NULL,
	"institution" text,
	"note" text
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resume_licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"acquired_on" date,
	"name" text NOT NULL,
	"number" text,
	"issuer" text
);--> statement-breakpoint
COMMENT ON TABLE resume_profile IS '이력서에만 쓰는 인적 사항. 한 행. 소개에는 안 나온다';--> statement-breakpoint
COMMENT ON COLUMN resume_profile.public_sections IS '방문자에게 /resume 에서 보일 항목(personal · schools · trainings · licenses · career · skills · work)';--> statement-breakpoint
COMMENT ON TABLE resume_schools IS '이력서의 학력. 기간은 YYYY-MM';--> statement-breakpoint
COMMENT ON TABLE resume_trainings IS '이력서의 교육 사항. 때는 YYYY-MM';--> statement-breakpoint
COMMENT ON TABLE resume_licenses IS '이력서의 자격증';--> statement-breakpoint
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT s.id, 15, '이력서', '/admin/resume', 'admin'
FROM "menus" s
JOIN "menus" g ON g.id = s.parent_id AND g.parent_id IS NULL AND g.label = '관리'
WHERE s.label = '설정' AND s.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/resume')
LIMIT 1;
