import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * 여기 적은 설명은 DB 에도 COMMENT 로 붙어 있다(0023). psql 에서 `\d+ 테이블`
 * 로 보면 나온다. drizzle-kit 은 COMMENT 를 만들어 주지 않으므로, 테이블이나
 * 컬럼을 더할 때 마이그레이션에 `COMMENT ON` 한 줄을 손으로 함께 적는다.
 */

/**
 * 자기소개. 한 행만 존재하는 단일 레코드 테이블.
 */
export const profile = pgTable(
  "profile",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull(),
    /** 이름 아래 한 줄 소개 */
    headline: text("headline"),
    /** 본문 소개글. 빈 줄로 단락을 나눈다 */
    bio: text("bio").notNull(),
    /** 개인 메일. 소개·연락처에 보여준다 */
    email: text("email"),
    /** 회사 메일. 일로 오는 연락을 나눠 받는다 */
    workEmail: text("work_email"),
    /** 휴대폰. 비워 두면 화면에 나오지 않는다 */
    phone: text("phone"),
    githubUrl: text("github_url"),
    /** 다른 데 두고 쓰는 홈페이지. 이 사이트 말고 */
    homepageUrl: text("homepage_url"),
    /**
     * 소개에서 방문자에게 보일 항목(MYH-220). 값은 lib/about-sections.ts.
     * 관리자에게는 늘 전부 보인다. 처음은 전부.
     */
    aboutSections: text("about_sections")
      .array()
      .notNull()
      .default(sql`'{profile,contacts,career,skills,work}'::text[]`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("profile_single_row", sql`${t.id} = 1`)],
);

/**
 * 경력. endedOn이 null이면 재직 중으로 표시한다.
 */
export const careers = pgTable(
  "careers",
  {
    id: serial("id").primaryKey(),
    company: text("company").notNull(),
    role: text("role").notNull(),
    detail: text("detail"),
    startedOn: date("started_on").notNull(),
    endedOn: date("ended_on"),
  },
  (t) => [
    index("careers_started_on_idx").on(t.startedOn.desc()),
    check(
      "careers_period_order",
      sql`${t.endedOn} is null or ${t.endedOn} >= ${t.startedOn}`,
    ),
  ],
);

/**
 * 코드. 고르는 칸에 나오는 이름표를 모아 둔다(MYH-131).
 *
 * 분류 같은 값이 글자 그대로 흩어져 있어서, 오타 하나면 새 분류가 생기고
 * 이름을 바꾸려면 쓰는 줄을 다 고쳐야 했다. 흔한 「공통코드」 모양이다 —
 * 그룹(code_groups)과 그 안의 코드(codes), 키는 (그룹 번호, 코드 번호).
 * 번호는 뜻 없는 다섯 자리 글자(00001 …)가 기본이고, 코드는 글자로 적어도 된다.
 *
 * 쓰는 쪽은 이름이 아니라 **(그룹, 코드) 두 컬럼**을 가리킨다(외래 키) —
 * 이름을 고쳐도 쓰는 줄은 그대로고, 없는 코드나 다른 그룹의 코드를 가리키거나
 * 쓰는 곳이 남은 코드를 지울 수 없다(DB 가 막는다).
 *
 * **사람이 고르는 이름표만 둔다.** 코드가 갈라 쓰는 값(프로젝트 종류 project /
 * work, 글 종류 post / note)은 옮기지 않는다. 테이블에 있는데 코드가 모르는
 * 값이 생기면 조용히 아무 일도 안 일어난다.
 */
export const codeGroups = pgTable("code_groups", {
  /** 그룹 번호. 다섯 자리 글자(00001, 00002 …). lib/codes.ts 에 이름 붙은 상수가 있다 */
  groupCode: varchar("group_code", { length: 20 }).primaryKey(),
  /** 화면에 보이는 그룹 이름 */
  name: text("name").notNull(),
  /** 코드 화면에 그룹이 나오는 순서 */
  sortOrder: integer("sort_order").notNull().default(0),
});

