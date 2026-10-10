import { readFileSync } from "node:fs";

/**
 * 지금 도는 앱 버전. 푸터와 지표가 같이 쓴다.
 *
 * 운영은 빌드 시점에 next.config.ts 가 package.json 에서 넣어 준 값을 쓴다.
 * 개발 서버는 그 값을 뜰 때 한 번 박아 두므로, 버전을 올린 뒤 다시 띄우지
 * 않으면 옛 값이 계속 보인다 — 실제로 v0.2.0 이 며칠 동안 남아 있었다.
 * 그래서 개발에서는 그때그때 파일을 읽는다.
 *
 * `npm_package_version` 은 쓰지 않는다. npm 스크립트로 띄울 때만 있는 값이라
 * 컨테이너(`node server.js`)에서는 비어 있고, 개발 서버에서는 띄운 시점의
 * 옛 값이 남는다.
 */
export function appVersion() {
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXT_PUBLIC_APP_VERSION;
  }
  try {
    const { version } = JSON.parse(readFileSync("package.json", "utf8"));
    return typeof version === "string" ? version : undefined;
  } catch {
    // 실행 위치가 저장소 밖이면 못 읽는다. 그때는 박아 둔 값으로 돌아간다.
    return process.env.NEXT_PUBLIC_APP_VERSION;
  }
}
