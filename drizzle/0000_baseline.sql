-- 기준선(MYH-234). 0000 ~ 0063(v1.4.0)을 차례로 돌린 결과를 파일 하나로 합쳤다.
--
-- 빈 DB(새 설치)는 이것 하나만 돈다. 0063 까지 이미 돈 DB(v1.4.x)는
-- scripts/migrate.mjs 가 이것을 「이미 적용」 으로 기록만 하고 건너뛴다. 그보다
-- 옛 DB 는 먼저 v1.4.x 로 올려야 한다.
--
-- 표 · 제약 · 인덱스 · 주석은 0063 까지 돈 빈 DB 를 pg_dump(--schema-only)로 뽑은 것.
-- 처음 넣는 데이터 중 코드 · 메뉴는 운영(leechis.dev)의 것에 맞췄다.
-- 이후의 바뀜은 0001 부터 다시 쌓는다.

--
-- PostgreSQL database dump
--

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

--
-- Name: admin_password; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_password (
    id integer DEFAULT 1 NOT NULL,
    hash text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_password_single_row CHECK ((id = 1))
);

--
-- Name: TABLE admin_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_password IS '관리자 비밀번호';

--
-- Name: COLUMN admin_password.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_password.id IS '식별자 (항상 1)';

--
-- Name: COLUMN admin_password.hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_password.hash IS '비밀번호 해시 (scrypt)';

--
-- Name: COLUMN admin_password.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_password.updated_at IS '변경일시';

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    upload_id text NOT NULL,
    filename text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'file'::text NOT NULL,
    CONSTRAINT attachments_kind CHECK ((kind = ANY (ARRAY['file'::text, 'image'::text])))
);

--
-- Name: TABLE attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.attachments IS '게시글 첨부';

--
-- Name: COLUMN attachments.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attachments.id IS '일련번호';

--
-- Name: COLUMN attachments.post_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attachments.post_id IS '글 번호 (posts.id)';

--
-- Name: COLUMN attachments.upload_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attachments.upload_id IS '업로드 식별자 (uploads.id)';

--
-- Name: COLUMN attachments.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attachments.filename IS '첨부 파일명';

--
-- Name: COLUMN attachments.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attachments.created_at IS '첨부일시';

--
-- Name: COLUMN attachments.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attachments.kind IS '쓰임새 (file: 첨부파일, image: 본문 그림)';

--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;

--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id integer NOT NULL,
    title text NOT NULL,
    author text NOT NULL,
    kind_group character varying(20) DEFAULT '00004'::character varying NOT NULL,
    kind_code character varying(20),
    status text DEFAULT 'reading'::text NOT NULL,
    note text,
    cover_id text,
    url text,
    started_on date,
    finished_on date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reading_note text,
    rating smallint,
    note_updated_at timestamp with time zone,
    category_group character varying(20) DEFAULT '00005'::character varying NOT NULL,
    category_code character varying(20),
    CONSTRAINT books_category_group CHECK (((category_group)::text = '00005'::text)),
    CONSTRAINT books_kind_group CHECK (((kind_group)::text = '00004'::text)),
    CONSTRAINT books_rating CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT books_status CHECK ((status = ANY (ARRAY['want'::text, 'reading'::text, 'read'::text, 'stopped'::text])))
);

--
-- Name: TABLE books; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.books IS '읽는 책. 직접 적고 소개 화면에 보인다';

--
-- Name: COLUMN books.kind_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.kind_group IS '종류 그룹. 늘 00004(책 종류) - 외래 키가 그룹까지 보게 하려고 둔다';

--
-- Name: COLUMN books.kind_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.kind_code IS '종류(codes): 종이책 · 전자책 · 오디오북 …';

--
-- Name: COLUMN books.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.status IS 'want(읽고 싶은 책) · reading(읽는 중) · read(다 읽음) · stopped(읽다 만 책)';

--
-- Name: COLUMN books.note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.note IS '한두 줄 소개';

--
-- Name: COLUMN books.cover_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.cover_id IS '표지(uploads). 그림이 지워지면 비운다';

--
-- Name: COLUMN books.reading_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.reading_note IS '독서 노트(MYH-211). 마크다운. 읽는 중에도 쓴다';

--
-- Name: COLUMN books.rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.rating IS '별점 1~5. 비워도 된다';

--
-- Name: COLUMN books.note_updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.note_updated_at IS '독서 노트를 마지막으로 고친 때';

--
-- Name: COLUMN books.category_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.category_group IS '분류 그룹. 늘 00005(책 분류) - 외래 키가 그룹까지 보게 하려고 둔다';

--
-- Name: COLUMN books.category_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.books.category_code IS '분류(codes): 컴퓨터 · 교양 · 소설 …';

--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;

--
-- Name: careers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.careers (
    id integer NOT NULL,
    company text NOT NULL,
    role text NOT NULL,
    detail text,
    started_on date NOT NULL,
    ended_on date,
    CONSTRAINT careers_period_order CHECK (((ended_on IS NULL) OR (ended_on >= started_on)))
);

--
-- Name: TABLE careers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.careers IS '경력';

--
-- Name: COLUMN careers.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.careers.id IS '일련번호';

--
-- Name: COLUMN careers.company; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.careers.company IS '회사명';

--
-- Name: COLUMN careers.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.careers.role IS '직무';

--
-- Name: COLUMN careers.detail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.careers.detail IS '상세 설명';

