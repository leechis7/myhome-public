-- 책 찾기 출처의 순서와 사용 여부(MYH-226).
--
-- 「kakao,-calibre,openlibrary」 꼴(앞이 먼저, - 는 끔). 비우면 처음 값 - 카카오 →
-- 내 서재 → Open Library, 다 켬. 환경설정 › 책 찾기 에서 고친다.

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "book_sources" text;--> statement-breakpoint
COMMENT ON COLUMN site_settings.book_sources IS '책 찾기 출처의 순서 · 사용(MYH-226). kakao,-calibre,openlibrary 꼴';
