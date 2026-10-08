import { permanentRedirect } from "next/navigation";

/**
 * 연락처 화면은 방명록으로 합쳤다(MYH-216). 같은 쪽의 「나에게만 보내기」 가
 * 예전 연락 폼이다. 걸려 있는 링크 · 검색 결과가 그대로 닿게 넘긴다(308).
 */
export default function ContactPage() {
  permanentRedirect("/guestbook");
}
