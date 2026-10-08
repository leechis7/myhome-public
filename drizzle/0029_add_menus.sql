-- 메뉴를 DB 로 옮긴다(MYH-123).
--
-- 코드 세 군데(lib/site.ts, Header, AdminNav)에 흩어져 있어서 한 줄 옮기려
-- 해도 배포를 해야 했다. 테이블 하나에 트리로 모은다.
--
-- 관리 화면 메뉴를 따로 두지 않는다. 위쪽 메뉴 끝의 "관리" 묶음(관리자만)
-- 아래에 들어간다 — 같은 것을 두 군데 둘 이유가 없다. 자주 여는 비밀글 ·
-- 내 서비스 · 감시만 첫 단에 둔다(관리자만). 관리 안은 글 · 설정 두 묶음과
-- 메시지 · 프로젝트로 나눈다(MYH-126).
--
-- 처음 값은 lib/menus.ts 의 DEFAULT_MENUS 와 같다. 번호는 트리를 위에서
-- 아래로 편 순서다. 어긋나지 않는지 tests/unit/menus.test.ts 가 본다.

CREATE TABLE IF NOT EXISTS "menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"href" text,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	CONSTRAINT "menus_audience" CHECK ("menus"."audience" in ('all', 'admin'))
);--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_parent_id_menus_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "menus_parent_sort_idx" ON "menus" USING btree ("parent_id","sort_order");--> statement-breakpoint
COMMENT ON TABLE menus IS '위쪽 메뉴 (트리). 관리자 줄은 서버에서 거른다';--> statement-breakpoint
COMMENT ON COLUMN menus.label IS '메뉴에 보이는 이름';--> statement-breakpoint
COMMENT ON COLUMN menus.href IS '갈 곳. 비어 있으면 순수한 묶음 (눌러도 가지 않고 펼치기만 한다)';--> statement-breakpoint
COMMENT ON COLUMN menus.parent_id IS '부모 메뉴. 비어 있으면 첫 단. 부모를 지우면 딸린 것도 지운다';--> statement-breakpoint
COMMENT ON COLUMN menus.sort_order IS '형제 사이의 순서. 작은 것이 앞';--> statement-breakpoint
COMMENT ON COLUMN menus.audience IS '누가 보나: all(모두) / admin(관리자만). 관리자만인 줄 아래는 모두 관리자만';--> statement-breakpoint
INSERT INTO "menus" ("id", "parent_id", "sort_order", "label", "href", "audience") VALUES
	(1, NULL, 10, '블로그', '/blog', 'all'),
	(2, NULL, 20, '짧은 글', '/notes', 'all'),
	(3, NULL, 30, '비밀글', '/admin/secrets', 'admin'),
	(4, NULL, 40, '프로젝트', '/projects', 'all'),
	(5, NULL, 50, '연락처', '/contact', 'all'),
	(6, NULL, 60, '내 서비스', '/admin/links', 'admin'),
	(7, NULL, 70, '감시', '/admin/monitoring', 'admin'),
	(8, NULL, 80, '관리', NULL, 'admin'),
	(9, 8, 10, '메시지', '/admin/messages', 'admin'),
	(10, 8, 20, '글', NULL, 'admin'),
	(11, 10, 10, '블로그', '/admin/posts', 'admin'),
	(12, 10, 20, '짧은 글', '/admin/notes', 'admin'),
	(13, 8, 30, '프로젝트', '/admin/projects', 'admin'),
	(14, 8, 40, '설정', NULL, 'admin'),
	(15, 14, 10, '프로필', '/admin', 'admin'),
	(16, 14, 20, '암호', '/admin/security', 'admin'),
	(17, 14, 30, '메뉴', '/admin/menus', 'admin');--> statement-breakpoint
-- 번호를 손으로 넣었으니 다음 번호가 그 뒤부터 나오게 맞춘다
SELECT setval(pg_get_serial_sequence('menus', 'id'), (SELECT max(id) FROM menus));