export const codes = pgTable(
  "codes",
  {
    groupCode: varchar("group_code", { length: 20 })
      .notNull()
      // 그룹 코드를 바꾸면 따라간다(MYH-183). 코드가 남은 그룹은 못 지운다
      .references(() => codeGroups.groupCode, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    /**
     * 그룹 안의 코드. 비워 두고 더하면 숫자 코드 가운데 가장 큰 것 다음 번호를
     * 다섯 자리로 채운다(00001 …). 글자로 적어도 된다. 바꾸면 쓰는 줄도 따라
     * 바뀐다(ON UPDATE CASCADE)
     */
    code: varchar("code", { length: 20 }).notNull(),
    /** 화면에 보이는 이름. 언제 고쳐도 쓰는 줄은 그대로다 */
    label: text("label").notNull(),
    /** 그룹 안의 순서. 목록 · 소개 화면에서 분류가 나오는 순서이기도 하다 */
    sortOrder: integer("sort_order").notNull().default(0),
    /** 끄면 고르는 칸에서 빠진다. 이미 붙은 줄에는 그대로 보인다 */
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.groupCode, t.code] }),
    unique("codes_group_label").on(t.groupCode, t.label),
    index("codes_group_sort_idx").on(t.groupCode, t.sortOrder),
  ],
);

/**
 * 기술 스택. 분류(codes)로 묶고 sortOrder로 순서를 정한다.
 */