--
-- Name: COLUMN careers.started_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.careers.started_on IS '입사일';

--
-- Name: COLUMN careers.ended_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.careers.ended_on IS '퇴사일 (NULL이면 재직 중)';

--
-- Name: careers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.careers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: careers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.careers_id_seq OWNED BY public.careers.id;

--
-- Name: code_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_groups (
    group_code character varying(20) NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);

--
-- Name: TABLE code_groups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.code_groups IS '코드 그룹. 고르는 칸 하나가 그룹 하나다';

--
-- Name: COLUMN code_groups.group_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_groups.group_code IS '그룹 번호(00001 …). 프로그램은 lib/code-groups.ts 의 이름으로 부른다';

--
-- Name: COLUMN code_groups.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_groups.name IS '화면에 보이는 그룹 이름';

--
-- Name: COLUMN code_groups.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_groups.sort_order IS '코드 화면에 그룹이 나오는 순서';

--
-- Name: codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codes (
    group_code character varying(20) NOT NULL,
    code character varying(20) NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);

--
-- Name: TABLE codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.codes IS '고르는 칸의 이름표. 쓰는 쪽은 (그룹, 코드)를 가리킨다';

--
-- Name: COLUMN codes.group_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.codes.group_code IS '어느 그룹의 것인가(code_groups)';

--
-- Name: COLUMN codes.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.codes.code IS '그룹 안의 코드. 비워 두고 더하면 다음 번호(00001 …). 글자로 적어도 되고, 바꾸면 쓰는 줄도 따라 바뀐다';

--
-- Name: COLUMN codes.label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.codes.label IS '화면에 보이는 이름. 고쳐도 쓰는 줄은 그대로다';

--
-- Name: COLUMN codes.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.codes.sort_order IS '그룹 안의 순서. 분류가 나오는 순서';

--
-- Name: COLUMN codes.active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.codes.active IS '끄면 고르는 칸에서 빠진다. 이미 붙은 줄에는 그대로 보인다';

--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    post_id integer,
    author text NOT NULL,
    body text NOT NULL,
    ip_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: TABLE comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comments IS '댓글';

--
-- Name: COLUMN comments.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comments.id IS '일련번호';

--
-- Name: COLUMN comments.post_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comments.post_id IS '어느 글의 댓글인가. 비어 있으면 방명록 글이다';

--
-- Name: COLUMN comments.author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comments.author IS '작성자명';

--
-- Name: COLUMN comments.body; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comments.body IS '내용';

--
-- Name: COLUMN comments.ip_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comments.ip_hash IS '작성자 IP 해시';

--
-- Name: COLUMN comments.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comments.created_at IS '작성일시';

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;

--
-- Name: links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.links (
    id integer NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    note text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    category_group character varying(20) DEFAULT '00001'::character varying NOT NULL,
    category_code character varying(20),
    CONSTRAINT links_category_group CHECK (((category_group)::text = '00001'::text))
);

--
-- Name: TABLE links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.links IS '서비스 링크';

--
-- Name: COLUMN links.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.id IS '일련번호';

--
-- Name: COLUMN links.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.name IS '서비스명';

--
-- Name: COLUMN links.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.url IS '접속 주소';

--
-- Name: COLUMN links.note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.note IS '비고';

--
-- Name: COLUMN links.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.sort_order IS '정렬 순서';

--
-- Name: COLUMN links.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.created_at IS '등록일시';

--
-- Name: COLUMN links.category_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.category_group IS '분류 그룹. 늘 00001(내 서비스 분류). 외래 키가 그룹까지 보게 하려고 둔다';

--
-- Name: COLUMN links.category_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.category_code IS '분류(codes). 쓰고 있는 코드는 지울 수 없다';

--
-- Name: links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.links_id_seq OWNED BY public.links.id;

--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id integer NOT NULL,
    ip_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: TABLE login_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.login_attempts IS '로그인 실패 이력';

--
-- Name: COLUMN login_attempts.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_attempts.id IS '일련번호';

--
-- Name: COLUMN login_attempts.ip_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_attempts.ip_hash IS '접속 IP 해시';

--
-- Name: COLUMN login_attempts.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_attempts.created_at IS '실패일시';

--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_attempts_id_seq OWNED BY public.login_attempts.id;

--
-- Name: memos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memos (
    id integer NOT NULL,
    content text NOT NULL,
    source text DEFAULT 'web'::text NOT NULL,
    moved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT memos_source CHECK ((source = ANY (ARRAY['telegram'::text, 'web'::text])))
);

--
-- Name: TABLE memos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.memos IS '빠른 메모(MYH-215). 텔레그램 · 화면에서 쓴 한 줄. 글은 암호화';

--
-- Name: COLUMN memos.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.memos.content IS '암호문. 원문은 평문 글';

--
-- Name: COLUMN memos.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.memos.source IS '어디서 왔나: telegram · web';

--
-- Name: COLUMN memos.moved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.memos.moved_at IS '일기로 옮긴 때. 옮기지 않았으면 null';

--
-- Name: memos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.memos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: memos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.memos_id_seq OWNED BY public.memos.id;

--
-- Name: menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menus (
    id integer NOT NULL,
    label text NOT NULL,
    href text,
    parent_id integer,
    sort_order integer DEFAULT 0 NOT NULL,
    audience text DEFAULT 'all'::text NOT NULL,
    CONSTRAINT menus_audience CHECK ((audience = ANY (ARRAY['all'::text, 'admin'::text])))
);

