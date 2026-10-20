/**
 * 앱이 뜰 때 한 번 돈다. 미리 알림 타이머를 걸고(MYH-258),
 *
 * 관리자 비밀번호를 아직 정하지 않았으면(빈 DB 로 처음 띄움) 설치 코드를
 * 로그에 찍는다(MYH-172). 그 코드를 넣어야 /admin 에서 비밀번호를 정할 수
 * 있다. DB 가 아직 안 떠 있어도 앱은 떠야 하므로 실패는 삼킨다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // 할 일 · 일정 미리 알림(MYH-258). 5분마다 돈다
  const { startReminderTicker } = await import("@/lib/my-space/reminder-ticker");
  startReminderTicker();
  // 예전에 건 웹훅이 단추 누름도 받게(MYH-259). 텔레그램에 닿지 않아도 앱은 뜬다
  import("@/lib/telegram/bot")
    .then(({ ensureWebhookUpdates }) => ensureWebhookUpdates())
    .catch((err) => console.warn("[telegram] 웹훅 확인을 건너뜁니다:", err));
  const secret = process.env.SESSION_SECRET;
  if (!secret || process.env.ADMIN_PASSWORD) return;
  try {
    const { needsSetup } = await import("@/lib/security/auth");
    if (!(await needsSetup())) return;
    const { setupCode } = await import("@/lib/security/setup-code");
    console.log(
      `[myhome] 관리자 비밀번호를 아직 정하지 않았습니다. /admin 에서 정하세요. 처음 설정 코드: ${setupCode(secret)}`,
    );
  } catch (err) {
    console.warn("[myhome] 처음 설정 확인을 건너뜁니다:", err);
  }
}
