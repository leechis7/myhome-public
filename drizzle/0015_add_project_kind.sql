ALTER TABLE "projects" ADD COLUMN "kind" text DEFAULT 'work' NOT NULL;--> statement-breakpoint
CREATE INDEX "projects_kind_sort_idx" ON "projects" USING btree ("kind","sort_order","started_on" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_kind" CHECK ("projects"."kind" in ('project', 'work'));
--> statement-breakpoint
-- 지금 있는 줄은 지나온 업무다. 만들고 있는 것은 MyHome 하나뿐이다.
UPDATE "projects" SET "kind" = 'project' WHERE "name" ILIKE 'myhome%';
