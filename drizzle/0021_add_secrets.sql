CREATE TABLE "secret_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"secret_id" integer NOT NULL,
	"storage_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "secret_attachments_storage_id_unique" UNIQUE("storage_id")
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"written_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "secret_attachments" ADD CONSTRAINT "secret_attachments_secret_id_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "secret_attachments_secret_idx" ON "secret_attachments" USING btree ("secret_id");--> statement-breakpoint
CREATE INDEX "secrets_written_idx" ON "secrets" USING btree ("written_at" DESC NULLS LAST);