"use client";

import { useEffect } from "react";

/**
 * 폰트 CSS 를 화면에 붙인다.
 *
 * head 의 link 는 media="print" 로 나간다. 그래야 첫 그림을 붙잡지 않는다.
 * 다 받은 뒤 여기서 media 를 all 로 바꾼다.
 *
 * 인라인 스크립트로 하지 않는 이유: 하이드레이션 전에 속성을 바꾸면 서버가
 * 보낸 print 와 어긋나 React 가 불일치를 알린다. 붙는 시점이 조금 늦어지는
 * 대신 조용하다.
 */
export default function FontSwap() {
  useEffect(() => {
    const link = document.getElementById("font-css");
    if (!(link instanceof HTMLLinkElement)) return;
    const apply = () => {
      link.media = "all";
    };
    if (link.sheet) apply();
    else link.addEventListener("load", apply, { once: true });
  }, []);

  return null;
}
