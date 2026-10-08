-- 소개에 홈페이지 주소를 둔다.
--
-- 담을 데가 없어서 적을 수가 없었다. github_url 옆에 나란히 둔다 —
-- 둘 다 "나를 찾아갈 수 있는 바깥 주소" 라서 쓰임새가 같다.
--
-- 이 사이트 주소가 아니다. 다른 데 두고 쓰는 것을 가리킨다.

ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "homepage_url" text;--> statement-breakpoint
COMMENT ON COLUMN profile.homepage_url IS '다른 데 두고 쓰는 홈페이지 주소';
