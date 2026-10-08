/**
 * PostgreSQL 오류를 알아본다.
 *
 * 드라이버 오류가 한 겹 더 싸여서 온다. Drizzle 이 "Failed query: …" 로 감싸고
 * 실제 코드는 cause 안에 있다. 그래서 cause 를 따라 내려가며 본다 —
 * 겉만 보면 23505 를 못 찾아 500 이 난다(짧은 글 만들 때 겪었다).
 */
function hasPgCode(err: unknown, code: string) {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: string }).code === code
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** 같은 값이 이미 있다(unique) */
export function isUniqueViolation(err: unknown) {
  return hasPgCode(err, "23505");
}

/** 다른 줄이 아직 가리키고 있어 지울 수 없다(외래 키 restrict) */
export function isForeignKeyViolation(err: unknown) {
  return hasPgCode(err, "23503");
}