--
-- Name: TABLE menus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.menus IS '위쪽 메뉴 (트리). 관리자 줄은 서버에서 거른다';

--
-- Name: COLUMN menus.label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.label IS '메뉴에 보이는 이름';

--
-- Name: COLUMN menus.href; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.href IS '갈 곳. 비어 있으면 순수한 그룹 (눌러도 가지 않고 펼치기만 한다)';

--
-- Name: COLUMN menus.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.parent_id IS '부모 메뉴. 비어 있으면 첫 단. 부모를 지우면 딸린 것도 지운다';

--
-- Name: COLUMN menus.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.sort_order IS '형제 사이의 순서. 작은 것이 앞';

--
-- Name: COLUMN menus.audience; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.audience IS '누가 보나: all(모두) / admin(관리자만). 관리자만인 줄 아래는 모두 관리자만';

--
-- Name: menus_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: menus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menus_id_seq OWNED BY public.menus.id;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    body text NOT NULL,
    ip_hash text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS '수신 메시지';

--
-- Name: COLUMN messages.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.id IS '일련번호';

--
-- Name: COLUMN messages.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.name IS '발신자명';

--
-- Name: COLUMN messages.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.email IS '발신자 메일';

--
-- Name: COLUMN messages.body; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.body IS '내용';

--
-- Name: COLUMN messages.ip_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.ip_hash IS '발신 IP 해시';

--
-- Name: COLUMN messages.read_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.read_at IS '확인일시 (NULL이면 미확인)';

--
-- Name: COLUMN messages.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.created_at IS '수신일시';

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;

--
-- Name: passkeys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.passkeys (
    id text NOT NULL,
    label text NOT NULL,
    public_key text NOT NULL,
    counter integer DEFAULT 0 NOT NULL,
    transports text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);

--
-- Name: TABLE passkeys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.passkeys IS '패스키';

--
-- Name: COLUMN passkeys.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.passkeys.id IS '자격 증명 ID (base64url)';

--
-- Name: COLUMN passkeys.label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.passkeys.label IS '기기 이름';

--
-- Name: COLUMN passkeys.public_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.passkeys.public_key IS '공개키 (base64)';

--
-- Name: COLUMN passkeys.counter; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.passkeys.counter IS '사용 횟수';

--
-- Name: COLUMN passkeys.transports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.passkeys.transports IS '전송 방식 (internal, hybrid, usb, nfc)';

--
-- Name: COLUMN passkeys.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.passkeys.created_at IS '등록일시';

--
-- Name: COLUMN passkeys.last_used_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.passkeys.last_used_at IS '최종 사용일시';

--
-- Name: post_views_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views_daily (
    post_id integer NOT NULL,
    day date NOT NULL,
    views integer DEFAULT 0 NOT NULL
);

--
-- Name: TABLE post_views_daily; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.post_views_daily IS '글이 날마다 몇 번 읽혔나. 많이 읽은 글을 기간으로 센다';

--
-- Name: COLUMN post_views_daily.day; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.post_views_daily.day IS '한국 날짜';

--
-- Name: COLUMN post_views_daily.views; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.post_views_daily.views IS '그날 조회 수';

--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    title text NOT NULL,
    summary text,
    content text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    revised_at timestamp with time zone,
    version text,
    published boolean DEFAULT false NOT NULL,
    kind text DEFAULT 'post'::text NOT NULL,
    private boolean DEFAULT false NOT NULL,
    series_group character varying(20) DEFAULT '00003'::character varying NOT NULL,
    series_code character varying(20),
    CONSTRAINT posts_kind CHECK ((kind = ANY (ARRAY['post'::text, 'note'::text]))),
    CONSTRAINT posts_series_group CHECK (((series_group)::text = '00003'::text))
);

--
-- Name: TABLE posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.posts IS '게시글';

--
-- Name: COLUMN posts.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.id IS '일련번호';

--
-- Name: COLUMN posts.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.title IS '제목';

--
-- Name: COLUMN posts.summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.summary IS '요약';

--
-- Name: COLUMN posts.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.content IS '본문 (마크다운)';

--
-- Name: COLUMN posts.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.tags IS '태그 목록';

--
-- Name: COLUMN posts.published_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.published_at IS '최초 발행일시';

--
-- Name: COLUMN posts.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.created_at IS '생성일시';

--
-- Name: COLUMN posts.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.updated_at IS '수정일시';

--
-- Name: COLUMN posts.view_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.view_count IS '조회수';

--
-- Name: COLUMN posts.revised_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.revised_at IS '개정일시';

--
-- Name: COLUMN posts.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.version IS '문서 버전';

--
-- Name: COLUMN posts.published; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.published IS '공개 여부';

--
-- Name: COLUMN posts.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.kind IS '구분 (post=블로그 글, note=짧은 글)';

--
-- Name: COLUMN posts.private; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.private IS '비공개 여부 (나만 보기)';

--
-- Name: COLUMN posts.series_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.series_group IS '연재 그룹. 늘 00003(연재) - 외래 키가 그룹까지 보게 하려고 둔다';

--
-- Name: COLUMN posts.series_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.series_code IS '연재(codes). 비우면 연재가 아니다. 연재 안의 순서는 발행일 순';

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;

