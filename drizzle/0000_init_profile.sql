CREATE TABLE "careers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"detail" text,
	"started_on" date NOT NULL,
	"ended_on" date,
	CONSTRAINT "careers_period_order" CHECK ("careers"."ended_on" is null or "careers"."ended_on" >= "careers"."started_on")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"headline" text,
	"bio" text NOT NULL,
	"email" text,
	"github_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_single_row" CHECK ("profile"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "careers_started_on_idx" ON "careers" USING btree ("started_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "skills_sort_idx" ON "skills" USING btree ("sort_order","name");