/**
 * 구조화 데이터를 스크립트 태그로 넣는다.
 * 값은 우리가 만든 객체라 외부 입력이 그대로 들어가지 않지만,
 * 혹시 모를 </script> 를 대비해 이스케이프한다.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
