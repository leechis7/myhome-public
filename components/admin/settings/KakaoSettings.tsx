import DeleteButton from "@/components/admin/DeleteButton";
import { clearKakaoKeyAction, saveKakaoKeyAction } from "@/app/admin/books/actions";
import { kakaoKeySource } from "@/lib/books/lookup-key";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

const notices: Record<string, string> = {
  saved: "카카오 키를 저장했습니다.",
  cleared: "카카오 키를 지웠습니다.",
  invalid: "키는 영문 · 숫자 32자 안팎입니다. 「REST API 키」 를 그대로 붙여 넣어 주세요.",
};

/**
 * 책 찾기(MYH-226)의 카카오 키(MYH-231). 휴대폰에서도 넣으려고 화면에 둔다.
 * .env 의 KAKAO_REST_API_KEY 가 있으면 그것이 먼저라 여기서는 고치지 않는다.
 */
export default async function KakaoSettings({ notice }: { notice?: string }) {
  const source = await kakaoKeySource();
  const message = notice ? notices[notice] : undefined;
  return (
    <div>
      <h4 className="text-sm font-medium">책 찾기 (관리 › 책)</h4>
      {message ? (
        <p role="status" className="mt-3 text-sm text-foreground/80">
          {message}
        </p>
      ) : null}
      <p className="mt-3 text-sm text-muted">
        {source === "env"
          ? "● .env 의 KAKAO_REST_API_KEY 를 씁니다. 바꾸려면 .env 에서 고칩니다."
          : source === "db"
            ? "● 설정됨 · 키는 암호화해서 저장했고 다시 보여 주지 않습니다."
            : "○ 설정 안 됨 · 지금은 Open Library 로 찾습니다(한국 책이 적습니다)."}
      </p>
      {source !== "env" ? (
        <details className="mt-4" open={source === null}>
          <summary className="cursor-pointer text-sm">
            {source ? "키 바꾸기" : "키 넣기"}
          </summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted">
            <li>
              <a
                href="https://developers.kakao.com/console/app"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                카카오 디벨로퍼스
              </a>{" "}
              → 내 애플리케이션 → 애플리케이션 추가하기
            </li>
            <li>만든 앱 → 앱 설정 › 앱 키 → 「REST API 키」 복사</li>
            <li>아래에 붙여 넣기</li>
          </ol>
          <form action={saveKakaoKeyAction} aria-label="카카오 키" className="mt-3 flex gap-2">
            <input
              name="key"
              type="password"
              required
              autoComplete="off"
              aria-label="REST API 키"
              placeholder="REST API 키"
              className={`${field} font-mono`}
            />
            <button type="submit" className={`${primary} shrink-0`}>
              카카오 키 저장
            </button>
          </form>
        </details>
      ) : null}
      {source === "db" ? (
        <form action={clearKakaoKeyAction} className="mt-4">
          <DeleteButton
            aria-label="카카오 키 지우기"
            className={`${button} text-red-600 dark:text-red-400`}
            confirmMessage="카카오 키를 지울까요? 책 찾기가 Open Library 로 돌아갑니다."
          >
            키 지우기
          </DeleteButton>
        </form>
      ) : null}
    </div>
  );
}
