-- 할 일에 시작일을 더한다(MYH-228).
--
-- 기한(due_on) 하나만 있던 것을 기간으로 본다. due_on 은 마감일 그대로 두고
-- start_on 을 더한다. 둘 다 비워도 되고, 둘 다 있으면 시작일이 앞이다.

ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "start_on" date;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_range" CHECK ("start_on" IS NULL OR "due_on" IS NULL OR "start_on" <= "due_on");--> statement-breakpoint
COMMENT ON COLUMN todos.start_on IS '시작일(선택). 마감일(due_on)보다 앞';--> statement-breakpoint
COMMENT ON COLUMN todos.due_on IS '마감일(선택)';
