CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"url" text,
	"repo_url" text,
	"stack" text[] DEFAULT '{}' NOT NULL,
	"started_on" date,
	"ended_on" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_period_order" CHECK ("projects"."ended_on" is null or "projects"."started_on" is null or "projects"."ended_on" >= "projects"."started_on")
);
--> statement-breakpoint
CREATE INDEX "projects_sort_idx" ON "projects" USING btree ("sort_order","started_on" DESC NULLS LAST);