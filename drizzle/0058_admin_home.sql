-- 관리 첫 화면을 「대시보드」 로 하고 프로필을 /admin/profile 로 옮긴다(MYH-234).
--
-- /admin 은 로그인 화면이면서 프로필 화면이었다. 이제 로그인 뒤에는 새 메시지 ·
-- 오늘 할 일 · 일정 · 임시저장 글을 모아 보이고, 프로필은 /admin/profile 이다.
-- 「관리」 그룹 맨 앞(지금 맨 앞 줄의 순서 - 5)에 「대시보드」 를 더한다. 그 주소로
-- 가는 줄이 이미 있으면 넣지 않는다. 프로필 줄은 주소만 바꾼다.

UPDATE "menus" SET "href" = '/admin/profile' WHERE "href" = '/admin';--> statement-breakpoint
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT g.id, COALESCE((SELECT MIN(c.sort_order) FROM "menus" c WHERE c.parent_id = g.id), 10) - 5,
       '대시보드', '/admin', 'admin'
FROM "menus" g
WHERE g.parent_id IS NULL AND g.label = '관리' AND g.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin')
LIMIT 1;
