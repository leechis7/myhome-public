-- 보낸 미리 알림(MYH-258). 같은 알림을 두 번 보내지 않게 열쇠를 먼저 넣고, 넣어졌을 때만 보낸다.
CREATE TABLE IF NOT EXISTS "reminders_sent" (
	"key" text PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
COMMENT ON TABLE reminders_sent IS '보낸 텔레그램 미리 알림(MYH-258). 열쇠는 todo:12:h1:2026-10-16T10:00Z 꼴. 30일 지난 것은 앱이 지운다';
