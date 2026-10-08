ALTER TABLE "posts" ADD COLUMN "kind" text DEFAULT 'post' NOT NULL;--> statement-breakpoint
CREATE INDEX "posts_kind_published_idx" ON "posts" USING btree ("kind","published_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_kind" CHECK ("posts"."kind" in ('post', 'note'));
