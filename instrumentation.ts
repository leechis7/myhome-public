/**
 * 앱이 뜰 때 한 번 돈다.
 *
 * 관리자 비밀번호를 아직 정하지 않았으면(빈 DB 로 처음 띄움) 설치 코드를
 * 로그에 찍는다(MYH-172). 그 코드를 넣어야 /admin 에서 비밀번호를 정할 수
 * 있다. DB 가 아직 안 떠 있어도 앱은 떠야 하므로 실패는 삼킨다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const secret = process.env.SESSION_SECRET;
  if (!secret || process.env.ADMIN_PASSWORD) return;
  try {
    const { needsSetup } = await import("@/lib/auth");
    if (!(await needsSetup())) return;
    const { setupCode } = await import("@/lib/setup-code");
    console.log(
      `[myhome] 관리자 비밀번호를 아직 정하지 않았습니다. /admin 에서 정하세요. 처음 설정 코드: ${setupCode(secret)}`,
    );
  } catch (err) {
    console.warn("[myhome] 처음 설정 확인을 건너뜁니다:", err);
  }
}
