/**
 * 문서 버전 규칙.
 *
 * lib/posts/index.ts 에 두면 안 된다. 그쪽은 DB 드라이버를 끌고 오는데, 이 값은
 * 글 폼("use client")에서도 써야 한다 — 그러면 브라우저 묶음에 postgres 가
 * 들어가 tls·perf_hooks 를 못 찾고 터진다. 실제로 한 번 터뜨렸다.
 */

/** 1.0.0 처럼 숫자 세 자리. HTML 의 pattern 속성에 그대로 넣는다 */
export const VERSION_PATTERN = "\\d+\\.\\d+\\.\\d+";

/**
 * 새 글이 시작하는 버전. 처음 낸 글은 1.0.0 이다.
 *
 * 화면의 칸에 미리 넣어 두는 값이다. DB 기본값으로 두지는 않았다 — 지우고
 * 저장하면 "버전 없는 글" 이어야 하고(개정 표시가 없어진다), 짧은 글은
 * 버전을 쓰지 않는다.
 */
export const FIRST_VERSION = "1.0.0";

/**
 * 버전 형식 검사.
 *
 * 자유롭게 적게 두면 "1.1", "v2", "2판" 이 섞여 나중에 어느 것이 더 나중
 * 판인지 알 수 없다. 요즘 흔한 형식으로 좁힌다.
 */
export function isVersion(value: string) {
  return /^\d+\.\d+\.\d+$/.test(value);
}

/**
 * 문서 버전이 바뀌었으면 개정한 것으로 본다.
 *
 * 저장 방식(단추)으로 정하지 않고 값으로 정한다 — 무엇을 눌렀는지는 나중에
 * 알 수 없지만, 버전은 글에 남아 있어서 왜 개정일이 그날인지 설명이 된다.
 * 빈 칸으로 만들면 개정을 없앤 것으로 본다.
 */
export function versionChange(before: string | null, after: string | null) {
  const a = before?.trim() || null;
  const b = after?.trim() || null;
  if (a === b) return "그대로" as const;
  return b ? ("개정" as const) : ("지움" as const);
}
