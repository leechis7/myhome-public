-- 테이블과 컬럼에 한글 설명을 붙인다.
--
-- DB 를 직접 열면 이름만 있고 무엇을 담는 자리인지 알 수 없었다. psql 에서
-- \dt+ 와 \d+ 테이블 로 바로 읽히게 한다.
--
-- 설명은 이름처럼 짧게 적는다. 사연은 코드(lib/db/schema.ts)에 두고,
-- 여기에는 그 컬럼이 무엇인지만 남긴다.
--
-- 데이터를 건드리지 않는다. 설명만 붙인다.

COMMENT ON TABLE profile IS '자기소개';--> statement-breakpoint
COMMENT ON COLUMN profile.id IS '식별자 (항상 1)';--> statement-breakpoint
COMMENT ON COLUMN profile.name IS '이름';--> statement-breakpoint
COMMENT ON COLUMN profile.headline IS '한 줄 소개';--> statement-breakpoint
COMMENT ON COLUMN profile.bio IS '소개 본문';--> statement-breakpoint
COMMENT ON COLUMN profile.email IS '개인 메일';--> statement-breakpoint
COMMENT ON COLUMN profile.work_email IS '회사 메일';--> statement-breakpoint
COMMENT ON COLUMN profile.phone IS '휴대폰 번호';--> statement-breakpoint
COMMENT ON COLUMN profile.github_url IS 'GitHub 주소';--> statement-breakpoint
COMMENT ON COLUMN profile.updated_at IS '수정일시';--> statement-breakpoint
COMMENT ON TABLE careers IS '경력';--> statement-breakpoint
COMMENT ON COLUMN careers.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN careers.company IS '회사명';--> statement-breakpoint
COMMENT ON COLUMN careers.role IS '직무';--> statement-breakpoint
COMMENT ON COLUMN careers.detail IS '상세 설명';--> statement-breakpoint
COMMENT ON COLUMN careers.started_on IS '입사일';--> statement-breakpoint
COMMENT ON COLUMN careers.ended_on IS '퇴사일 (NULL이면 재직 중)';--> statement-breakpoint
COMMENT ON TABLE skills IS '기술 스택';--> statement-breakpoint
COMMENT ON COLUMN skills.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN skills.name IS '기술명';--> statement-breakpoint
COMMENT ON COLUMN skills.category IS '분류';--> statement-breakpoint
COMMENT ON COLUMN skills.sort_order IS '정렬 순서';--> statement-breakpoint
COMMENT ON TABLE posts IS '게시글';--> statement-breakpoint
COMMENT ON COLUMN posts.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN posts.kind IS '구분 (post=블로그 글, note=짧은 글)';--> statement-breakpoint
COMMENT ON COLUMN posts.slug IS '주소 식별자';--> statement-breakpoint
COMMENT ON COLUMN posts.title IS '제목';--> statement-breakpoint
COMMENT ON COLUMN posts.summary IS '요약';--> statement-breakpoint
COMMENT ON COLUMN posts.content IS '본문 (마크다운)';--> statement-breakpoint
COMMENT ON COLUMN posts.tags IS '태그 목록';--> statement-breakpoint
COMMENT ON COLUMN posts.published_at IS '최초 발행일시';--> statement-breakpoint
COMMENT ON COLUMN posts.published IS '공개 여부';--> statement-breakpoint
COMMENT ON COLUMN posts.private IS '비공개 여부 (나만 보기)';--> statement-breakpoint
COMMENT ON COLUMN posts.view_count IS '조회수';--> statement-breakpoint
COMMENT ON COLUMN posts.version IS '문서 버전';--> statement-breakpoint
COMMENT ON COLUMN posts.revised_at IS '개정일시';--> statement-breakpoint
COMMENT ON COLUMN posts.created_at IS '생성일시';--> statement-breakpoint
COMMENT ON COLUMN posts.updated_at IS '수정일시';--> statement-breakpoint
COMMENT ON TABLE comments IS '댓글';--> statement-breakpoint
COMMENT ON COLUMN comments.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN comments.post_id IS '글 번호 (posts.id)';--> statement-breakpoint
COMMENT ON COLUMN comments.author IS '작성자명';--> statement-breakpoint
COMMENT ON COLUMN comments.body IS '내용';--> statement-breakpoint
COMMENT ON COLUMN comments.ip_hash IS '작성자 IP 해시';--> statement-breakpoint
COMMENT ON COLUMN comments.created_at IS '작성일시';--> statement-breakpoint
COMMENT ON TABLE uploads IS '업로드 파일';--> statement-breakpoint
COMMENT ON COLUMN uploads.id IS '파일 식별자 (내용 해시)';--> statement-breakpoint
COMMENT ON COLUMN uploads.filename IS '원본 파일명';--> statement-breakpoint
COMMENT ON COLUMN uploads.mime_type IS 'MIME 타입';--> statement-breakpoint
COMMENT ON COLUMN uploads.size IS '파일 크기 (바이트)';--> statement-breakpoint
COMMENT ON COLUMN uploads.data IS '파일 내용 (구 저장 방식, 미사용)';--> statement-breakpoint
COMMENT ON COLUMN uploads.created_at IS '업로드일시';--> statement-breakpoint
COMMENT ON TABLE attachments IS '게시글 첨부';--> statement-breakpoint
COMMENT ON COLUMN attachments.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN attachments.post_id IS '글 번호 (posts.id)';--> statement-breakpoint
COMMENT ON COLUMN attachments.upload_id IS '업로드 식별자 (uploads.id)';--> statement-breakpoint
COMMENT ON COLUMN attachments.filename IS '첨부 파일명';--> statement-breakpoint
COMMENT ON COLUMN attachments.created_at IS '첨부일시';--> statement-breakpoint
COMMENT ON TABLE projects IS '프로젝트/수행 업무';--> statement-breakpoint
COMMENT ON COLUMN projects.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN projects.kind IS '구분 (project=프로젝트, work=수행 업무)';--> statement-breakpoint
COMMENT ON COLUMN projects.name IS '명칭';--> statement-breakpoint
COMMENT ON COLUMN projects.summary IS '요약';--> statement-breakpoint
COMMENT ON COLUMN projects.url IS '사이트 주소';--> statement-breakpoint
COMMENT ON COLUMN projects.repo_url IS '저장소 주소';--> statement-breakpoint
COMMENT ON COLUMN projects.stack IS '사용 기술 목록';--> statement-breakpoint
COMMENT ON COLUMN projects.started_on IS '시작일';--> statement-breakpoint
COMMENT ON COLUMN projects.ended_on IS '종료일 (NULL이면 진행 중)';--> statement-breakpoint
COMMENT ON COLUMN projects.sort_order IS '정렬 순서';--> statement-breakpoint
COMMENT ON COLUMN projects.created_at IS '생성일시';--> statement-breakpoint
COMMENT ON COLUMN projects.updated_at IS '수정일시';--> statement-breakpoint
COMMENT ON TABLE login_attempts IS '로그인 실패 이력';--> statement-breakpoint
COMMENT ON COLUMN login_attempts.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN login_attempts.ip_hash IS '접속 IP 해시';--> statement-breakpoint
COMMENT ON COLUMN login_attempts.created_at IS '실패일시';--> statement-breakpoint
COMMENT ON TABLE messages IS '수신 메시지';--> statement-breakpoint
COMMENT ON COLUMN messages.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN messages.name IS '발신자명';--> statement-breakpoint
COMMENT ON COLUMN messages.email IS '발신자 메일';--> statement-breakpoint
COMMENT ON COLUMN messages.body IS '내용';--> statement-breakpoint
COMMENT ON COLUMN messages.ip_hash IS '발신 IP 해시';--> statement-breakpoint
COMMENT ON COLUMN messages.read_at IS '확인일시 (NULL이면 미확인)';--> statement-breakpoint
COMMENT ON COLUMN messages.created_at IS '수신일시';--> statement-breakpoint
COMMENT ON TABLE links IS '서비스 링크';--> statement-breakpoint
COMMENT ON COLUMN links.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN links.name IS '서비스명';--> statement-breakpoint
COMMENT ON COLUMN links.url IS '접속 주소';--> statement-breakpoint
COMMENT ON COLUMN links.note IS '비고';--> statement-breakpoint
COMMENT ON COLUMN links.category IS '분류';--> statement-breakpoint
COMMENT ON COLUMN links.sort_order IS '정렬 순서';--> statement-breakpoint
COMMENT ON COLUMN links.created_at IS '등록일시';--> statement-breakpoint
COMMENT ON TABLE admin_password IS '관리자 비밀번호';--> statement-breakpoint
COMMENT ON COLUMN admin_password.id IS '식별자 (항상 1)';--> statement-breakpoint
COMMENT ON COLUMN admin_password.hash IS '비밀번호 해시 (scrypt)';--> statement-breakpoint
COMMENT ON COLUMN admin_password.updated_at IS '변경일시';--> statement-breakpoint
COMMENT ON TABLE passkeys IS '패스키';--> statement-breakpoint
COMMENT ON COLUMN passkeys.id IS '자격 증명 ID (base64url)';--> statement-breakpoint
COMMENT ON COLUMN passkeys.label IS '기기 이름';--> statement-breakpoint
COMMENT ON COLUMN passkeys.public_key IS '공개키 (base64)';--> statement-breakpoint
COMMENT ON COLUMN passkeys.counter IS '사용 횟수';--> statement-breakpoint
COMMENT ON COLUMN passkeys.transports IS '전송 방식 (internal, hybrid, usb, nfc)';--> statement-breakpoint
COMMENT ON COLUMN passkeys.created_at IS '등록일시';--> statement-breakpoint
COMMENT ON COLUMN passkeys.last_used_at IS '최종 사용일시';--> statement-breakpoint
COMMENT ON TABLE secrets IS '비밀글';--> statement-breakpoint
COMMENT ON COLUMN secrets.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN secrets.title IS '제목 (암호문)';--> statement-breakpoint
COMMENT ON COLUMN secrets.content IS '본문 (암호문, 원문은 마크다운)';--> statement-breakpoint
COMMENT ON COLUMN secrets.tags IS '태그 목록 (암호문, 원문은 JSON 배열)';--> statement-breakpoint
COMMENT ON COLUMN secrets.written_at IS '작성 기준일시';--> statement-breakpoint
COMMENT ON COLUMN secrets.created_at IS '생성일시';--> statement-breakpoint
COMMENT ON COLUMN secrets.updated_at IS '수정일시';--> statement-breakpoint
COMMENT ON TABLE secret_attachments IS '비밀글 첨부';--> statement-breakpoint
COMMENT ON COLUMN secret_attachments.id IS '일련번호';--> statement-breakpoint
COMMENT ON COLUMN secret_attachments.secret_id IS '비밀글 번호 (secrets.id)';--> statement-breakpoint
COMMENT ON COLUMN secret_attachments.storage_id IS '저장 파일명 (난수 32자)';--> statement-breakpoint
COMMENT ON COLUMN secret_attachments.filename IS '첨부 파일명 (암호문)';--> statement-breakpoint
COMMENT ON COLUMN secret_attachments.mime_type IS 'MIME 타입 (암호문)';--> statement-breakpoint
COMMENT ON COLUMN secret_attachments.size IS '원본 크기 (바이트)';--> statement-breakpoint
COMMENT ON COLUMN secret_attachments.created_at IS '첨부일시';
