/**
 * 자기소개 초기 데이터를 넣는다. 여러 번 실행해도 같은 결과가 되도록
 * 기존 행을 지우고 다시 넣는다.
 *
 *   npm run db:seed
 */
import { eq } from "drizzle-orm";
import { nextCode, SKILL_CATEGORY } from "../lib/codes/groups";
import { getDb, profile, careers, skills, codes } from "../lib/db";

// 개발 DB에 넣으려면 DRIZZLE_ENV=dev 를 준다.
//
// 순서가 중요하다. loadEnvFile 은 이미 설정된 값을 덮어쓰지 않으므로,
// 개발 DB를 쓰려면 .env.development.local 을 먼저 읽어야 한다.
// 반대로 하면 운영 DB의 데이터를 지우게 된다.
const envFiles =
  process.env.DRIZZLE_ENV === "dev"
    ? [".env.development.local", ".env.local"]
    : [".env.local"];

for (const file of envFiles) {
  try {
    process.loadEnvFile(file);
  } catch {
    // 없으면 넘어간다
  }
}

/**
 * 보기 값이다(MYH-171). 누구의 것도 아닌 이름과 example.com 주소를 쓴다 —
 * 이 파일은 공개 저장소로도 나가고, 처음 설치한 사람의 화면에 그대로 뜬다.
 * 휴대폰 "010-" 은 「아직 다 안 적은 번호」 의 보기다(전화 링크를 걸지 않는다).
 */
const PROFILE = {
  id: 1,
  name: "홍길동",
  headline: "개발과 기록을 담는 개인 홈페이지입니다.",
  bio: [
    "여기에 자기소개를 씁니다. 어떤 일을 하는지, 어떤 문제를 좋아하는지, 요즘 무엇을 배우고 있는지 정도면 충분합니다.",
    "단락은 빈 줄로 나눕니다. 이 문단은 두 번째 단락입니다.",
  ].join("\n\n"),
  email: "hong@example.com",
  workEmail: "hong@work.example.com",
  phone: "010-",
  githubUrl: "https://github.com/example",
};

const CAREERS = [
  {
    company: "회사 이름",
    role: "직무",
    detail: "무엇을 했는지 한 줄.",
    startedOn: "2020-01-01",
    endedOn: null,
  },
  {
    company: "이전 회사",
    role: "직무",
    detail: "무엇을 했는지 한 줄.",
    startedOn: "2016-03-01",
    endedOn: "2019-12-31",
  },
];

const SKILLS = [
  { name: "TypeScript", category: "언어", sortOrder: 10 },
  { name: "React", category: "프론트엔드", sortOrder: 20 },
  { name: "Next.js", category: "프론트엔드", sortOrder: 30 },
  { name: "Node.js", category: "백엔드", sortOrder: 40 },
  { name: "PostgreSQL", category: "데이터", sortOrder: 50 },
];

async function main() {
  const db = getDb();

  await db.delete(careers);
  await db.delete(skills);
  await db.delete(profile);

  await db.insert(profile).values(PROFILE);
  await db.insert(careers).values(CAREERS);

  // 분류는 코드 테이블에 있다(MYH-131). 있으면 그대로 두고 없는 것만 더한다 -
  // 내 서비스도 같은 테이블을 쓰므로 지우지 않는다. 묶음(00002)은 0031 이 만든다.
  const labels = [...new Set(SKILLS.map((s) => s.category))];
  const existing = await db
    .select({ code: codes.code, label: codes.label })
    .from(codes)
    .where(eq(codes.groupCode, SKILL_CATEGORY));
  const codeOf = new Map(existing.map((r) => [r.label, r.code]));
  for (const label of labels) {
    if (codeOf.has(label)) continue;
    const code = nextCode([...codeOf.values()]);
    await db.insert(codes).values({
      groupCode: SKILL_CATEGORY,
      code,
      label,
      sortOrder: (codeOf.size + 1) * 10,
    });
    codeOf.set(label, code);
  }
  await db.insert(skills).values(
    SKILLS.map(({ category, ...rest }) => ({
      ...rest,
      categoryCode: codeOf.get(category) ?? null,
    })),
  );

  console.log(
    `완료 — profile 1행, careers ${CAREERS.length}행, skills ${SKILLS.length}행`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
