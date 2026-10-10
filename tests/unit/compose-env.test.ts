import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONFIG_FIELDS } from "@/lib/site/settings";

/**
 * compose 파일 둘(공개용 compose.yaml · 운영 infra/docker-compose.yml)이 앱에
 * 넘기는 환경변수가 어긋나지 않게 본다. v1.2.0 에서 운영 쪽에 KAKAO_REST_API_KEY
 * 가 빠져 .env 에 넣어도 앱에 닿지 않았다.
 */
const FILES = ["compose.yaml", "infra/docker-compose.yml"];

/** 환경설정(lib/site/settings.ts) 값과, 그 밖에 앱이 읽는 선택 값 */
const MUST = [
  ...Object.values(CONFIG_FIELDS).map((f) => f.env),
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
