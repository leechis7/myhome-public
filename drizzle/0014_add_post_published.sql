ALTER TABLE "posts" ADD COLUMN "published" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- 지금까지는 published_at 이 있으면 공개된 글이었다. 그 뜻을 옮긴다.
UPDATE "posts" SET "published" = true WHERE "published_at" IS NOT NULL;
