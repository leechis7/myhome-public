-- 보낸 알림의 항목(MYH-259). 텔레그램 단추([완료] · [30분 뒤])가 이 번호를 들고 온다.
CREATE TABLE IF NOT EXISTS "reminder_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"todo_id" integer,
	"text" text NOT NULL,
	"remind_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_items_remind_idx" ON "reminder_items" USING btree ("remind_at");--> statement-breakpoint
COMMENT ON TABLE reminder_items IS '보낸 텔레그램 알림의 항목(MYH-259). text 는 암호문. remind_at 은 [30분 뒤] 로 다시 알릴 때. 30일 지난 것은 앱이 지운다';