--
-- Name: profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile (
    id integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    headline text,
    bio text NOT NULL,
    email text,
    github_url text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    work_email text,
    phone text,
    homepage_url text,
    about_sections text[] DEFAULT '{profile,contacts,career,skills,work}'::text[] NOT NULL,
    CONSTRAINT profile_single_row CHECK ((id = 1))
);

--
-- Name: TABLE profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profile IS '자기소개';

--
-- Name: COLUMN profile.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.id IS '식별자 (항상 1)';

--
-- Name: COLUMN profile.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.name IS '이름';

--
-- Name: COLUMN profile.headline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.headline IS '한 줄 소개';

--
-- Name: COLUMN profile.bio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.bio IS '소개 본문';

--
-- Name: COLUMN profile.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.email IS '개인 메일';

--
-- Name: COLUMN profile.github_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.github_url IS 'GitHub 주소';

--
-- Name: COLUMN profile.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.updated_at IS '수정일시';

--
-- Name: COLUMN profile.work_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.work_email IS '회사 메일';

--
-- Name: COLUMN profile.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.phone IS '휴대폰 번호';

--
-- Name: COLUMN profile.homepage_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.homepage_url IS '다른 데 두고 쓰는 홈페이지 주소';

--
-- Name: COLUMN profile.about_sections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profile.about_sections IS '소개(/about)에서 방문자에게 보일 항목(profile · contacts · career · skills · work). 관리자에게는 늘 전부';

--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name text NOT NULL,
    summary text,
    url text,
    repo_url text,
    stack text[] DEFAULT '{}'::text[] NOT NULL,
    started_on date,
    ended_on date,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'work'::text NOT NULL,
    repo_public boolean DEFAULT true NOT NULL,
    CONSTRAINT projects_kind CHECK ((kind = ANY (ARRAY['project'::text, 'work'::text]))),
    CONSTRAINT projects_period_order CHECK (((ended_on IS NULL) OR (started_on IS NULL) OR (ended_on >= started_on)))
);

--
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.projects IS '프로젝트/수행 업무';

--
-- Name: COLUMN projects.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.id IS '일련번호';

--
-- Name: COLUMN projects.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.name IS '명칭';

--
-- Name: COLUMN projects.summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.summary IS '요약';

--
-- Name: COLUMN projects.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.url IS '사이트 주소';

--
-- Name: COLUMN projects.repo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.repo_url IS '저장소 주소';

--
-- Name: COLUMN projects.stack; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.stack IS '사용 기술 목록';

--
-- Name: COLUMN projects.started_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.started_on IS '시작일';

--
-- Name: COLUMN projects.ended_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.ended_on IS '종료일 (NULL이면 진행 중)';

--
-- Name: COLUMN projects.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.sort_order IS '정렬 순서';

--
-- Name: COLUMN projects.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.created_at IS '생성일시';

--
-- Name: COLUMN projects.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.updated_at IS '수정일시';

--
-- Name: COLUMN projects.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.kind IS '구분 (project=프로젝트, work=수행 업무)';

--
-- Name: COLUMN projects.repo_public; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.repo_public IS '저장소를 남이 열 수 있는가 (false 면 주소는 두고 링크만 안 건다)';

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;

--
-- Name: resume_licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_licenses (
    id integer NOT NULL,
    acquired_on date,
    name text NOT NULL,
    number text,
    issuer text
);

--
-- Name: TABLE resume_licenses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.resume_licenses IS '이력서의 자격증';

--
-- Name: resume_licenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resume_licenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: resume_licenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resume_licenses_id_seq OWNED BY public.resume_licenses.id;

--
-- Name: resume_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_profile (
    id integer DEFAULT 1 NOT NULL,
    birth_date date,
    company text,
    gender text,
    final_school text,
    major text,
    degree text,
    public_sections text[] DEFAULT '{career,skills,work}'::text[] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT resume_profile_single_row CHECK ((id = 1))
);

--
-- Name: TABLE resume_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.resume_profile IS '이력서에만 쓰는 인적 사항. 한 행. 소개에는 안 나온다';

--
-- Name: COLUMN resume_profile.public_sections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume_profile.public_sections IS '방문자에게 /resume 에서 보일 항목(personal · schools · trainings · licenses · career · skills · work)';

--
-- Name: resume_schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_schools (
    id integer NOT NULL,
    started_on character varying(7),
    ended_on character varying(7),
    school text NOT NULL,
    major text,
    note text
);

--
-- Name: TABLE resume_schools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.resume_schools IS '이력서의 학력. 기간은 YYYY-MM';

--
-- Name: resume_schools_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resume_schools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: resume_schools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resume_schools_id_seq OWNED BY public.resume_schools.id;

--
-- Name: resume_trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_trainings (
    id integer NOT NULL,
    taken_on character varying(7),
    course text NOT NULL,
    institution text,
    note text
);

--
-- Name: TABLE resume_trainings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.resume_trainings IS '이력서의 교육 사항. 때는 YYYY-MM';

--
-- Name: resume_trainings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resume_trainings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: resume_trainings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resume_trainings_id_seq OWNED BY public.resume_trainings.id;

--
-- Name: secret_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.secret_attachments (
    id integer NOT NULL,
    secret_id integer NOT NULL,
    storage_id text NOT NULL,
    filename text NOT NULL,
    mime_type text NOT NULL,
    size integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'file'::text NOT NULL,
    CONSTRAINT secret_attachments_kind CHECK ((kind = ANY (ARRAY['file'::text, 'image'::text])))
);

