-- 글을 연재로 묶는다(MYH-187).
--
-- 연재 이름은 코드 테이블(MYH-131)에 둔다. 새 그룹 00003(연재)을 더하고, 글은
-- (series_group, series_code) 두 컬럼으로 가리킨다 - links · skills 의 분류와
-- 같은 모양이다. 그룹 컬럼은 값이 하나로 고정(CHECK)이라, 외래 키가 다른
-- 그룹의 코드를 끼워 넣는 것까지 막는다. 코드를 바꾸면 따라가고(CASCADE),
-- 글이 쓰는 연재는 지울 수 없다(RESTRICT).
--
-- 연재 안의 순서는 발행일 순이라 편 번호 컬럼은 두지 않는다.

INSERT INTO "code_groups" ("group_code", "name", "sort_order") VALUES
	('00003', '연재', 30)
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "series_group" varchar(20) DEFAULT '00003' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "series_code" varchar(20);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_series_group" CHECK ("series_group" = '00003');--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_series_codes_fk" FOREIGN KEY ("series_group","series_code") REFERENCES "public"."codes"("group_code","code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_series_idx" ON "posts" USING btree ("series_code","published_at");--> statement-breakpoint
COMMENT ON COLUMN posts.series_group IS '연재 그룹. 늘 00003(연재) - 외래 키가 그룹까지 보게 하려고 둔다';--> statement-breakpoint
COMMENT ON COLUMN posts.series_code IS '연재(codes). 비우면 연재가 아니다. 연재 안의 순서는 발행일 순';
