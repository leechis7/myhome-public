/**
 * 업로드 제한. 클라이언트 컴포넌트에서도 쓰기 때문에 별도 파일로 둔다.
 * lib/uploads.ts 는 DB에 접근하므로 클라이언트에서 불러오면
 * postgres 드라이버까지 브라우저 번들로 끌려 들어간다.
 */
/**
 * 사실상 걸지 않는다. 올리는 사람은 관리자 하나뿐이고, 받아서 1600px webp
 * 로 줄이므로(lib/uploads.ts) 디스크에 남는 것은 몇백 KB 다.
 *
 * **그래도 숫자를 하나 둔다.** 진짜 무제한은 만들 수 없다 — Cloudflare 가
 * 100MB 에서 자른다. 그보다 크게 잡아 두면 Cloudflare 가 먼저 막고, 그때는
 * 우리 안내 문구 대신 영문 모를 413 이 뜬다. 90MB 는 그 벽에 닿지 않으면서
 * 쓰기에는 없는 것과 같은 자리다.
 *
 * **next.config.ts 의 serverActions.bodySizeLimit 보다 작아야 한다.** 올리기는
 * 서버 액션으로 가는데, 본문이 그 한도를 넘으면 액션에 닿기도 전에 Next 가
 * 끊는다. 그러면 여기 숫자로 만든 안내 문구가 나올 자리가 없다.
 */
export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;

export const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

/**
 * 첨부파일. 그림과 같은 자리에 둔다 — 붙이는 사람도 관리자 하나뿐이다.
 * 디스크에 두므로 DB 덤프가 부풀지 않는다.
 *
 * 이쪽도 서버 액션으로 간다. bodySizeLimit 은 이 값보다 커야 한다.
 */
export const MAX_ATTACHMENT_BYTES = 90 * 1024 * 1024;

/*
 * 첨부파일 형식은 가리지 않는다.
 *
 * 전에는 허용 목록(`ALLOWED_ATTACHMENT_TYPES`)이 있었다. 두 가지 이유로 뺀다.
 *
 * **하나. 목록이 쓸 수 있는 형식을 깎고 있었다.** 검사를 브라우저가 알려 준
 * MIME 이름으로 했는데, 그 이름은 OS 가 준다. 윈도우 크롬은 zip 을
 * `application/x-zip-compressed`, gz 를 `application/x-gzip` 으로 보내고 tar
 * 는 아예 빈 값으로 보낸다. 목록은 표준 이름만 들고 있어서, 윈도우에서
 * 올리는 압축 파일이 하나도 안 붙었다(2026-09-20, MYH-161). 변종 이름을
 * 세기 시작하면 브라우저·OS 가 늘 때마다 쫓아다녀야 한다.
 *
 * **둘. 목록의 근거가 이미 성립하지 않았다.** "html 하나로 이 사이트 주소에
 * 남의 화면을 띄울 수 있다" 가 이유였는데, 지금은 `app/attachments/[id]/route.ts`
 * 가 그림이 아닌 것을 전부 `content-disposition: attachment` 와 `nosniff` 로
 * 내려준다. html 을 붙여도 열리지 않고 내려받는다. 반대로 목록에 **들어
 * 있던** svg 는 inline 으로 나가서 실제로 그 일을 할 수 있었다(아래 참고).
 *
 * 즉 안전은 목록이 아니라 **내려주는 쪽**에서 나온다. 비밀글 첨부
 * (`attachSecretFile`)도 같은 이유로 처음부터 형식을 안 가렸다 — 두 길을 맞춘다.
 *
 * 나중에 가려야 할 일이 생기면 허용 목록이 아니라 **실행 파일 거부 목록**으로
 * 둔다. 열어 두고 몇 개를 빼는 편이, 닫아 두고 쓸 것을 하나씩 세는 것보다
 * 이 크기의 사이트에는 맞는다.
 */

/**
 * 화면에 바로 보여 줄 것인가. 나머지는 내려받게 한다.
 *
 * **svg 는 그림이지만 뺀다.** 안에 `<script>` 를 넣을 수 있고, inline 으로
 * 내보내면 주소를 직접 열었을 때 우리 도메인에서 그 스크립트가 돈다 —
 * Caddy 가 주는 CSP 가 `script-src 'self' 'unsafe-inline'` 이라 막히지도
 * 않는다. 첨부로 내려주면 브라우저가 열지 않는다.
 */
export function isImageType(mimeType: string) {
  return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
}

/**
 * 담아 둘 형식 이름.
 *
 * 브라우저가 안 알려 줄 때가 있다 — 윈도우에서 `.tar` 를 고르면 빈 값이
 * 온다. 그대로 담으면 내려줄 때 `content-type:` 이 빈 채로 나간다.
 */
export function attachmentMimeType(type: string) {
  return type.trim() || "application/octet-stream";
}

/**
 * 너무 큰가. 크면 화면에 그대로 보여 줄 말을, 괜찮으면 null 을 준다.
 *
 * **보내기 전에 브라우저에서 불러야 한다.** 서버 액션 안에도 같은 검사가
 * 있지만 너무 큰 본문은 그 검사에 닿지 못한다 — Next 가 본문 크기 제한에서
 * 먼저 끊고 "Body exceeded Nmb limit" 으로 터진다(2026-09-19).
 */
export function oversizeMessage(size: number, max: number) {
  if (size <= max) return null;
  return `파일이 너무 큽니다 (${formatBytes(size)}). ${formatBytes(max)}까지 됩니다.`;
}

/** 사람이 읽는 크기. 목록과 올리는 칸이 같이 쓴다 */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
