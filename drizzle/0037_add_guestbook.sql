-- 방명록을 둔다(MYH-191).
--
-- 댓글 테이블을 그대로 쓴다. 글과 상관없는 한마디라 post_id 를 비울 수 있게
-- 하고, 비어 있으면 방명록 글로 본다. 이름 · 내용 제한, 도배 막기, 알림,
-- 지우기가 댓글과 같다.
--
-- 위쪽 메뉴에 「방명록」 을 프로젝트 뒤(순서 45)에 더한다. 그 주소로 가는 줄이
-- 이미 있으면 넣지 않는다.

ALTER TABLE "comments" ALTER COLUMN "post_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_guestbook_idx" ON "comments" USING btree ("created_at" DESC) WHERE "post_id" IS NULL;--> statement-breakpoint
COMMENT ON COLUMN comments.post_id IS '어느 글의 댓글인가. 비어 있으면 방명록 글이다';--> statement-breakpoint
INSERT INTO "menus" ("parent_id", "sort_order", "label", "href", "audience")
SELECT NULL, 45, '방명록', '/guestbook', 'all'
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE href = '/guestbook');
