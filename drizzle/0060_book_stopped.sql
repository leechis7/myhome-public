-- 읽는 책에 「읽다 만 책」 상태를 더한다(MYH-227).
--
-- 읽다가 그만둔 책. 관리 › 책 에서 「다 읽음」 위에 접어 두고, 공개 화면(/books ·
-- 책 상세 · 사이트맵)에는 내놓지 않는다. 다시 읽으면 「읽는 중」 으로 바꾼다.

ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "books_status";--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_status" CHECK ("status" in ('want', 'reading', 'read', 'stopped'));--> statement-breakpoint
COMMENT ON COLUMN books.status IS 'want(읽고 싶은 책) · reading(읽는 중) · read(다 읽음) · stopped(읽다 만 책)';
