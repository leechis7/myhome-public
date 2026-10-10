-- 관리 › 설정 에 「환경설정」 화면을 더하고 「암호」 를 「보안」 으로 부른다.
--
-- 외부 연동(MYH-232)이 사이트 화면 안에서 사이트 정보보다 길어져 따로 뺐다
-- (/admin/settings). .env 값을 화면에서도 정하는 곳이라 「환경설정」 이다. 「암호(보안)」 줄 바로 앞에 둔다 - 순서를 바꿔 둔 설치도
-- 있으니 그 줄의 순서를 기준으로 한다(처음 값이면 사이트 · 프로필 · 환경설정 ·
-- 보안). 그 주소로 가는 줄이 이미 있으면 넣지 않는다.
--
-- 「암호」 화면에는 비밀번호와 패스키가 있어 「보안」 이 맞다. 이름을 손으로
-- 바꿔 둔 설치는 건드리지 않는다.

INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT s.parent_id, s.sort_order - 5, '환경설정', '/admin/settings', 'admin'
FROM "menus" s
WHERE s.href = '/admin/security'
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/settings')
LIMIT 1;--> statement-breakpoint
UPDATE "menus" SET "label" = '보안' WHERE "href" = '/admin/security' AND "label" = '암호';
