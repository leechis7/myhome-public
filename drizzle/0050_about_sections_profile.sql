-- 소개에 보일 항목에 「소개글」(profile)을 더하고 「읽는 책 줄」(books)을 뺀다
-- (MYH-222). 읽는 책 줄은 소개 화면에서 아예 없앴다. 있는 줄은 소개글을 켠
-- 채로(지금까지 늘 보이던 것) 맨 앞에 넣는다.

ALTER TABLE "profile" ALTER COLUMN "about_sections" SET DEFAULT '{profile,contacts,career,skills,work}'::text[];--> statement-breakpoint
UPDATE "profile"
SET about_sections = CASE
  WHEN 'profile' = ANY(about_sections) THEN array_remove(about_sections, 'books')
  ELSE array_prepend('profile', array_remove(about_sections, 'books'))
END;--> statement-breakpoint
COMMENT ON COLUMN profile.about_sections IS '소개(/about)에서 방문자에게 보일 항목(profile · contacts · career · skills · work). 관리자에게는 늘 전부';
