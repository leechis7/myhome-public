-- 저장소가 공개인지 적는다.
--
-- repo_url 은 있는데 그 저장소를 남이 열 수 있는지는 적을 데가 없었다.
-- 비공개인데 주소만 걸어 두면 눌러 봐야 404 가 뜨고, 그렇다고 안 적으면
-- 저장소가 있는지조차 알 수 없다. 적어는 두되 링크는 안 걸게 한다.
--
-- 이미 있는 줄은 모두 공개로 본다. 지금 적혀 있는 것이 다 GitHub 공개
-- 저장소다. 비공개인 것은 관리 화면에서 하나씩 끄면 된다.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "repo_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
COMMENT ON COLUMN projects.repo_public IS '저장소를 남이 열 수 있는가 (false 면 주소는 두고 링크만 안 건다)';
