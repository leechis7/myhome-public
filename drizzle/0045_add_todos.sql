-- 할 일(MYH-217). 할 일 글은 암호화하고, 기한 · 끝낸 때는 평문.
--
-- 메뉴: 「내 공간」 의 메모 뒤(순서 8)에 「할 일」(관리자만). 내 공간이 있을 때만.

CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"due_on" date,
	"done_at" timestamp with time zone,
	"source" text DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "todos_source" CHECK ("todos"."source" in ('telegram', 'web'))
);--> statement-breakpoint
COMMENT ON TABLE todos IS '할 일(MYH-217). 체크리스트. 글은 암호화';--> statement-breakpoint
COMMENT ON COLUMN todos.title IS '암호문. 할 일';--> statement-breakpoint
COMMENT ON COLUMN todos.due_on IS '기한(선택)';--> statement-breakpoint
COMMENT ON COLUMN todos.done_at IS '끝낸 때. 안 끝났으면 null';--> statement-breakpoint
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT g.id, 8, '할 일', '/admin/todos', 'admin'
FROM "menus" g
WHERE g.parent_id IS NULL AND g.label = '내 공간' AND g.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/todos')
ORDER BY g.id
LIMIT 1;
