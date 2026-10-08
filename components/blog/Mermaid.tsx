"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "@/components/useTheme";

/**
 * 본문의 ```mermaid 블록을 그림으로 그린다.
 *
 * **필요할 때만 받는다.** mermaid 는 무겁다(번들 수 MB). 정적으로 부르면
 * 도식이 없는 글에서도 따라온다. 동적 `import()` 로 두어 이 컴포넌트가
 * 화면에 놓일 때 — 즉 그 글에 mermaid 블록이 있을 때만 받게 한다.
 *
 * **그리기 전에는 코드블록 그대로 둔다.** 빈 자리를 잡아 두면 높이를 모르니
 * 어차피 한 번 밀리고, 그동안 화면에 아무것도 없다. 원본이 보이는 편이 낫다 —
 * 도식의 내용은 그 글자에 다 있다. 문법이 틀렸을 때 되돌아가는 자리도 같다.
 *
 * **다크 모드.** mermaid 는 제 테마를 들고 있어서 CSS 변수를 따라오지 않는다.
 * 테마가 바뀌면 다시 그린다(`useTheme`). 서버에서는 테마를 알 수 없어 첫
 * 렌더에서 `null` 이 오는데, 그때는 그리지 않고 기다린다 — 밝은 그림을
 * 그렸다가 어두운 것으로 바꾸면 한 번 번쩍인다.
 *
 * **`dangerouslySetInnerHTML` 을 쓴다.** `Markdown.tsx` 가 지키는 "HTML 을
 * 직접 넣지 않는다" 를 여기서만 깬다. mermaid 가 주는 것이 SVG 문자열이라
 * 달리 넣을 길이 없다. 대신 `securityLevel: "strict"` 로 두어 mermaid 가
 * 라벨을 DOMPurify 로 씻게 하고, 본문을 쓰는 사람도 관리자뿐이다.
 */
export default function Mermaid({
  chart,
  fallback,
}: {
  /** 블록 안의 도식 원본 */
  chart: string;
  /** 그리기 전과 실패했을 때 보여 줄 것. 원래 코드블록이다 */
  fallback: React.ReactNode;
}) {
  const theme = useTheme();
  const [svg, setSvg] = useState<string | null>(null);

  // mermaid 가 그리는 동안 쓰는 이름. 이 값으로 CSS 선택자를 만들기 때문에
  // useId 가 주는 «r1» 같은 글자를 그대로 넘기면 안 된다.
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    // 테마를 알기 전에는 그리지 않는다
    if (theme === null) return;

    let 살아있다 = true;
    void (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: 색(theme),
          // 본문과 같은 글꼴로. 두지 않으면 도식만 혼자 다른 글꼴이다.
          fontFamily: "var(--font-sans), sans-serif",
        });
        const { svg } = await mermaid.render(id, chart);
        if (살아있다) setSvg(svg);
      } catch {
        // 문법이 틀리면 mermaid 는 제 나름의 붉은 오류 그림을 뱉는다.
        // 그것이 글에 실리면 글이 깨진 것처럼 보인다. 코드블록으로 돌아간다.
        if (살아있다) setSvg(null);
        // 실패한 자리에 mermaid 가 만들다 만 요소가 남는다. 치운다.
        document.getElementById(`d${id}`)?.remove();
      }
    })();

    return () => {
      살아있다 = false;
    };
  }, [chart, theme, id]);

  if (svg === null) return <>{fallback}</>;

  return (
    <div
      // 넓은 도식은 옆으로 밀어 본다. 줄이면 글씨를 못 읽는다.
      className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      role="img"
      // 도식 원본을 그대로 읽어 주는 것은 도움이 안 된다. 화면 낭독기에는
      // 이것이 그림이라는 것만 알리고, 내용은 본문 글자가 설명하게 둔다.
      aria-label="도식"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * 도식 색. 사이트와 같은 무채색으로 맞춘다.
 *
 * mermaid 가 들고 있는 테마를 그냥 쓰면 밝은 쪽은 보라, 어두운 쪽은 화살표
 * 글자 뒤가 카키색이다. 이 사이트에는 없는 색이라 도식만 혼자 튄다.
 * `theme: "base"` 로 두고 값을 직접 준다.
 *
 * **CSS 변수를 넘길 수 없다.** mermaid 는 받은 색을 밝히고 어둡게 해서
 * 나머지 색을 만든다. `var(--foreground)` 를 주면 계산할 수가 없다. 그래서
 * `app/globals.css` 의 값을 그대로 옮겨 적는다 — 한쪽을 고치면 다른 쪽도
 * 고쳐야 한다.
 */
function 색(theme: "light" | "dark") {
  const 어둡다 = theme === "dark";
  const 바탕 = 어둡다 ? "#0a0a0a" : "#ffffff";
  const 글자 = 어둡다 ? "#ededed" : "#171717";
  return {
    background: 바탕,
    // 상자 안쪽. 바탕과 살짝만 다르게 둔다
    primaryColor: 어둡다 ? "#1c1c1c" : "#f5f5f5",
    primaryTextColor: 글자,
    primaryBorderColor: 어둡다 ? "#3d3d3d" : "#d4d4d4",
    secondaryColor: 어둡다 ? "#161616" : "#fafafa",
    tertiaryColor: 바탕,
    // 화살표. --faint 와 같은 값이다
    lineColor: 어둡다 ? "#949494" : "#767676",
    textColor: 글자,
    // 화살표 위 글자 뒤. 바탕과 같아야 선이 지워진 것처럼 보인다
    edgeLabelBackground: 바탕,
  };
}
