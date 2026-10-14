import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SETTINGS } from "@/lib/site/settings";

/**
 * compose 파일 둘(공개용 compose.yaml · 운영 infra/docker-compose.yml)이 앱에
 * 넘기는 환경변수가 어긋나지 않게 본다. v1.2.0 에서 운영 쪽에 KAKAO_REST_API_KEY
 * 가 빠져 .env 에 넣어도 앱에 닿지 않았다.
 */
// 공개 저장소에는 infra/ 가 넘어가지 않는다 - 있는 것만 본다
const FILES = ["compose.yaml", "infra/docker-compose.yml"].filter((f) => existsSync(f));

/** 환경설정(lib/site/settings.ts) 값과, 그 밖에 앱이 읽는 선택 값 */
const MUST = [
  ...Object.values(SETTINGS).map((f) => f.env),
  "SECRETS_KEY",
  "SESSION_SECRET",
  "SITE_URL",
  "GEMINI_MODEL",
];

describe("compose 파일이 앱에 넘기는 환경변수", () => {
  for (const file of FILES) {
    it(`${file} 에 다 있다`, () => {
      const text = readFileSync(file, "utf8");
      const missing = MUST.filter((name) => !new RegExp(`^\\s+${name}:`, "m").test(text));
      expect(missing).toEqual([]);
    });
  }
});

/** .env.example 셋에도 환경설정 값이 다 적혀 있다(주석으로라도) */
describe(".env.example 이 환경설정 값을 다 적는다", () => {
  const names = Object.values(SETTINGS).map((f) => f.env);
  for (const file of [".env.example", "infra/.env.example", "export/overlay/.env.example"].filter((f) =>
    existsSync(f),
  )) {
    it(`${file}`, () => {
      const text = readFileSync(file, "utf8");
      expect(names.filter((n) => !new RegExp(`^#? ?${n}=`, "m").test(text))).toEqual([]);
    });
  }
});

/** README 의 환경설정 표에도 다 적혀 있다 - 설정을 더하고 README 를 잊지 않게 */
describe("README 가 환경설정 값을 다 적는다", () => {
  it("README.md", () => {
    const text = readFileSync("README.md", "utf8");
    expect(Object.values(SETTINGS).map((f) => f.env).filter((n) => !text.includes(n))).toEqual([]);
  });
});
