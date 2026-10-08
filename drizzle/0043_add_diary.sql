-- 일기장(MYH-213). 비밀글과 같은 테이블 · 같은 자물쇠를 쓴다 — 암호화,
-- 그림 · 첨부, 지우기가 그대로 따라온다. 일기면 diary_day 에 그 날이 있다.
--
-- 메뉴: 「내 공간」 의 맨 앞(순서 5)에 「일기장」(관리자만). 내 공간이 있을 때만.

ALTER TABLE "secrets" ADD COLUMN "diary_day" date;--> statement-breakpoint
ALTER TABLE "secrets" ADD COLUMN "mood" text;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_diary_day_key" UNIQUE("diary_day");--> statement-breakpoint
COMMENT ON COLUMN secrets.diary_day IS '일기장이면 그 날(하루 한 편). 비밀글은 null';--> statement-breakpoint
COMMENT ON COLUMN secrets.mood IS '암호문. 일기의 기분. 비울 수 있다';--> statement-breakpoint
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT g.id, 5, '일기장', '/admin/diary', 'admin'
FROM "menus" g
WHERE g.parent_id IS NULL AND g.label = '내 공간' AND g.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/diary')
ORDER BY g.id
LIMIT 1;
