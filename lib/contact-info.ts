/**
 * 소개·연락처가 보여줄 연락 수단.
 *
 * 값은 DB(profile 테이블)에 있다. 관리 화면의 소개에서 고친다 — 번호가 바뀔 때
 * 배포하지 않아도 되게 하려는 것이다. 비워 두면 그 줄은 나오지 않는다.
 */
export type ContactRow = {
  label: string;
  value: string;
  href?: string;
  /** 바깥으로 나가는 링크인가. 새 창으로 연다 */
  external?: boolean;
};

/**
 * 번호에 숫자가 열 자리는 있어야 tel: 로 걸어 준다.
 * "010-" 처럼 아직 다 적지 않은 값에 링크를 걸면 눌러도 아무 일도 안 난다.
 */
export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? `tel:${digits}` : undefined;
}

/**
 * 주소를 읽기 좋게. `https://github.com/example` 를 `github.com/example` 로.
 *
 * 화면에 보여 줄 글자만 다듬는다. 눌러서 가는 주소는 손대지 않는다.
 */
export function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * 주소를 눌러서 갈 수 있게.
 *
 * `github.com/example` 처럼 앞을 빼고 적어 두면 브라우저가 상대 주소로
 * 읽어 우리 사이트 안을 뒤진다. 없으면 붙여 준다.
 */
function linkHref(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

export function contactRows(me?: {
  email: string | null;
  workEmail: string | null;
  phone: string | null;
  homepageUrl?: string | null;
  githubUrl?: string | null;
}): ContactRow[] {
  const rows: ContactRow[] = [];
  const email = me?.email?.trim();
  const workEmail = me?.workEmail?.trim();
  const phone = me?.phone?.trim();
  const homepage = me?.homepageUrl?.trim();
  const github = me?.githubUrl?.trim();

  if (email) rows.push({ label: "개인 메일", value: email, href: `mailto:${email}` });
  if (workEmail)
    rows.push({ label: "회사 메일", value: workEmail, href: `mailto:${workEmail}` });
  if (phone) rows.push({ label: "휴대폰", value: phone, href: telHref(phone) });

  // 주소 둘은 바깥으로 나간다. 메일·전화 뒤에 온다 — 연락 수단이 먼저다.
  //
  // GitHub 는 컬럼도 관리 화면 칸도 진작 있었는데 여기서 내놓지 않아
  // **어디에도 안 나오고 있었다**(MYH-164). 적어 넣을 수는 있는데 보이지
  // 않는 값이었다.
  if (homepage)
    rows.push({
      label: "홈페이지",
      value: prettyUrl(homepage),
      href: linkHref(homepage),
      external: true,
    });
  if (github)
    rows.push({
      label: "GitHub",
      value: prettyUrl(github),
      href: linkHref(github),
      external: true,
    });

  return rows;
}
