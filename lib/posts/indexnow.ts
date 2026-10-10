/**
 * IndexNow — 로그인 없이 "이 주소가 새로 생겼다"고 검색엔진에 알린다.
 *
 * Bing, Naver, Yandex, Seznam 이 같은 창구를 쓴다. 구글은 참여하지 않는다.
 * 한국 사이트라면 네이버가 구글만큼 중요하다.
 *
 * 열쇠는 비밀이 아니다. 이 주소를 정말 내가 가지고 있는지 확인하는 용도라,
 * 사이트 뿌리에 `<열쇠>.txt` 로 올려 두고 그 안에 같은 값을 적어 둔다.
 * 그래서 저장소에 들어 있어도 문제가 없다.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export type SubmitResult = {
  status: number;
  /** 200·202 면 받아들여진 것이다 */
  accepted: boolean;
  body: string;
};

export async function submitToIndexNow({
  host,
  key,
  urls,
  endpoint = INDEXNOW_ENDPOINT,
  fetchImpl = fetch,
}: {
  host: string;
  key: string;
  urls: string[];
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<SubmitResult> {
  if (urls.length === 0) {
    return { status: 0, accepted: false, body: "보낼 주소가 없다" };
  }
  // 한 번에 만 개까지 받는다. 우리는 그럴 일이 없지만 잘라 두는 게 안전하다
  const body = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: urls.slice(0, 10000),
  };

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  return {
    status: res.status,
    accepted: res.status === 200 || res.status === 202,
    body: (await res.text()).slice(0, 200),
  };
}
