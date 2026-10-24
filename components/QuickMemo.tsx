import QuickMemoButton from "@/components/admin/QuickMemoButton";
import { isAdmin } from "@/lib/security/auth";
import { hasSecretKey } from "@/lib/security/secret-crypto";

/**
 * 빠른 메모 단추(MYH-223). 로그인한 관리자에게만, 메모를 암호화할 열쇠가
 * 있을 때만 그린다. 방문자에게는 있다는 것조차 보내지 않는다.
 *
 * 단추는 오른쪽 아래에 떠 있어 그 자리의 것(목록 마지막 줄의 「삭제」 같은)을
 * 가린다. 화면 맨 아래에 단추만큼 빈자리를 둬서, 끝까지 내리면 가려졌던 것이
 * 단추 위로 올라오게 한다(MYH-243). AI 는 팝업이 아니라 「🤖 AI」 로 AI 화면을
 * 연다(MYH-275).
 */
export default async function QuickMemo() {
  if (!hasSecretKey() || !(await isAdmin())) return null;
  return (
    <>
      <div aria-hidden className="h-20 shrink-0 print:hidden" />
      <QuickMemoButton />
    </>
  );
}
