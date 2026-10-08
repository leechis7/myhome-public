/**
 * CHANGELOG.md 에서 한 버전의 내용만 꺼낸다.
 *
 *   node scripts/changelog-section.mjs v0.8.0
 *
 * GitHub 릴리스 본문으로 그대로 쓴다. 변경 이력을 두 번 쓰지 않으려고
 * 하나를 두고 꺼내 쓰는 방식으로 했다.
 */
import { readFileSync } from "node:fs";

export function changelogSection(markdown, version) {
  const tag = version.replace(/^v/, "");
  const lines = markdown.split("\n");
  const start = lines.findIndex(
    (l) => l.startsWith(`## v${tag} `) || l.trim() === `## v${tag}`,
  );
  if (start === -1) return null;

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  const body = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
  return body || null;
}

if (import.meta.filename === process.argv[1]) {
  const version = process.argv[2];
  if (!version) {
    console.error(
      "버전을 주세요. 예: node scripts/changelog-section.mjs v0.8.0",
    );
    process.exit(1);
  }
  const md = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  const body = changelogSection(md, version);
  if (!body) {
    console.error(`CHANGELOG.md 에 ${version} 항목이 없습니다.`);
    process.exit(1);
  }
  process.stdout.write(body + "\n");
}
