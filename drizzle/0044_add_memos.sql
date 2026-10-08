-- 빠른 메모(MYH-215). 텔레그램으로 보낸 글이나 화면에서 쓴 한 줄을 쌓는다.
-- 글은 암호화해서 둔다(SECRETS_KEY).
--
-- 메뉴: 「내 공간」 의 일기장 뒤(순서 7)에 「메모」(관리자만). 내 공간이 있을 때만.

CREATE TABLE "memos" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"moved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memos_source" CHECK ("memos"."source" in ('telegram', 'web'))
);--> statement-breakpoint
CREATE INDEX "memos_created_idx" ON "memos" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
COMMENT ON TABLE memos IS '빠른 메모(MYH-215). 텔레그램 · 화면에서 쓴 한 줄. 글은 암호화';--> statement-breakpoint
COMMENT ON COLUMN memos.content IS '암호문. 원문은 평문 글';--> statement-breakpoint
COMMENT ON COLUMN memos.source IS '어디서 왔나: telegram · web';--> statement-breakpoint
COMMENT ON COLUMN memos.moved_at IS '일기로 옮긴 때. 옮기지 않았으면 null';--> statement-breakpoint
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT g.id, 7, '메모', '/admin/memos', 'admin'
FROM "menus" g
WHERE g.parent_id IS NULL AND g.label = '내 공간' AND g.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/memos')
ORDER BY g.id
LIMIT 1;
