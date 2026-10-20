"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Container from "@/components/Container";

const TABS = [
  { href: "/admin/ai", label: "💬 대화", exact: true },
  { href: "/admin/ai/meetings", label: "🎙 회의" },
  { href: "/admin/ai/voice", label: "🔊 음성" },
  { href: "/admin/settings#ai", label: "⚙ 설정" },
];

/** AI 화면(MYH-274)의 탭: 대화 · 회의 · 음성 · 설정 */
export default function AiTabs() {
  const path = usePathname();
  return (
    <Container>
      <nav
        aria-label="AI"
        className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2 text-sm"
      >
        {TABS.map((t) => {
          const on = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                on
                  ? "bg-foreground/[0.08] font-medium"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </Container>
  );
}