--
-- Name: TABLE secret_attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.secret_attachments IS '비밀글 첨부';

--
-- Name: COLUMN secret_attachments.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secret_attachments.id IS '일련번호';

--
-- Name: COLUMN secret_attachments.secret_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secret_attachments.secret_id IS '비밀글 번호 (secrets.id)';

--
-- Name: COLUMN secret_attachments.storage_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secret_attachments.storage_id IS '저장 파일명 (난수 32자)';

--
-- Name: COLUMN secret_attachments.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secret_attachments.filename IS '첨부 파일명 (암호문)';

--
-- Name: COLUMN secret_attachments.mime_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secret_attachments.mime_type IS 'MIME 타입 (암호문)';

--
-- Name: COLUMN secret_attachments.size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secret_attachments.size IS '원본 크기 (바이트)';

--
-- Name: COLUMN secret_attachments.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secret_attachments.created_at IS '첨부일시';

--
-- Name: COLUMN secret_attachments.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secret_attachments.kind IS '쓰임새 (file: 첨부파일, image: 본문 그림)';

--
-- Name: secret_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.secret_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: secret_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.secret_attachments_id_seq OWNED BY public.secret_attachments.id;

--
-- Name: secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.secrets (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    written_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tags text,
    diary_day date,
    mood text
);

--
-- Name: TABLE secrets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.secrets IS '비밀글';

--
-- Name: COLUMN secrets.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.id IS '일련번호';

--
-- Name: COLUMN secrets.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.title IS '제목 (암호문)';

--
-- Name: COLUMN secrets.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.content IS '본문 (암호문, 원문은 마크다운)';

--
-- Name: COLUMN secrets.written_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.written_at IS '작성 기준일시';

--
-- Name: COLUMN secrets.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.created_at IS '생성일시';

--
-- Name: COLUMN secrets.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.updated_at IS '수정일시';

--
-- Name: COLUMN secrets.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.tags IS '태그 목록 (암호문, 원문은 JSON 배열)';

--
-- Name: COLUMN secrets.diary_day; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.diary_day IS '일기장이면 그 날(하루 한 편). 비밀글은 null';

--
-- Name: COLUMN secrets.mood; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.secrets.mood IS '암호문. 일기의 기분. 비울 수 있다';

--
-- Name: secrets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.secrets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: secrets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.secrets_id_seq OWNED BY public.secrets.id;

--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id integer DEFAULT 1 NOT NULL,
    name text,
    title text,
    tagline text,
    description text,
    email text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    editor text,
    calendar_ical text,
    kakao_rest_key text,
    telegram_bot_token text,
    telegram_chat_id text,
    umami_website_id text,
    google_site_verification text,
    monitoring_dashboard text,
    gemini_api_key text,
    telegram_ai boolean DEFAULT false NOT NULL,
    calibre_url text,
    calibre_user text,
    calibre_password text,
    book_sources text,
    CONSTRAINT site_settings_editor CHECK (((editor IS NULL) OR (editor = ANY (ARRAY['milkdown'::text, 'tiptap'::text, 'toast'::text])))),
    CONSTRAINT site_settings_single_row CHECK ((id = 1))
);

--
-- Name: TABLE site_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.site_settings IS '사이트 정보 (한 행). 비면 앱의 보기 값을 쓴다';

--
-- Name: COLUMN site_settings.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.name IS '머리글 왼쪽 · 저작권 줄 · 아이콘 글자 · 글쓴이';

--
-- Name: COLUMN site_settings.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.title IS '브라우저 탭과 검색 결과의 제목';

--
-- Name: COLUMN site_settings.tagline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.tagline IS '공유 카드의 한 줄 소개';

--
-- Name: COLUMN site_settings.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.description IS '검색 결과 설명 · RSS 설명';

--
-- Name: COLUMN site_settings.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.email IS '대표 메일 (구조화 데이터)';

--
-- Name: COLUMN site_settings.editor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.editor IS '글 편집기: milkdown / tiptap / toast. 비우면 milkdown';

--
-- Name: COLUMN site_settings.calendar_ical; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.calendar_ical IS '암호문. 구글 캘린더 iCal 비공개 주소들(JSON 배열). 비우면 일정이 꺼진다';

--
-- Name: COLUMN site_settings.kakao_rest_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.kakao_rest_key IS '암호문. 카카오 책 검색 REST API 키(MYH-231). .env 의 KAKAO_REST_API_KEY 가 먼저';

--
-- Name: COLUMN site_settings.telegram_bot_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.telegram_bot_token IS '암호문. 텔레그램 알림 봇 토큰(MYH-232). .env 의 TELEGRAM_BOT_TOKEN 이 먼저';

--
-- Name: COLUMN site_settings.telegram_chat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.telegram_chat_id IS '텔레그램 내 대화방 번호. .env 의 TELEGRAM_CHAT_ID 가 먼저';

--
-- Name: COLUMN site_settings.umami_website_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.umami_website_id IS 'umami 사이트 ID. .env 의 UMAMI_WEBSITE_ID 가 먼저';

--
-- Name: COLUMN site_settings.google_site_verification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.google_site_verification IS 'Search Console 소유 확인 값. .env 의 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION 이 먼저';

--
-- Name: COLUMN site_settings.monitoring_dashboard; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.monitoring_dashboard IS '감시 화면의 Grafana 대시보드 경로. .env 의 MONITORING_DASHBOARD 가 먼저';

