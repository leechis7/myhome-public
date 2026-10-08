-- 글 주소를 슬러그 대신 번호로 바꾼다.
--
-- 제목을 고치면 슬러그도 고치고 싶어지는데, 고치는 순간 주소가 바뀌고
-- 검색 결과와 남의 북마크가 끊긴다. 주소를 번호로 하면 제목을 아무리
-- 고쳐도 주소가 안 변한다.
--
--   /blog/도메인을-구입해-사이트를-옮겼다  →  /blog/58
--
-- 옛 주소를 301 로 넘기지 않는다. 아직 아무도 링크해 가지 않았다(MYH-142).
-- 그래서 컬럼을 남겨 둘 까닭도 없다.

ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_slug_unique";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "slug";