export const skills = pgTable(
  "skills",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    /** 분류 그룹. 늘 00002(기술 분류)다 - 외래 키가 그룹까지 보게 하려고 둔다 */
    categoryGroup: varchar("category_group", { length: 20 })
      .notNull()
      .default("00002"),
    /** 분류(codes). 지우려는 코드를 쓰고 있으면 막는다 */
    categoryCode: varchar("category_code", { length: 20 }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("skills_sort_idx").on(t.sortOrder, t.name),
    check("skills_category_group", sql`${t.categoryGroup} = '00002'`),
    foreignKey({
      name: "skills_category_codes_fk",
      columns: [t.categoryGroup, t.categoryCode],
      foreignColumns: [codes.groupCode, codes.code],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/**
 * 이력서에만 쓰는 인적 사항(MYH-198). 한 행만 있다. 소개 화면에는 나오지
 * 않는다. 성명은 profile.name 을, 연령 · 전산 경력은 생년월일 · 경력에서
 * 셈해 보인다.
 *
 * public_sections 는 방문자에게 /resume 에서 보일 항목이다. 관리자에게는
 * 늘 전부 보인다. 값은 lib/resume.ts 의 RESUME_SECTIONS.
 */
export const resumeProfile = pgTable(
  "resume_profile",
  {
    id: integer("id").primaryKey().default(1),
    birthDate: date("birth_date"),
    /** 소속사 */
    company: text("company"),
    gender: text("gender"),
    finalSchool: text("final_school"),
    major: text("major"),
    degree: text("degree"),
    publicSections: text("public_sections")
      .array()
      .notNull()
      .default(sql`'{career,skills,work}'::text[]`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("resume_profile_single_row", sql`${t.id} = 1`)],
);

/** 이력서의 학력(MYH-198). 기간은 년-월(YYYY-MM) */
export const resumeSchools = pgTable("resume_schools", {
  id: serial("id").primaryKey(),
  startedOn: varchar("started_on", { length: 7 }),
  endedOn: varchar("ended_on", { length: 7 }),
  school: text("school").notNull(),
  major: text("major"),
  /** 졸업 · 수료 · 중퇴 … */
  note: text("note"),
});

/** 이력서의 교육 사항(MYH-198). 때는 년-월(YYYY-MM) */
export const resumeTrainings = pgTable("resume_trainings", {
  id: serial("id").primaryKey(),
  takenOn: varchar("taken_on", { length: 7 }),
  course: text("course").notNull(),
  institution: text("institution"),
  note: text("note"),
});

/** 이력서의 자격증(MYH-198) */
export const resumeLicenses = pgTable("resume_licenses", {
  id: serial("id").primaryKey(),
  acquiredOn: date("acquired_on"),
  name: text("name").notNull(),
  /** 자격증 번호 */
  number: text("number"),
  issuer: text("issuer"),
});

/**
 * 읽는 책(MYH-190). 산 책 · 이북 · 오디오북 가운데 읽고 있는 것을 직접 적고
 * 소개 화면에 보인다. 종류는 코드 그룹 00004(책 종류), 분류는 00005(책 분류)다.
 */
export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    /** 종류 그룹. 늘 00004(책 종류) - 외래 키가 그룹까지 보게 하려고 둔다 */
    kindGroup: varchar("kind_group", { length: 20 })
      .notNull()
      .default("00004"),
    /** 종류(codes): 종이책 · 이북 · 오디오북 … 비워도 된다 */
    kindCode: varchar("kind_code", { length: 20 }),
    /** 분류 그룹. 늘 00005(책 분류) - 외래 키가 그룹까지 보게 하려고 둔다 */
    categoryGroup: varchar("category_group", { length: 20 })
      .notNull()
      .default("00005"),
    /** 분류(codes, MYH-225): 컴퓨터 · 교양 · 소설 … 비워도 된다 */
    categoryCode: varchar("category_code", { length: 20 }),
    /** want(읽고 싶은 책, MYH-227) · reading(읽는 중) · read(다 읽음) */
    status: text("status").notNull().default("reading"),
    /** 한두 줄 소개. 내 말로 */
    note: text("note"),
    /** 표지(uploads.id). 비워도 된다. 그림이 지워지면 비운다 */
    coverId: text("cover_id").references(() => uploads.id, {
      onDelete: "set null",
    }),
    /** 서점 · 출판사 링크 */
    url: text("url"),
    startedOn: date("started_on"),
    finishedOn: date("finished_on"),
    /** 독서 노트(MYH-211). 마크다운. 읽는 중에도 쓴다 */
    readingNote: text("reading_note"),
    /** 별점 1~5. 비워도 된다 */
    rating: smallint("rating"),
    /** 독서 노트를 마지막으로 고친 때. 상세 화면 · 사이트맵이 쓴다 */
    noteUpdatedAt: timestamp("note_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("books_status", sql`${t.status} in ('want', 'reading', 'read')`),
    check("books_kind_group", sql`${t.kindGroup} = '00004'`),
    check("books_category_group", sql`${t.categoryGroup} = '00005'`),
    check("books_rating", sql`${t.rating} between 1 and 5`),
    foreignKey({
      name: "books_kind_codes_fk",
      columns: [t.kindGroup, t.kindCode],
      foreignColumns: [codes.groupCode, codes.code],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      name: "books_category_codes_fk",
      columns: [t.categoryGroup, t.categoryCode],
      foreignColumns: [codes.groupCode, codes.code],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    index("books_status_idx").on(t.status, t.finishedOn),
  ],
);

/**
 * 블로그 글. 본문은 마크다운으로 저장한다.
 * publishedAt이 null이면 임시저장 상태이고 공개 페이지에 나오지 않는다.
 */
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    /**
     * 두 가지가 담긴다. 담을 컬럼과 딸린 것(댓글·태그·조회수)이 같아서 한 테이블을
     * 쓴다 — projects 를 kind 로 나눈 것과 같은 이유다.
     *
     *   post  블로그 글. 제목이 있고 목차·개정을 쓴다
     *   note  짧은 글. 제목 없이 본문만 쌓는다
     */
    kind: text("kind").notNull().default("post"),
    title: text("title").notNull(),
    /** 목록에 보여줄 한두 줄 요약 */
    summary: text("summary"),
    /** 마크다운 본문 */
    content: text("content").notNull(),
    tags: text("tags").array().notNull().default([]),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** 조회수. 같은 방문자의 연속 조회는 세지 않는다 */
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /**
     * 지금 공개 중인가.
     *
     * 예전에는 published_at 이 null 이면 비공개였다. 그러면 글을 내릴 때
     * 발행일을 지워야 하고, 다시 올리면 발행일이 그때가 됐다. 공개 여부와
     * 처음 낸 날은 다른 이야기라 나눴다.
     */
    published: boolean("published").notNull().default(false),
    /**
     * 나만 보는 글인가.
     *
     * 임시저장과 다르다 — 임시저장(published=false)은 "아직 쓰는 중" 이고,
     * 이것은 "다 썼지만 나만 본다" 다. 그래서 published 를 그대로 두고 컬럼을
     * 하나 더 뒀다. 컬럼을 더하는 변경이라 옛 코드로 되돌려도 안전하다
     * (옛 코드는 이 컬럼을 보지 않으니 그 글이 공개로 보일 뿐이다 —
     * 되돌릴 일이 있으면 내려 두고 되돌린다).
     *
     * 세 상태가 이 둘로 표현된다.
     *   공개      published=true,  private=false
     *   나만 보기  published=true,  private=true
     *   임시저장   published=false
     */
    private: boolean("private").notNull().default(false),
    /**
     * 문서 버전. 사람이 적는다 ("1.0", "1.1", "2판" 처럼 자유롭게).
     * 이 값이 바뀌면 개정한 것으로 보고 revised_at 을 지금으로 찍는다.
     */
    version: text("version"),
    /**
     * 개정일. 문서 버전을 바꿔 저장할 때 찍힌다.
     * 목록은 이 값이 있으면 이것으로 줄을 세운다(없으면 발행일).
     * 고칠 때마다 바뀌는 updated_at 과 다르다 — 고쳐 쓴 판을 가리킨다.
     */
    revisedAt: timestamp("revised_at", { withTimezone: true }),
    /** 연재 그룹. 늘 00003(연재)이다 - 외래 키가 그룹까지 보게 하려고 둔다 */
    seriesGroup: varchar("series_group", { length: 20 })
      .notNull()
      .default("00003"),
    /**
     * 연재(codes, MYH-187). 비우면 연재가 아니다. 연재 안의 순서는 발행일 순이다.
     * 지우려는 연재를 글이 쓰고 있으면 막는다
     */
    seriesCode: varchar("series_code", { length: 20 }),
  },
  (t) => [
    check("posts_kind", sql`${t.kind} in ('post', 'note')`),
    check("posts_series_group", sql`${t.seriesGroup} = '00003'`),
    foreignKey({
      name: "posts_series_codes_fk",
      columns: [t.seriesGroup, t.seriesCode],
      foreignColumns: [codes.groupCode, codes.code],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    index("posts_series_idx").on(t.seriesCode, t.publishedAt),
    index("posts_kind_published_idx").on(t.kind, t.publishedAt.desc()),
    index("posts_published_at_idx").on(t.publishedAt.desc()),
    // 제목·본문 부분 문자열 검색(ILIKE '%...%')용. pg_trgm은 initdb에서 설치한다.
    index("posts_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
    index("posts_content_trgm_idx").using(
      "gin",
      sql`${t.content} gin_trgm_ops`,
    ),
    // 태그 배열 포함 검색용
    index("posts_tags_idx").using("gin", t.tags),
  ],
);

/**
 * 글이 날마다 몇 번 읽혔나(MYH-189). posts.view_count 는 누적 한 칸이라
 * 「최근 90일」 을 셀 수 없어 따로 둔다. 조회수를 올릴 때 그날 줄도 올린다.
 * 날짜는 한국 날짜다. 글을 지우면 함께 지운다.
 */
export const postViewsDaily = pgTable(
  "post_views_daily",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.day] }),
    index("post_views_daily_day_idx").on(t.day),
  ],
);

/**
 * 블로그 댓글. 로그인 없이 이름만 적고 쓴다.
 * 글이 지워지면 댓글도 함께 지운다.
 *
 * 방명록(MYH-191)도 여기 담는다. 글과 상관없는 한마디라 post_id 가 비어 있다.
 * 이름 · 내용 제한 · 도배 막기 · 알림 · 지우기가 댓글과 같아서 테이블을 나누지
 * 않았다.
 */
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    /** 어느 글의 댓글인가. 비어 있으면 방명록이다 */
    postId: integer("post_id").references(() => posts.id, {
      onDelete: "cascade",
    }),
    author: text("author").notNull(),
    body: text("body").notNull(),
    /**
     * 도배·차단 판단에만 쓰는 값. 원본 IP는 남기지 않는다.
     */
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comments_post_id_idx").on(t.postId, t.createdAt),
    // 방명록 목록(post_id 가 빈 것, 최신 순)
    index("comments_guestbook_idx")
      .on(t.createdAt.desc())
      .where(sql`${t.postId} is null`),
  ],
);

/**
 * 올린 파일의 기록. **내용은 디스크에 있다**(lib/storage.ts).
 *
 * 예전에는 내용까지 이 테이블(data 컬럼)에 담았다. 백업 한 번으로 파일까지 보관하려던
 * 것이었는데, 첨부파일이 생기면서 DB 덤프가 파일 크기만큼 부풀었다.
 *
 * data 컬럼은 아직 남겨 둔다. 옛 코드로 되돌렸을 때 그 컬럼을 읽기 때문이다.
 * 옮기는 스크립트를 돌린 뒤 다음 판에서 지운다(docs/WORKFLOW.md 의
 * "지우고 바꾸는 것은 두 판으로 나눈다").
 */
export const uploads = pgTable("uploads", {
  /** 내용 해시. 같은 파일을 여러 번 올려도 하나만 남는다 */
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  /** 옛 저장 자리. 새로 올리는 것은 여기에 담지 않는다 */
  data: customType<{ data: Buffer; driverData: Buffer }>({
    dataType: () => "bytea",
  })("data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * 글에 붙인 파일.
 *
 * 파일 내용은 uploads 가 가리키는 디스크에 있고(lib/storage.ts), 이 테이블은
 * "어느 글에 어떤 이름으로 붙었는지" 만 담는다. 같은 파일을 여러 글에
 * 붙이면 디스크에는 하나만 남는다 - 이름이 내용 해시이기 때문이다.
 *
 * 글을 지우면 같이 지운다(cascade). 디스크 파일은 아무 글도 안 가리킬 때만
 * 지운다(lib/attachments.ts).
 */
export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    /** uploads.id — 내용 해시이자 디스크에 놓인 이름 */
    uploadId: text("upload_id")
      .notNull()
      .references(() => uploads.id),
    /** 올릴 때의 이름. 내려받을 때 이 이름으로 준다 */
    filename: text("filename").notNull(),
    /**
     * 쓰임새. 자리는 같고 쓰는 곳이 다르다.
     *
     *   file   글 아래 「첨부파일」 목록에 나온다
     *   image  본문에 마크다운으로 박아 넣는 그림. 첨부 목록에는 안 나온다
     */
    kind: text("kind").notNull().default("file"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("attachments_kind", sql`${t.kind} in ('file', 'image')`),
    index("attachments_post_idx").on(t.postId),
    index("attachments_post_kind_idx").on(t.postId, t.kind),
  ],
);

/**
 * 프로젝트. endedOn이 null이면 진행 중으로 표시한다.
 */
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** 목록에 보여줄 한두 문장 */
    summary: text("summary"),
    /** 사이트 주소. 없으면 링크를 걸지 않는다 */
    url: text("url"),
    repoUrl: text("repo_url"),
    /**
     * 그 저장소를 남이 열 수 있는가.
     *
     * 비공개인데 주소만 걸어 두면 눌러 봐야 404 다. 그렇다고 주소를 안
     * 적으면 저장소가 있는지조차 알 수 없다. 적어는 두되 링크는 안 건다.
     */
    repoPublic: boolean("repo_public").notNull().default(true),
    stack: text("stack").array().notNull().default([]),
    startedOn: date("started_on"),
    endedOn: date("ended_on"),
    sortOrder: integer("sort_order").notNull().default(0),
    /**
     * 두 가지가 담긴다. 담을 컬럼이 같아서 한 테이블을 쓴다.
     *
     *   project  지금 만들고 있는 것. /projects 화면에 나온다
     *   work     지나온 업무. 소개 화면의 "수행 업무" 에 나온다
     *
     * 옮기는 일이 잦을 값이라 테이블을 나누지 않았다 — 한 줄 update 로 끝난다.
     */
    kind: text("kind").notNull().default("work"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("projects_kind", sql`${t.kind} in ('project', 'work')`),
    index("projects_kind_sort_idx").on(t.kind, t.sortOrder, t.startedOn.desc()),
    index("projects_sort_idx").on(t.sortOrder, t.startedOn.desc()),
    check(
      "projects_period_order",
      sql`${t.endedOn} is null or ${t.startedOn} is null or ${t.endedOn} >= ${t.startedOn}`,
    ),
  ],
);

/**
 * 관리자 로그인 실패 기록. 무차별 대입을 늦추는 데만 쓴다.
 * 프로세스 메모리에 두면 배포할 때마다 초기화되므로 DB에 남긴다.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    /** 원본 IP는 남기지 않는다 */
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("login_attempts_idx").on(t.ipHash, t.createdAt)],
);

