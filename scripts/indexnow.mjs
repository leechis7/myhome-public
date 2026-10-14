/**
 * sitemap 에 있는 주소들을 IndexNow 로 알린다.
 *
 *   node scripts/indexnow.mjs               운영 사이트의 sitemap 을 읽어 보낸다
 *   node scripts/indexnow.mjs --dry         무엇을 보낼지만 보여준다
 *   SITE_URL=... INDEXNOW_KEY=... node scripts/indexnow.mjs
 *
 * 구글은 IndexNow 에 참여하지 않는다. Bing·Naver·Yandex·Seznam 이 받는다.
 *
 * lib/posts/indexnow.ts 를 그대로 쓴다. Node 가 "모듈 종류가 안 적혀 있다"고
 * 경고하는데 성능 안내일 뿐이라, npm 스크립트에서 그 경고만 껐다.
 */
import { findIndexNowKey, submitToIndexNow } from "../lib/posts/indexnow.ts";

const site = process.env.SITE_URL;
if (!site) {
  console.error("SITE_URL 이 없습니다. 예: SITE_URL=https://example.com node scripts/indexnow.mjs");
  process.exit(1);
}
const host = new URL(site).host;
const dry = process.argv.includes("--dry");

// INDEXNOW_KEY(환경설정의 열쇠와 같은 값). 없으면 public/<열쇠>.txt 파일 이름
const key = findIndexNowKey(new URL("../public", import.meta.url));
if (!key) {
  console.error("열쇠가 없다. 환경설정 › 검색 등록 의 IndexNow 열쇠를 INDEXNOW_KEY=… 로 준다.");
  process.exit(1);
}

const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

console.log(`사이트  ${site}`);
console.log(`열쇠    ${key.slice(0, 8)}…`);
console.log(`주소    ${urls.length}개`);
for (const u of urls) console.log(`  ${decodeURIComponent(u)}`);

// 열쇠 파일이 정말 그 주소에서 보이는지 먼저 본다. 안 보이면 거절당한다.
const keyUrl = `${site}/${key}.txt`;
const keyRes = await fetch(keyUrl);
const keyBody = (await keyRes.text()).trim();
console.log(`\n열쇠 파일  ${keyRes.status}  ${keyUrl}`);
if (!keyRes.ok || keyBody !== key) {
  console.error("열쇠 파일이 안 보이거나 내용이 다르다. 배포됐는지 확인하라.");
  process.exit(1);
}

if (dry) {
  console.log("\n--dry 라 보내지 않았다.");
  process.exit(0);
}

const result = await submitToIndexNow({ host, key, urls });
console.log(
  `\n결과  ${result.status}  ${result.accepted ? "받아들여짐" : "거절"}`,
);
if (result.body) console.log(`본문  ${result.body}`);
process.exit(result.accepted ? 0 : 1);
