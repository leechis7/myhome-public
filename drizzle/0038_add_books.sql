-- 읽는 책을 직접 적는다(MYH-190).
--
-- 산 책 · 이북 · 오디오북 가운데 읽고 있는 것을 관리 화면에서 적고 소개
-- 화면에 보인다. 종류는 코드 테이블의 새 그룹 00004(책 종류)에 두고 처음
-- 셋을 넣는다. 표지는 올린 그림(uploads)을 가리키고, 그림이 지워지면 비운다.

INSERT INTO "code_groups" ("group_code", "name", "sort_order") VALUES
	('00004', '책 종류', 40)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "codes" ("group_code", "code", "label", "sort_order") VALUES
	('00004', '00001', '종이책', 10),
	('00004', '00002', '이북', 20),
	('00004', '00003', '오디오북', 30)
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"kind_group" varchar(20) DEFAULT '00004' NOT NULL,
	"kind_code" varchar(20),
	"status" text DEFAULT 'reading' NOT NULL,
	"note" text,
	"cover_id" text,
	"url" text,
	"started_on" date,
	"finished_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_status" CHECK ("status" in ('reading', 'read')),
	CONSTRAINT "books_kind_group" CHECK ("kind_group" = '00004'),
	CONSTRAINT "books_kind_codes_fk" FOREIGN KEY ("kind_group","kind_code") REFERENCES "public"."codes"("group_code","code") ON DELETE restrict ON UPDATE cascade,
	CONSTRAINT "books_cover_id_uploads_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_status_idx" ON "books" USING btree ("status","finished_on");--> statement-breakpoint
COMMENT ON TABLE books IS '읽는 책. 직접 적고 소개 화면에 보인다';--> statement-breakpoint
COMMENT ON COLUMN books.kind_group IS '종류 그룹. 늘 00004(책 종류) - 외래 키가 그룹까지 보게 하려고 둔다';--> statement-breakpoint
COMMENT ON COLUMN books.kind_code IS '종류(codes): 종이책 · 이북 · 오디오북 …';--> statement-breakpoint
COMMENT ON COLUMN books.status IS 'reading(읽는 중) · read(다 읽음)';--> statement-breakpoint
COMMENT ON COLUMN books.note IS '한두 줄 소개';--> statement-breakpoint
COMMENT ON COLUMN books.cover_id IS '표지(uploads). 그림이 지워지면 비운다';
