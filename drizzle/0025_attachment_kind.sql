-- 본문 그림과 첨부파일을 가른다.
--
-- 비밀글은 둘이 같은 테이블(secret_attachments)에 들어간다. 담그는 자리를
-- 함께 쓰는 것 자체는 옳다 — 본문 그림도 아무나 받으면 안 되니 관리자만
-- 지나는 길을 거쳐야 한다. 나눠야 하는 것은 자리가 아니라 쓰임새다.
-- 지금은 가를 컬럼이 없어서 그림을 올리면 첨부 목록에 그대로 뜬다(MYH-144).
--
-- 블로그·짧은 글은 반대다. 본문 그림이 uploads 에 해시로만 들어가고
-- 어느 글 것인지 기록이 없다. 같은 컬럼을 attachments 에도 두어
-- 본문 그림을 글에 매달 자리를 미리 낸다(MYH-145).
--
-- 이미 있는 줄은 모두 'file' 이다. 비밀글 본문은 담겨 있어 SQL 로 훑을 수
-- 없고, 운영에는 어차피 두 테이블 다 한 줄도 없다.

ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'file' NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_kind";--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_kind" CHECK ("attachments"."kind" in ('file', 'image'));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_post_kind_idx" ON "attachments" ("post_id","kind");--> statement-breakpoint
COMMENT ON COLUMN attachments.kind IS '쓰임새 (file: 첨부파일, image: 본문 그림)';--> statement-breakpoint

ALTER TABLE "secret_attachments" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'file' NOT NULL;--> statement-breakpoint
ALTER TABLE "secret_attachments" DROP CONSTRAINT IF EXISTS "secret_attachments_kind";--> statement-breakpoint
ALTER TABLE "secret_attachments" ADD CONSTRAINT "secret_attachments_kind" CHECK ("secret_attachments"."kind" in ('file', 'image'));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "secret_attachments_secret_kind_idx" ON "secret_attachments" ("secret_id","kind");--> statement-breakpoint
COMMENT ON COLUMN secret_attachments.kind IS '쓰임새 (file: 첨부파일, image: 본문 그림)';
