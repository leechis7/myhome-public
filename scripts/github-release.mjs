/**
 * GitHub 릴리스를 만들거나 갱신한다.
 *
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo node scripts/github-release.mjs v0.8.2
 *
 * gh 명령을 쓰지 않는다. 배포 러너는 systemd 로 도는데 그 PATH 에 gh 가
 * 없어서 한 번 실패했다. node 와 fetch 만 쓰면 그런 일이 없다.
 *
 * 본문은 CHANGELOG.md 의 그 버전 절을 그대로 쓴다.
 */
import { readFileSync } from "node:fs";
import { changelogSection } from "./changelog-section.mjs";

const tag = process.argv[2];
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

if (!tag || !repo || !token) {
  console.error("태그, GITHUB_REPOSITORY, GITHUB_TOKEN 이 모두 필요합니다.");
  process.exit(1);
}

const md = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const body = changelogSection(md, tag);
if (!body) {
  console.error(`CHANGELOG.md 에 ${tag} 항목이 없습니다.`);
  process.exit(1);
}

async function api(path, method = "GET", payload) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      "user-agent": "myhome-release",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

const found = await api(`/releases/tags/${encodeURIComponent(tag)}`);

if (found.status === 200) {
  const { status, json } = await api(`/releases/${found.json.id}`, "PATCH", {
    name: tag,
    body,
  });
  if (status !== 200) {
    console.error(`갱신 실패 ${status}: ${JSON.stringify(json).slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`릴리스 ${tag} 갱신 — ${json.html_url}`);
} else if (found.status === 404) {
  const { status, json } = await api("/releases", "POST", {
    tag_name: tag,
    name: tag,
    body,
    // 나중에 손으로 옛 버전을 채워 넣어도 "Latest" 가 엉키지 않게 한다.
    // GitHub 은 만든 순서가 아니라 버전 번호로 최신을 정해 준다.
    make_latest: "legacy",
  });
  if (status !== 201) {
    console.error(`생성 실패 ${status}: ${JSON.stringify(json).slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`릴리스 ${tag} 생성 — ${json.html_url}`);
} else {
  console.error(`조회 실패 ${found.status}`);
  process.exit(1);
}
