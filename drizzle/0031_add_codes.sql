-- 코드 테이블을 둔다(MYH-131).
--
-- 내 서비스와 기술의 분류가 글자 그대로 들어 있어서, 오타 하나면 새 분류가
-- 생기고 이름을 바꾸려면 쓰는 줄을 다 고쳐야 했다. 흔한 「공통코드」 모양으로
-- 옮긴다: 묶음(code_groups)과 그 안의 코드(codes), 키는 (묶음 번호, 코드).
-- 번호는 뜻 없는 다섯 자리 글자(00001 …)다. 코드는 나중에 글자로 적어도 된다.
--
-- 쓰는 쪽은 (category_group, category_code) 두 컬럼으로 가리킨다. 묶음 컬럼은
-- 값이 하나로 고정(CHECK)이라, 외래 키가 다른 묶음의 코드를 끼워 넣는 것까지
-- 막는다. 코드를 바꾸면 쓰는 줄도 따라 바뀐다(ON UPDATE CASCADE).
--
-- 순서: 묶음 → 코드 테이블 → 지금 쓰고 있는 분류 글자를 코드로 → 쓰는 줄에
-- 코드를 채움 → 옛 글자 컬럼을 지움. 이 파일 하나가 한 트랜잭션이라
-- (scripts/migrate.mjs) 중간에 실패하면 전부 되돌아간다.
--
-- 코드의 순서와 번호는 지금 화면에 나오는 순서(그 분류를 쓰는 줄 가운데 가장
-- 앞의 정렬 순서)를 따른다. 지금은 분류가 「처음 나온 순서」 로 묶여 나온다.

CREATE TABLE IF NOT EXISTS "code_groups" (
	"group_code" varchar(20) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
COMMENT ON TABLE code_groups IS '코드 묶음. 고르는 칸 하나가 묶음 하나다';--> statement-breakpoint
COMMENT ON COLUMN code_groups.group_code IS '묶음 번호(00001 …). 프로그램은 lib/code-groups.ts 의 이름으로 부른다';--> statement-breakpoint
COMMENT ON COLUMN code_groups.name IS '화면에 보이는 묶음 이름';--> statement-breakpoint
COMMENT ON COLUMN code_groups.sort_order IS '코드 화면에 묶음이 나오는 순서';--> statement-breakpoint
INSERT INTO "code_groups" ("group_code", "name", "sort_order") VALUES
	('00001', '내 서비스 분류', 10),
	('00002', '기술 분류', 20)
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codes" (
	"group_code" varchar(20) NOT NULL,
	"code" varchar(20) NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "codes_group_code_code_pk" PRIMARY KEY("group_code","code"),
	CONSTRAINT "codes_group_label" UNIQUE("group_code","label"),
	CONSTRAINT "codes_group_code_code_groups_group_code_fk" FOREIGN KEY ("group_code") REFERENCES "public"."code_groups"("group_code") ON DELETE restrict ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "codes_group_sort_idx" ON "codes" USING btree ("group_code","sort_order");--> statement-breakpoint
COMMENT ON TABLE codes IS '고르는 칸의 이름표. 쓰는 쪽은 (묶음, 코드)를 가리킨다';--> statement-breakpoint
COMMENT ON COLUMN codes.group_code IS '어느 묶음의 것인가(code_groups)';--> statement-breakpoint
COMMENT ON COLUMN codes.code IS '묶음 안의 코드. 비워 두고 더하면 다음 번호(00001 …). 글자로 적어도 되고, 바꾸면 쓰는 줄도 따라 바뀐다';--> statement-breakpoint
COMMENT ON COLUMN codes.label IS '화면에 보이는 이름. 고쳐도 쓰는 줄은 그대로다';--> statement-breakpoint
COMMENT ON COLUMN codes.sort_order IS '묶음 안의 순서. 분류가 나오는 순서';--> statement-breakpoint
COMMENT ON COLUMN codes.active IS '끄면 고르는 칸에서 빠진다. 이미 붙은 줄에는 그대로 보인다';--> statement-breakpoint
INSERT INTO "codes" ("group_code", "code", "label", "sort_order")
SELECT '00001', lpad(n::text, 5, '0'), c, n * 10
FROM (
	SELECT c, row_number() OVER (ORDER BY first_sort, c) AS n
	FROM (
		SELECT btrim("category") AS c, min("sort_order") AS first_sort
		FROM "links" WHERE nullif(btrim("category"), '') IS NOT NULL
		GROUP BY btrim("category")
	) t
) u;--> statement-breakpoint
INSERT INTO "codes" ("group_code", "code", "label", "sort_order")
SELECT '00002', lpad(n::text, 5, '0'), c, n * 10
FROM (
	SELECT c, row_number() OVER (ORDER BY first_sort, c) AS n
	FROM (
		SELECT btrim("category") AS c, min("sort_order") AS first_sort
		FROM "skills" WHERE nullif(btrim("category"), '') IS NOT NULL
		GROUP BY btrim("category")
	) t
) u;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "category_group" varchar(20) DEFAULT '00001' NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "category_code" varchar(20);--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "category_group" varchar(20) DEFAULT '00002' NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "category_code" varchar(20);--> statement-breakpoint
UPDATE "links" l SET "category_code" = c.code
FROM "codes" c WHERE c.group_code = '00001' AND c.label = btrim(l."category");--> statement-breakpoint
UPDATE "skills" s SET "category_code" = c.code
FROM "codes" c WHERE c.group_code = '00002' AND c.label = btrim(s."category");--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_category_group" CHECK ("category_group" = '00001');--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_group" CHECK ("category_group" = '00002');--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_category_codes_fk" FOREIGN KEY ("category_group","category_code") REFERENCES "public"."codes"("group_code","code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_codes_fk" FOREIGN KEY ("category_group","category_code") REFERENCES "public"."codes"("group_code","code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "links" DROP COLUMN IF EXISTS "category";--> statement-breakpoint
ALTER TABLE "skills" DROP COLUMN IF EXISTS "category";--> statement-breakpoint
COMMENT ON COLUMN links.category_group IS '분류 묶음. 늘 00001(내 서비스 분류). 외래 키가 묶음까지 보게 하려고 둔다';--> statement-breakpoint
COMMENT ON COLUMN links.category_code IS '분류(codes). 쓰고 있는 코드는 지울 수 없다';--> statement-breakpoint
COMMENT ON COLUMN skills.category_group IS '분류 묶음. 늘 00002(기술 분류). 외래 키가 묶음까지 보게 하려고 둔다';--> statement-breakpoint
COMMENT ON COLUMN skills.category_code IS '분류(codes). 쓰고 있는 코드는 지울 수 없다';--> statement-breakpoint
-- 관리 › 설정 에 「코드」 줄을 더한다. 설정 묶음이 있을 때만, 메뉴 뒤에
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT s.id, 35, '코드', '/admin/codes', 'admin'
FROM "menus" s
JOIN "menus" g ON g.id = s.parent_id AND g.parent_id IS NULL AND g.label = '관리'
WHERE s.label = '설정' AND s.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/codes')
LIMIT 1;
