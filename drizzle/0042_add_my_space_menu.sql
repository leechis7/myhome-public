-- 나만 보는 것을 위쪽 메뉴 「내 공간」 하나로 묶는다(MYH-212).
--
-- 첫 단의 관리 바로 앞(관리 순서 - 5, 관리가 없으면 55)에 「내 공간」 그룹
-- (관리자만)을 만들고,
-- 첫 단에 있던 비밀글 · 내 서비스 · 감시를 그 아래로 옮긴다. 메뉴를 고쳐서
-- 다른 자리에 둔 줄은 그대로 둔다(첫 단에 있는 줄만 옮긴다).

INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT NULL,
       COALESCE(
         (SELECT sort_order - 5 FROM "menus"
          WHERE parent_id IS NULL AND label = '관리' AND href IS NULL
          ORDER BY id LIMIT 1),
         55
       ),
       '내 공간', NULL, 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM "menus" WHERE parent_id IS NULL AND label = '내 공간' AND href IS NULL
);--> statement-breakpoint
UPDATE "menus"
SET parent_id = (
      SELECT id FROM "menus"
      WHERE parent_id IS NULL AND label = '내 공간' AND href IS NULL
      ORDER BY id LIMIT 1
    ),
    sort_order = CASE href
      WHEN '/admin/secrets' THEN 10
      WHEN '/admin/links' THEN 20
      ELSE 30
    END
WHERE parent_id IS NULL
  AND href IN ('/admin/secrets', '/admin/links', '/admin/monitoring');
