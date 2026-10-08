ALTER TABLE "books" ADD COLUMN "reading_note" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "rating" smallint;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "note_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_rating" CHECK ("books"."rating" between 1 and 5);--> statement-breakpoint
COMMENT ON COLUMN books.reading_note IS '독서 노트(MYH-211). 마크다운. 읽는 중에도 쓴다';--> statement-breakpoint
COMMENT ON COLUMN books.rating IS '별점 1~5. 비워도 된다';--> statement-breakpoint
COMMENT ON COLUMN books.note_updated_at IS '독서 노트를 마지막으로 고친 때';
