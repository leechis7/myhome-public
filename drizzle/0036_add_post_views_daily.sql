-- 글이 날마다 몇 번 읽혔는지 적는다(MYH-189).
--
-- 첫 화면의 「많이 읽은 글」 을 최근 90일로 세려고 둔다. posts.view_count 는
-- 누적 한 칸이라 기간을 셀 수 없다. 날짜는 한국 날짜이고, 조회수를 올릴 때
-- 그날 줄을 함께 올린다(없으면 만든다). 지난 조회는 날짜를 알 수 없어
-- 옮기지 않는다 - 쌓이기 전에는 화면이 누적 조회수로 대신한다.

CREATE TABLE IF NOT EXISTS "post_views_daily" (
	"post_id" integer NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_views_daily_post_id_day_pk" PRIMARY KEY("post_id","day"),
	CONSTRAINT "post_views_daily_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_views_daily_day_idx" ON "post_views_daily" USING btree ("day");--> statement-breakpoint
COMMENT ON TABLE post_views_daily IS '글이 날마다 몇 번 읽혔나. 많이 읽은 글을 기간으로 센다';--> statement-breakpoint
COMMENT ON COLUMN post_views_daily.day IS '한국 날짜';--> statement-breakpoint
COMMENT ON COLUMN post_views_daily.views IS '그날 조회 수';
