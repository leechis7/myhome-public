-- 읽는 책에 「읽고 싶은 책」 상태를 더한다(MYH-227).
--
-- 아직 읽기 시작하지 않은 책을 적어 두는 자리다. /books 맨 아래에 따로 선다.

ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "books_status";--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_status" CHECK ("status" in ('want', 'reading', 'read'));--> statement-breakpoint
COMMENT ON COLUMN books.status IS 'want(읽고 싶은 책) · reading(읽는 중) · read(다 읽음)';
