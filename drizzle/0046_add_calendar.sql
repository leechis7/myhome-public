-- 일정(MYH-214). 구글 캘린더의 iCal 비공개 주소를 암호화해서 사이트 설정에 둔다.
--
-- 메뉴: 「내 공간」 의 일기장 뒤(순서 6)에 「일정」(관리자만). 내 공간이 있을 때만.

ALTER TABLE "site_settings" ADD COLUMN "calendar_ical" text;--> statement-breakpoint
COMMENT ON COLUMN site_settings.calendar_ical IS '암호문. 구글 캘린더 iCal 비공개 주소들(JSON 배열). 비우면 일정이 꺼진다';--> statement-breakpoint
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT g.id, 6, '일정', '/admin/calendar', 'admin'
FROM "menus" g
WHERE g.parent_id IS NULL AND g.label = '내 공간' AND g.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/calendar')
ORDER BY g.id
LIMIT 1;
