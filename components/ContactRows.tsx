import { contactRows } from "@/lib/contact-info";

/**
 * 연락 수단 목록. 소개와 연락처가 같은 것을 쓴다.
 * 값은 DB 에 있고 관리 화면의 소개에서 고친다.
 */
export default function ContactRows({
  me,
  className = "",
}: {
  me?: {
    email: string | null;
    workEmail: string | null;
    phone: string | null;
    homepageUrl?: string | null;
    githubUrl?: string | null;
  };
  className?: string;
}) {
  const rows = contactRows(me);
  if (rows.length === 0) return null;

  return (
    <dl className={className}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-sm text-muted">{row.label}</dt>
          <dd className="mt-1">
            {row.href ? (
              <a
                href={row.href}
                // 바깥으로 나가는 것만 새 창이다. 메일·전화는 아니다.
                target={row.external ? "_blank" : undefined}
                rel={row.external ? "noreferrer" : undefined}
                className="underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
              >
                {row.value}
              </a>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