--
-- Name: COLUMN site_settings.gemini_api_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.gemini_api_key IS '암호문. Gemini API 키(MYH-233). .env 의 GEMINI_API_KEY 가 먼저';

--
-- Name: COLUMN site_settings.telegram_ai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.telegram_ai IS '텔레그램 글을 AI 로 먼저 가르나(MYH-233). 기본 끔';

--
-- Name: COLUMN site_settings.calibre_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.calibre_password IS '암호문. Calibre 콘텐츠 서버 비밀번호(MYH-226). .env 의 CALIBRE_PASSWORD 가 먼저';

--
-- Name: COLUMN site_settings.book_sources; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_settings.book_sources IS '책 찾기 출처의 순서 · 사용(MYH-226). kakao,-calibre,openlibrary 꼴';

--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id integer NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    category_group character varying(20) DEFAULT '00002'::character varying NOT NULL,
    category_code character varying(20),
    CONSTRAINT skills_category_group CHECK (((category_group)::text = '00002'::text))
);

--
-- Name: TABLE skills; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.skills IS '기술 스택';

--
-- Name: COLUMN skills.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skills.id IS '일련번호';

--
-- Name: COLUMN skills.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skills.name IS '기술명';

--
-- Name: COLUMN skills.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skills.sort_order IS '정렬 순서';

--
-- Name: COLUMN skills.category_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skills.category_group IS '분류 그룹. 늘 00002(기술 분류). 외래 키가 그룹까지 보게 하려고 둔다';

--
-- Name: COLUMN skills.category_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skills.category_code IS '분류(codes). 쓰고 있는 코드는 지울 수 없다';

--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skills_id_seq OWNED BY public.skills.id;

--
-- Name: todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.todos (
    id integer NOT NULL,
    title text NOT NULL,
    due_on date,
    done_at timestamp with time zone,
    source text DEFAULT 'web'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    start_on date,
    CONSTRAINT todos_range CHECK (((start_on IS NULL) OR (due_on IS NULL) OR (start_on <= due_on))),
    CONSTRAINT todos_source CHECK ((source = ANY (ARRAY['telegram'::text, 'web'::text])))
);

--
-- Name: TABLE todos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.todos IS '할 일(MYH-217). 체크리스트. 글은 암호화';

--
-- Name: COLUMN todos.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.todos.title IS '암호문. 할 일';

--
-- Name: COLUMN todos.due_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.todos.due_on IS '마감일(선택)';

--
-- Name: COLUMN todos.done_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.todos.done_at IS '끝낸 때. 안 끝났으면 null';

--
-- Name: COLUMN todos.start_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.todos.start_on IS '시작일(선택). 마감일(due_on)보다 앞';

--
-- Name: todos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.todos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: todos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.todos_id_seq OWNED BY public.todos.id;

--
-- Name: uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uploads (
    id text NOT NULL,
    filename text NOT NULL,
    mime_type text NOT NULL,
    size integer NOT NULL,
    data bytea,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: TABLE uploads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.uploads IS '업로드 파일';

--
-- Name: COLUMN uploads.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uploads.id IS '파일 식별자 (내용 해시)';

--
-- Name: COLUMN uploads.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uploads.filename IS '원본 파일명';

--
-- Name: COLUMN uploads.mime_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uploads.mime_type IS 'MIME 타입';

--
-- Name: COLUMN uploads.size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uploads.size IS '파일 크기 (바이트)';

--
-- Name: COLUMN uploads.data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uploads.data IS '파일 내용 (구 저장 방식, 미사용)';

--
-- Name: COLUMN uploads.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uploads.created_at IS '업로드일시';

--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);

--
-- Name: books id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);

--
-- Name: careers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.careers ALTER COLUMN id SET DEFAULT nextval('public.careers_id_seq'::regclass);

--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);

--
-- Name: links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links ALTER COLUMN id SET DEFAULT nextval('public.links_id_seq'::regclass);

--
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);

--
-- Name: memos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos ALTER COLUMN id SET DEFAULT nextval('public.memos_id_seq'::regclass);

--
-- Name: menus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);

--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);

--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);

--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);

--
-- Name: resume_licenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_licenses ALTER COLUMN id SET DEFAULT nextval('public.resume_licenses_id_seq'::regclass);

--
-- Name: resume_schools id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_schools ALTER COLUMN id SET DEFAULT nextval('public.resume_schools_id_seq'::regclass);

--
-- Name: resume_trainings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_trainings ALTER COLUMN id SET DEFAULT nextval('public.resume_trainings_id_seq'::regclass);

--
-- Name: secret_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secret_attachments ALTER COLUMN id SET DEFAULT nextval('public.secret_attachments_id_seq'::regclass);

--
-- Name: secrets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secrets ALTER COLUMN id SET DEFAULT nextval('public.secrets_id_seq'::regclass);

--
-- Name: skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills ALTER COLUMN id SET DEFAULT nextval('public.skills_id_seq'::regclass);

--
-- Name: todos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos ALTER COLUMN id SET DEFAULT nextval('public.todos_id_seq'::regclass);

--
-- Name: admin_password admin_password_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_password
    ADD CONSTRAINT admin_password_pkey PRIMARY KEY (id);

--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);

--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);

--
-- Name: careers careers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.careers
    ADD CONSTRAINT careers_pkey PRIMARY KEY (id);

