-- 읽는 책에 분류를 단다(MYH-225).
--
-- 컴퓨터 · 교양 · 소설 같은 분류를 코드 테이블의 새 그룹 00005(책 분류)에
-- 두고 처음 몇 개를 넣는다. 종류(00004: 종이책 · 이북)와 같은 방식이다.
-- 비워도 되고, 책이 쓰는 분류는 지우지 못한다.

INSERT INTO "code_groups" ("group_code", "name", "sort_order") VALUES
	('00005', '책 분류', 50)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "codes" ("group_code", "code", "label", "sort_order") VALUES
	('00005', '00001', '컴퓨터', 10),
	('00005', '00002', '교양', 20),
	('00005', '00003', '소설', 30),
	('00005', '00004', '에세이', 40),
	('00005', '00005', '자기계발', 50),
	('00005', '00006', '경제 · 경영', 60)
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "category_group" varchar(20) DEFAULT '00005' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "category_code" varchar(20);--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_category_group" CHECK ("category_group" = '00005');--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_category_codes_fk" FOREIGN KEY ("category_group","category_code") REFERENCES "public"."codes"("group_code","code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
COMMENT ON COLUMN books.category_group IS '분류 그룹. 늘 00005(책 분류) - 외래 키가 그룹까지 보게 하려고 둔다';--> statement-breakpoint
COMMENT ON COLUMN books.category_code IS '분류(codes): 컴퓨터 · 교양 · 소설 …';
