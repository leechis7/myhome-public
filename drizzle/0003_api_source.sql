-- 홈페이지 API(MYH-247)로 들어온 할 일 · 메모를 가른다. source 에 'api' 를 더한다.
ALTER TABLE "todos" DROP CONSTRAINT IF EXISTS "todos_source";--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_source" CHECK ("todos"."source" in ('telegram', 'web', 'api'));--> statement-breakpoint
ALTER TABLE "memos" DROP CONSTRAINT IF EXISTS "memos_source";--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_source" CHECK ("memos"."source" in ('telegram', 'web', 'api'));--> statement-breakpoint
COMMENT ON COLUMN todos.source IS '어디서 왔나: telegram · web · api(홈페이지 API, MYH-247)';--> statement-breakpoint
COMMENT ON COLUMN memos.source IS '어디서 왔나: telegram · web · api(홈페이지 API, MYH-247)';