--
-- Name: code_groups code_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_groups
    ADD CONSTRAINT code_groups_pkey PRIMARY KEY (group_code);

--
-- Name: codes codes_group_code_code_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codes
    ADD CONSTRAINT codes_group_code_code_pk PRIMARY KEY (group_code, code);

--
-- Name: codes codes_group_label; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codes
    ADD CONSTRAINT codes_group_label UNIQUE (group_code, label);

--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

--
-- Name: links links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);

--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);

--
-- Name: memos memos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_pkey PRIMARY KEY (id);

--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);

--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

--
-- Name: passkeys passkeys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passkeys
    ADD CONSTRAINT passkeys_pkey PRIMARY KEY (id);

--
-- Name: post_views_daily post_views_daily_post_id_day_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views_daily
    ADD CONSTRAINT post_views_daily_post_id_day_pk PRIMARY KEY (post_id, day);

--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);

--
-- Name: profile profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (id);

--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

--
-- Name: resume_licenses resume_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_licenses
    ADD CONSTRAINT resume_licenses_pkey PRIMARY KEY (id);

--
-- Name: resume_profile resume_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_profile
    ADD CONSTRAINT resume_profile_pkey PRIMARY KEY (id);

--
-- Name: resume_schools resume_schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_schools
    ADD CONSTRAINT resume_schools_pkey PRIMARY KEY (id);

--
-- Name: resume_trainings resume_trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_trainings
    ADD CONSTRAINT resume_trainings_pkey PRIMARY KEY (id);

--
-- Name: secret_attachments secret_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secret_attachments
    ADD CONSTRAINT secret_attachments_pkey PRIMARY KEY (id);

--
-- Name: secret_attachments secret_attachments_storage_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secret_attachments
    ADD CONSTRAINT secret_attachments_storage_id_unique UNIQUE (storage_id);

--
-- Name: secrets secrets_diary_day_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secrets
    ADD CONSTRAINT secrets_diary_day_key UNIQUE (diary_day);

--
-- Name: secrets secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secrets
    ADD CONSTRAINT secrets_pkey PRIMARY KEY (id);

--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);

--
-- Name: skills skills_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_unique UNIQUE (name);

--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);

--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);

--
-- Name: uploads uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uploads
    ADD CONSTRAINT uploads_pkey PRIMARY KEY (id);

--
-- Name: attachments_post_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_post_idx ON public.attachments USING btree (post_id);

--
-- Name: attachments_post_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_post_kind_idx ON public.attachments USING btree (post_id, kind);

--
-- Name: books_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX books_status_idx ON public.books USING btree (status, finished_on);

--
-- Name: careers_started_on_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX careers_started_on_idx ON public.careers USING btree (started_on DESC NULLS LAST);

--
-- Name: codes_group_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX codes_group_sort_idx ON public.codes USING btree (group_code, sort_order);

--
-- Name: comments_guestbook_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_guestbook_idx ON public.comments USING btree (created_at DESC) WHERE (post_id IS NULL);

--
-- Name: comments_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_post_id_idx ON public.comments USING btree (post_id, created_at);

--
-- Name: links_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX links_sort_idx ON public.links USING btree (sort_order, name);

--
-- Name: login_attempts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_attempts_idx ON public.login_attempts USING btree (ip_hash, created_at);

--
-- Name: memos_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX memos_created_idx ON public.memos USING btree (created_at DESC);

--
-- Name: menus_parent_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menus_parent_sort_idx ON public.menus USING btree (parent_id, sort_order);

--
-- Name: messages_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_created_idx ON public.messages USING btree (created_at DESC NULLS LAST);

--
-- Name: passkeys_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX passkeys_created_idx ON public.passkeys USING btree (created_at DESC NULLS LAST);

--
-- Name: post_views_daily_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_views_daily_day_idx ON public.post_views_daily USING btree (day);

--
-- Name: posts_content_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_content_trgm_idx ON public.posts USING gin (content public.gin_trgm_ops);

--
-- Name: posts_kind_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_kind_published_idx ON public.posts USING btree (kind, published_at DESC NULLS LAST);

--
-- Name: posts_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_published_at_idx ON public.posts USING btree (published_at DESC NULLS LAST);

--
-- Name: posts_series_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_series_idx ON public.posts USING btree (series_code, published_at);

--
-- Name: posts_tags_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_tags_idx ON public.posts USING gin (tags);

--
-- Name: posts_title_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_title_trgm_idx ON public.posts USING gin (title public.gin_trgm_ops);

--
-- Name: projects_kind_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_kind_sort_idx ON public.projects USING btree (kind, sort_order, started_on DESC NULLS LAST);

--
-- Name: projects_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_sort_idx ON public.projects USING btree (sort_order, started_on DESC NULLS LAST);

--
-- Name: secret_attachments_secret_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX secret_attachments_secret_idx ON public.secret_attachments USING btree (secret_id);

--
-- Name: secret_attachments_secret_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX secret_attachments_secret_kind_idx ON public.secret_attachments USING btree (secret_id, kind);

--
-- Name: secrets_written_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX secrets_written_idx ON public.secrets USING btree (written_at DESC NULLS LAST);

--
-- Name: skills_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX skills_sort_idx ON public.skills USING btree (sort_order, name);

--
-- Name: attachments attachments_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

