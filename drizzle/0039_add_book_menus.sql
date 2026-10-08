-- 읽는 책(MYH-190)을 메뉴에 단다.
--
-- 위쪽 메뉴: 프로젝트 뒤(순서 42)에 「책」(모두에게).
-- 관리 › 글: 블로그 · 짧은 글 뒤(순서 30)에 「책」(관리자만). 글 그룹이 있을 때만.
-- 그 주소로 가는 줄이 이미 있으면 넣지 않는다.

INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT NULL, 42, '책', '/books', 'all'
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/books');--> statement-breakpoint
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT g.id, 30, '책', '/admin/books', 'admin'
FROM "menus" g
JOIN "menus" m ON m.id = g.parent_id AND m.parent_id IS NULL AND m.label = '관리'
WHERE g.label = '글' AND g.href IS NULL
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/admin/books')
LIMIT 1;
