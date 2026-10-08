/**
 * 사설 대역에서 온 요청인가. /metrics 를 지키는 데 쓴다.
 *
 * 문은 Caddy 가 지킨다 — 공개 도메인의 /metrics 는 404 로 막고, 지표 전용
 * 포트(59201)는 사설 대역에서만 답한다. 이 판별은 그 뒤에 한 겹 더 두는
 * 것이다. Caddy 설정이 어긋나도 남의 브라우저에는 답하지 않게 한다.
 */
const PRIVATE_PATTERNS = [
  /^127\./, // 로컬
  /^10\./, // 사설 A
  /^192\.168\./, // 사설 C
  /^172\.(1[6-9]|2\d|3[01])\./, // 사설 B (도커 기본 대역이 여기 있다)
  /^::1$/, // 로컬 (IPv6)
  /^f[cd]/i, // 사설 (IPv6 ULA)
];

/** 포트와 대괄호를 벗긴 주소 하나를 본다 */
export function isPrivateAddress(value: string | null | undefined) {
  if (!value) return false;

  // 포트가 붙어 오는 경우를 벗긴다. IPv6 는 대괄호로 감싸 오고("[::1]:80"),
  // IPv4 는 그냥 붙는다("1.2.3.4:80"). 콜론을 무조건 자르면 "::1" 이
  // ":" 로 뭉개진다 — 그래서 대괄호부터 본다.
  const trimmed = value.trim();
  const bracketed = trimmed.match(/^\[(.+)\](?::\d+)?$/);
  let bare = bracketed ? bracketed[1] : trimmed;
  if (!bracketed && bare.split(":").length === 2) {
    bare = bare.split(":")[0];
  }

  // IPv4 를 IPv6 로 감싼 표기("::ffff:127.0.0.1")를 벗긴다. Node 가 이 모양
  // 으로 넘겨 주는 일이 있다 — 개발 서버에 곧바로 붙으면 이렇게 온다.
  const mapped = bare.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) bare = mapped[1];

  if (!bare) return false;
  return PRIVATE_PATTERNS.some((pattern) => pattern.test(bare));
}

/**
 * 앞단을 거쳐 온 요청이 우리 쪽에서 온 것인가.
 *
 * **X-Forwarded-For 의 마지막 값을 본다.** Caddy 의 reverse_proxy 는 들어온
 * 헤더 뒤에 실제 상대 주소를 덧붙인다. 그래서 마지막이 Caddy 가 직접 본
 * 주소이고, 앞의 값들은 요청자가 적어 보낸 것 — 믿을 수 없다. 첫 값을 보면
 * "X-Forwarded-For: 127.0.0.1" 을 적어 보내는 것만으로 통과한다.
 *
 * 헤더가 아예 없으면 앞단을 거치지 않고 곧바로 온 것이다. 앱 포트는
 * 127.0.0.1 에만 묶여 있어(운영 40000, 개발 40002) 그런 요청은 이 서버
 * 안에서 온 것뿐이다. 그래서 허용한다.
 */
export function isFromOurSide(forwardedFor: string | null | undefined) {
  if (!forwardedFor || forwardedFor.trim() === "") return true;

  const hops = forwardedFor.split(",");
  return isPrivateAddress(hops[hops.length - 1]);
}
