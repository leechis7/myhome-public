-- 「묶음」 을 「그룹」 으로 부른다(MYH-186).
--
-- 0029(메뉴) · 0031(코드) 이 단 컬럼 주석(COMMENT)에 「묶음」 이 있다. 적용된
-- 마이그레이션 파일은 고치지 않는다(scripts/migrate.mjs 가 해시로 확인한다).
-- 대신 여기서 지금 DB 에 달린 주석을 찾아 낱말만 바꿔 다시 단다. 이 스키마의
-- 테이블 · 컬럼 주석 가운데 「묶음」 이 든 것만 건드린다.

DO $$
DECLARE
	r record;
BEGIN
	FOR r IN
		SELECT c.relname AS tbl, a.attname AS col, d.description AS txt
		FROM pg_description d
		JOIN pg_class c ON c.oid = d.objoid
		JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
		LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
		WHERE d.classoid = 'pg_class'::regclass
		  AND d.description LIKE '%묶음%'
	LOOP
		IF r.col IS NULL THEN
			EXECUTE format('COMMENT ON TABLE %I IS %L', r.tbl, replace(r.txt, '묶음', '그룹'));
		ELSE
			EXECUTE format('COMMENT ON COLUMN %I.%I IS %L', r.tbl, r.col, replace(r.txt, '묶음', '그룹'));
		END IF;
	END LOOP;
END
$$;