--
-- Name: attachments attachments_upload_id_uploads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_upload_id_uploads_id_fk FOREIGN KEY (upload_id) REFERENCES public.uploads(id);

--
-- Name: books books_category_codes_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_category_codes_fk FOREIGN KEY (category_group, category_code) REFERENCES public.codes(group_code, code) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: books books_cover_id_uploads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_cover_id_uploads_id_fk FOREIGN KEY (cover_id) REFERENCES public.uploads(id) ON DELETE SET NULL;

--
-- Name: books books_kind_codes_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_kind_codes_fk FOREIGN KEY (kind_group, kind_code) REFERENCES public.codes(group_code, code) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: codes codes_group_code_code_groups_group_code_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codes
    ADD CONSTRAINT codes_group_code_code_groups_group_code_fk FOREIGN KEY (group_code) REFERENCES public.code_groups(group_code) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: comments comments_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

--
-- Name: links links_category_codes_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_category_codes_fk FOREIGN KEY (category_group, category_code) REFERENCES public.codes(group_code, code) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: menus menus_parent_id_menus_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_parent_id_menus_id_fk FOREIGN KEY (parent_id) REFERENCES public.menus(id) ON DELETE CASCADE;

--
-- Name: post_views_daily post_views_daily_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views_daily
    ADD CONSTRAINT post_views_daily_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

--
-- Name: posts posts_series_codes_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_series_codes_fk FOREIGN KEY (series_group, series_code) REFERENCES public.codes(group_code, code) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: secret_attachments secret_attachments_secret_id_secrets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secret_attachments
    ADD CONSTRAINT secret_attachments_secret_id_secrets_id_fk FOREIGN KEY (secret_id) REFERENCES public.secrets(id) ON DELETE CASCADE;

--
-- Name: skills skills_category_codes_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_category_codes_fk FOREIGN KEY (category_group, category_code) REFERENCES public.codes(group_code, code) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- PostgreSQL database dump complete
--
--> statement-breakpoint
INSERT INTO public.code_groups (group_code, name, sort_order) VALUES ('00001', '내 서비스 분류', 10);
INSERT INTO public.code_groups (group_code, name, sort_order) VALUES ('00002', '기술 분류', 20);
INSERT INTO public.code_groups (group_code, name, sort_order) VALUES ('00003', '연재', 30);
INSERT INTO public.code_groups (group_code, name, sort_order) VALUES ('00004', '책 종류', 40);
INSERT INTO public.code_groups (group_code, name, sort_order) VALUES ('00005', '책 분류', 50);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00001', '00001', '내 서버', 10, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00001', '00002', '바깥 도구', 20, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00002', '00001', '도메인', 10, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00002', '00002', '데이터', 20, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00002', '00003', '백엔드', 30, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00002', '00004', '프론트엔드', 40, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00002', '00005', '인프라', 50, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00002', '00006', '설계 · 보안', 60, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00002', '00007', '요즘 보는 것', 70, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00004', '00001', '종이책', 10, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00005', '00007', '교양', 80, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00004', '00002', '전자책', 20, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00005', '00001', '컴퓨터', 10, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00005', '00003', '소설', 40, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00005', '00004', '에세이', 50, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00005', '00005', '자기계발', 60, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00005', '00006', '경제 · 경영', 70, true);
INSERT INTO public.codes (group_code, code, label, sort_order, active) VALUES ('00005', '00002', '과학', 20, true);
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (1, '블로그', '/blog', NULL, 10, 'all');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (2, '짧은 글', '/notes', NULL, 20, 'all');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (4, '프로젝트', '/projects', NULL, 40, 'all');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (8, '관리', NULL, NULL, 80, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (20, '방명록', '/guestbook', NULL, 45, 'all');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (21, '책', '/books', NULL, 42, 'all');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (24, '내 공간', NULL, NULL, 75, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (3, '비밀글', '/admin/secrets', 24, 40, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (6, '내 서비스', '/admin/links', 24, 60, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (7, '감시', '/admin/monitoring', 24, 70, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (9, '메시지', '/admin/messages', 8, 10, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (10, '글', NULL, 8, 20, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (13, '프로젝트', '/admin/projects', 8, 30, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (14, '설정', NULL, 8, 40, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (25, '일기장', '/admin/diary', 24, 50, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (26, '메모', '/admin/memos', 24, 30, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (27, '할 일', '/admin/todos', 24, 20, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (28, '일정', '/admin/calendar', 24, 10, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (30, '대시보드', '/admin', 8, 5, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (11, '블로그', '/admin/posts', 10, 10, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (12, '짧은 글', '/admin/notes', 10, 20, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (15, '프로필', '/admin/profile', 14, 40, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (16, '보안', '/admin/security', 14, 60, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (17, '메뉴', '/admin/menus', 14, 20, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (18, '사이트', '/admin/site', 14, 30, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (19, '코드', '/admin/codes', 14, 10, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (22, '책', '/admin/books', 10, 30, 'admin');
INSERT INTO public.menus (id, label, href, parent_id, sort_order, audience) VALUES (29, '환경설정', '/admin/settings', 14, 55, 'admin');
INSERT INTO public.resume_profile (id, birth_date, company, gender, final_school, major, degree, public_sections, updated_at) VALUES (1, NULL, NULL, NULL, NULL, NULL, NULL, '{career,skills,work}', '2026-10-11 22:29:09.302988+09');
SELECT pg_catalog.setval('public.menus_id_seq', 30, true);
