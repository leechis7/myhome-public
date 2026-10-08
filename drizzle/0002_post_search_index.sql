CREATE INDEX "posts_title_trgm_idx" ON "posts" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "posts_content_trgm_idx" ON "posts" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "posts_tags_idx" ON "posts" USING gin ("tags");