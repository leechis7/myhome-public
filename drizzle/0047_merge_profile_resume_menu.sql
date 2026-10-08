-- 관리 › 설정 의 「프로필」(/admin)과 「이력서」(/admin/resume)를 한 줄
-- 「프로필 · 이력서」 로 합친다(MYH-218). 두 화면을 /admin 하나로 모았다.
-- 이름을 바꿔 둔 줄은 그대로 둔다(이름이 처음 그대로일 때만 고친다).

UPDATE "menus" SET label = '프로필 · 이력서'
WHERE href = '/admin' AND label = '프로필';--> statement-breakpoint
DELETE FROM "menus" WHERE href = '/admin/resume' AND label = '이력서';
