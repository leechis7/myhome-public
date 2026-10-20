-- 회의 받아쓰기(MYH-265). 제목 · 요약 · 조각 글은 암호문이다(참석자의 말이 들어 있다).
CREATE TABLE IF NOT EXISTS "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL REFERENCES "meetings"("id") ON DELETE cascade,
	"seq" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_started_idx" ON "meetings" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_chunks_seq_key" ON "meeting_chunks" USING btree ("meeting_id","seq");--> statement-breakpoint
COMMENT ON TABLE meetings IS '회의(MYH-265). title · summary 는 암호문. ended_at 이 비면 아직 녹음 중';--> statement-breakpoint
COMMENT ON TABLE meeting_chunks IS '회의 녹음을 30초씩 받아쓴 조각(MYH-265). text 는 암호문. (meeting_id, seq) 는 하나뿐';
--> statement-breakpoint
-- 오픈클로에 맡긴 결과(MYH-268). 암호문
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "handoff" text;
--> statement-breakpoint
-- 메뉴 「내 공간 › AI」(MYH-274). AI 화면 - 대화 · 회의 · 음성. 메모 다음. 이미 있거나 「내 공간」 이 없으면 넣지 않는다
INSERT INTO menus (label, href, parent_id, sort_order, audience)
SELECT 'AI', '/admin/ai', m.id, 35, 'admin'
FROM menus m
WHERE m.label = '내 공간' AND m.parent_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM menus WHERE href = '/admin/ai')
LIMIT 1;
--> statement-breakpoint
-- 어디서 온 회의인가(MYH-271): live 는 화면에서 녹음, file 은 올린 녹음 파일
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'live' NOT NULL;