/**
 * 연락 폼으로 받은 메시지.
 * 답장은 메일로 하므로 여기서는 읽음 표시만 둔다.
 */
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    body: text("body").notNull(),
    /** 도배 판단용. 원본 IP는 남기지 않는다 */
    ipHash: text("ip_hash"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_created_idx").on(t.createdAt.desc())],
);

/**
 * 같은 서버에서 돌리는 다른 서비스들. 관리자에게만 보인다.
 * 주소를 외워서 들어가지 않으려고 둔다.
 */
export const links = pgTable(
  "links",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    /** 무엇에 쓰는 것인지 한 줄 */
    note: text("note"),
    /** 분류 그룹. 늘 00001(내 서비스 분류)다 - 외래 키가 그룹까지 보게 하려고 둔다 */
    categoryGroup: varchar("category_group", { length: 20 })
      .notNull()
      .default("00001"),
    /** 성격이 다른 것을 묶는다(codes). 기술과 같은 방식이다 */
    categoryCode: varchar("category_code", { length: 20 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("links_sort_idx").on(t.sortOrder, t.name),
    check("links_category_group", sql`${t.categoryGroup} = '00001'`),
    foreignKey({
      name: "links_category_codes_fk",
      columns: [t.categoryGroup, t.categoryCode],
      foreignColumns: [codes.groupCode, codes.code],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/**
 * 관리자 비밀번호. 한 줄만 있다.
 *
 * 환경변수에 평문으로 두면 바꿀 때마다 배포해야 하고, 서버 파일을 읽을 수
 * 있는 사람에게 그대로 보인다. 되돌릴 수 없는 해시로 여기에 둔다.
 */
export const adminPassword = pgTable(
  "admin_password",
  {
    id: integer("id").primaryKey().default(1),
    /** scrypt$N$r$p$소금$해시 */
    hash: text("hash").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("admin_password_single_row", sql`${t.id} = 1`)],
);

/**
 * 얼굴·지문으로 들어오기 위해 등록한 기기들(WebAuthn).
 *
 * 기기가 하나뿐이면 그걸 잃었을 때 못 들어온다. 여러 개 등록할 수 있게 둔다.
 * 비밀번호는 뒷문으로 남겨 둔다.
 */
export const passkeys = pgTable(
  "passkeys",
  {
    /** 인증기가 만들어 준 식별자. base64url */
    id: text("id").primaryKey(),
    /** 사람이 알아볼 이름. "아이폰", "회사 노트북" */
    label: text("label").notNull(),
    publicKey: text("public_key").notNull(),
    /** 복제된 인증기를 알아채기 위한 값 */
    counter: integer("counter").notNull().default(0),
    /** usb, nfc, internal 등 */
    transports: text("transports").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [index("passkeys_created_idx").on(t.createdAt.desc())],
);

/**
 * 나만 보는 비밀글. 일기와 기억해 둘 것.
 *
 * **들어 있는 글자는 전부 암호문이다.** 제목까지 암호화한다 — 제목만 평문으로 두면
 * "무엇에 대한 글인지" 가 그대로 샌다. 열쇠는 DB 밖(서버 환경변수)에 있어서
 * 이 테이블만 통째로 가져가도 읽히지 않는다. 암호화 · 복호화는
 * `lib/secret-crypto.ts` 가 한다.
 *
 * posts 와 섞지 않았다. 저쪽은 공개가 기본이고 목록·검색·RSS·사이트맵이
 * 줄줄이 달려 있다. 한 테이블에 담으면 그 길 어딘가에서 새어 나갈 날이 온다.
 * 테이블이 다르면 그 길로 들어올 수조차 없다.
 *
 * **암호로도 못 감추는 것**: 글이 몇 편인지, 언제 썼는지, 얼마나 긴지.
 * 날짜는 목록을 줄 세우는 데 필요해서 평문으로 둔다.
 */
export const secrets = pgTable(
  "secrets",
  {
    id: serial("id").primaryKey(),
    /** 암호문. `v1.<iv>.<태그>.<암호문>` */
    title: text("title").notNull(),
    /** 암호문. 원문은 마크다운 */
    content: text("content").notNull(),
    /**
     * 암호문. 원문은 태그를 담은 JSON 배열.
     *
     * 태그도 암호화한다 — "건강", "돈", "아이" 같은 낱말만으로도 무엇에 대한
     * 글인지가 샌다. 대신 SQL 로는 못 거른다. 복호화해서 메모리에서 거른다
     * (글 수가 적다). 태그가 없으면 null 이다.
     */
    tags: text("tags"),
    /**
     * 글이 가리키는 날. 어제 일을 오늘 적을 수 있어서 만든 날과 나눠 둔다.
     * 목록은 이 값으로 줄을 세운다.
     */
    writtenAt: timestamp("written_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /**
     * 일기장(MYH-213)이면 그 날. 하루 한 편이라 겹치지 않는다. 비밀글은
     * null 이다 — 비밀글 목록은 이것이 빈 줄만 본다. 날짜는 암호화하지 않는다
     * (달력을 그리려면 SQL 로 골라야 한다). 무슨 날에 썼는지만 드러난다.
     */
    diaryDay: date("diary_day").unique("secrets_diary_day_key"),
    /** 암호문. 일기의 기분(good · okay · meh · sad · angry · tired). 비울 수 있다 */
    mood: text("mood"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("secrets_written_idx").on(t.writtenAt.desc())],
);

/**
 * 비밀글에 붙인 파일. 파일 내용도 암호화해서 디스크에 둔다.
 *
 * uploads 를 쓰지 않는다. 저쪽은 이름이 내용 해시라, 같은 파일을 가진 사람이
 * 주소를 찍어 보는 것만으로 "이 파일이 여기 있다" 를 알 수 있다. 이쪽 이름은
 * 난수다 — 내용과 아무 관계가 없다.
 */
export const secretAttachments = pgTable(
  "secret_attachments",
  {
    id: serial("id").primaryKey(),
    secretId: integer("secret_id")
      .notNull()
      .references(() => secrets.id, { onDelete: "cascade" }),
    /** 디스크에 놓인 이름. 난수 16진수 32자 */
    storageId: text("storage_id").notNull().unique(),
    /** 암호문. 올릴 때의 이름 */
    filename: text("filename").notNull(),
    /** 암호문. image/png 같은 것 */
    mimeType: text("mime_type").notNull(),
    /** 암호화하기 전 크기(바이트). 화면에 보여주려고 평문으로 둔다 */
    size: integer("size").notNull(),
    /** attachments.kind 와 같다. 암호화하는 자리는 같고 쓰는 곳만 다르다 */
    kind: text("kind").notNull().default("file"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("secret_attachments_kind", sql`${t.kind} in ('file', 'image')`),
    index("secret_attachments_secret_idx").on(t.secretId),
    index("secret_attachments_secret_kind_idx").on(t.secretId, t.kind),
  ],
);

/**
 * 메뉴. 위쪽 메뉴 하나를 트리로 담는다.
 *
 * 전에는 코드 세 군데(lib/site.ts, Header, AdminNav)에 흩어져 있어서 한 줄
 * 옮기려 해도 배포를 해야 했다. 관리 화면 메뉴도 따로 두지 않는다 — 관리자
 * 에게만 보이는 "관리" 그룹이 위쪽 메뉴 안에 있다. 처음 값은 lib/menus.ts 의
 * DEFAULT_MENUS 와 같고, "처음 상태로" 가 그 값으로 되돌린다.
 *
 * **관리자 줄을 거르는 것은 서버에서 한다.** 화면단에서 감추면 HTML 에
 * 남아 소스 보기로 드러난다. lib/menus.ts 의 visibleMenu 가 거른다.
 */
export const menus = pgTable(
  "menus",
  {
    id: serial("id").primaryKey(),
    label: text("label").notNull(),
    /** 갈 곳. 비어 있으면 순수한 그룹이다 — 눌러도 가지 않고 펼치기만 한다 */
    href: text("href"),
    /** 트리를 만드는 컬럼. 비어 있으면 첫 단이다. 부모를 지우면 딸린 것도 지운다 */
    parentId: integer("parent_id").references((): AnyPgColumn => menus.id, {
      onDelete: "cascade",
    }),
    /** 형제 사이의 순서. 작은 것이 앞이다 */
    sortOrder: integer("sort_order").notNull().default(0),
    /** 누가 보나. all(모두) / admin(관리자만) */
    audience: text("audience").notNull().default("all"),
  },
  (t) => [
    check("menus_audience", sql`${t.audience} in ('all', 'admin')`),
    index("menus_parent_sort_idx").on(t.parentId, t.sortOrder),
  ],
);

/**
 * 사이트 정보. 한 행만 있는 테이블이다(MYH-169).
 *
 * 전에는 `lib/site.ts` 에 박혀 있어서 남이 받아 쓰려면 코드를 고쳐야 했다.
 * 모든 화면의 제목 · 검색 결과 · 공유 카드 · RSS · 아이콘 글자가 여기서
 * 읽는다. 비어 있거나 행이 없으면 `lib/site.ts` 의 보기 값을 쓴다.
 *
 * 사이트 주소는 여기 없다. 배포와 묶인 값이라 환경변수(NEXT_PUBLIC_SITE_URL)다.
 */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: integer("id").primaryKey().default(1),
    /** 머리글 왼쪽 · 저작권 줄 · 아이콘 글자(첫 글자) · 글쓴이 */
    name: text("name"),
    /** 브라우저 탭과 검색 결과의 제목 */
    title: text("title"),
    /** 공유 카드의 한 줄 소개 */
    tagline: text("tagline"),
    /** 검색 결과 설명 · RSS 설명 */
    description: text("description"),
    /** 대표 메일. 구조화 데이터(JSON-LD)처럼 하나만 적어야 하는 곳에 쓴다 */
    email: text("email"),
    /** 글 편집기: milkdown / tiptap / toast. 비우면 milkdown(MYH-118) */
    editor: text("editor"),
    /**
     * 암호문. 구글 캘린더 iCal 비공개 주소들(JSON 배열, MYH-214). 주소만
     * 알면 일정을 읽을 수 있어 암호화해 둔다. 비우면 일정이 꺼진다.
     */
    calendarIcal: text("calendar_ical"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("site_settings_single_row", sql`${t.id} = 1`),
    check(
      "site_settings_editor",
      sql`${t.editor} is null or ${t.editor} in ('milkdown', 'tiptap', 'toast')`,
    ),
  ],
);

/**
 * 빠른 메모(MYH-215). 텔레그램 봇으로 보낸 글이나 화면에서 쓴 한 줄을 쌓아
 * 둔다. 글은 비밀글처럼 암호화한다(SECRETS_KEY). 일기로 옮기면 그때를 적는다.
 */
export const memos = pgTable(
  "memos",
  {
    id: serial("id").primaryKey(),
    /** 암호문. 원문은 평문 글 */
    content: text("content").notNull(),
    /** 어디서 왔나: telegram · web */
    source: text("source").notNull().default("web"),
    /** 일기로 옮긴 때. 옮기지 않았으면 null */
    movedAt: timestamp("moved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("memos_source", sql`${t.source} in ('telegram', 'web')`),
    index("memos_created_idx").on(t.createdAt.desc()),
  ],
);

/**
 * 할 일(MYH-217). 체크리스트. 할 일 글은 암호화하고(SECRETS_KEY), 기한 · 끝낸 때는
 * 줄 세우기와 「넘김」 표시에 써서 평문으로 둔다.
 */
export const todos = pgTable(
  "todos",
  {
    id: serial("id").primaryKey(),
    /** 암호문. 할 일 */
    title: text("title").notNull(),
    /** 시작일(선택, MYH-228). 마감일보다 앞 */
    startOn: date("start_on"),
    /** 마감일(선택) */
    dueOn: date("due_on"),
    /** 끝낸 때. 안 끝났으면 null */
    doneAt: timestamp("done_at", { withTimezone: true }),
    /** 어디서 왔나: telegram · web */
    source: text("source").notNull().default("web"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("todos_source", sql`${t.source} in ('telegram', 'web')`),
    check(
      "todos_range",
      sql`${t.startOn} is null or ${t.dueOn} is null or ${t.startOn} <= ${t.dueOn}`,
    ),
  ],
);

export type Profile = typeof profile.$inferSelect;
export type Career = typeof careers.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Upload = typeof uploads.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Link = typeof links.$inferSelect;
export type Passkey = typeof passkeys.$inferSelect;
export type Secret = typeof secrets.$inferSelect;
export type SecretAttachment = typeof secretAttachments.$inferSelect;
export type Menu = typeof menus.$inferSelect;
export type Memo = typeof memos.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type Code = typeof codes.$inferSelect;
export type CodeGroupRow = typeof codeGroups.$inferSelect;
