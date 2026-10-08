import QuickMemoButton from "@/components/admin/QuickMemoButton";
import { isAdmin } from "@/lib/auth";
import { hasSecretKey } from "@/lib/secret-crypto";

/**
 * 빠른 메모 단추(MYH-223). 로그인한 관리자에게만, 메모를 암호화할 열쇠가
 * 있을 때만 그린다. 방문자에게는 있다는 것조차 보내지 않는다.
 */
export default async function QuickMemo() {
  if (!hasSecretKey() || !(await isAdmin())) return null;
  return <QuickMemoButton />;
}
