-- 코드 묶음을 화면에서 더하고 고친다(MYH-183).
--
-- 묶음 코드를 바꾸면 그 안의 코드들이 따라가게 한다(ON UPDATE CASCADE).
-- 지우기는 그대로 막는다(restrict) - 코드가 남은 묶음은 지울 수 없다.
--
-- 프로그램이 쓰는 묶음(00001 · 00002)은 화면에서 코드를 바꿀 수 없게 잠근다.
-- 바꾸려 해도 links · skills 의 category_group CHECK 가 막는다.

ALTER TABLE "codes" DROP CONSTRAINT IF EXISTS "codes_group_code_code_groups_group_code_fk";--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_group_code_code_groups_group_code_fk" FOREIGN KEY ("group_code") REFERENCES "public"."code_groups"("group_code") ON DELETE restrict ON UPDATE cascade;
