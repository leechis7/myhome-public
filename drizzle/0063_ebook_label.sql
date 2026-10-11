-- 책 종류 「이북」 을 「전자책」 으로 부른다.
--
-- 사용자가 이름을 손으로 바꿔 두었으면 건드리지 않는다(「이북」 일 때만).

UPDATE "codes" SET "label" = '전자책' WHERE "group_code" = '00004' AND "label" = '이북';--> statement-breakpoint
COMMENT ON COLUMN books.kind_code IS '종류(codes): 종이책 · 전자책 · 오디오북 …';
