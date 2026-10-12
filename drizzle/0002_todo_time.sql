-- 할 일에 시각을 둔다(MYH-245). 시작 시각은 첫날(시작일, 없으면 마감일), 끝 시각은
-- 마지막 날(마감일)의 것.
ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "start_time" time;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "end_time" time;--> statement-breakpoint
COMMENT ON COLUMN todos.start_time IS '시작 시각(선택, MYH-245). 첫날(시작일, 없으면 마감일) 몇 시. 시각만 있고 날이 없으면 마감일이 오늘';--> statement-breakpoint
COMMENT ON COLUMN todos.end_time IS '끝 시각(선택, MYH-245). 마지막 날(마감일) 몇 시까지';
