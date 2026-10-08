import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import { isAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/posts";
import { hasSecretKey } from "@/lib/secret-crypto";
import { listSecrets, listSecretTags } from "@/lib/secrets";

export const metadata: Metadata = {
  title: "비밀글",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 나만 보는 글 목록.
 *
 * 로그인하지 않았으면 404 다. 다른 관리 화면처럼 로그인으로 보내지 않는다 —
 * 보내면 "여기에 무언가 있다" 를 알려 주는 셈이다. 없는 주소로 보인다.
 */
export default async function SecretsPage({
  searchParams,
}: PageProps<"/admin/secrets">) {
  if (!(await isAdmin())) notFound();

  if (!hasSecretKey()) return <NoKey />;

  const query = await searchParams;
  const tag = typeof query.tag === "string" ? query.tag : undefined;
  const [rows, tags] = await Promise.all([listSecrets(tag), listSecretTags()]);

  return (
    <Container>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">비밀글</h1>
        <Link
          href="/admin/secrets/new"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          새 글
        </Link>
      </div>

      <p className="mt-3 text-sm text-muted">
        제목·본문·태그와 붙인 파일까지 담겨서 저장됩니다. 열쇠는 서버에만
        있습니다.
      </p>

      {tags.length > 0 ? (
        <nav aria-label="태그" className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin/secrets"
            aria-current={tag ? undefined : "page"}
            className={tag ? idleChip : activeChip}
          >
            전체
          </Link>
          {tags.map((one) => (
            <Link
              key={one.name}
              href={`/admin/secrets?tag=${encodeURIComponent(one.name)}`}
              aria-current={tag === one.name ? "page" : undefined}
              className={tag === one.name ? activeChip : idleChip}
            >
              {one.name} {one.count}
            </Link>
          ))}
        </nav>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {tag ? `"${tag}" 태그를 단 글이 없습니다.` : "아직 쓴 글이 없습니다."}
        </p>
      ) : (
        <ul className="mt-10 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
            >
              <Link
                href={`/admin/secrets/${row.id}`}
                className="font-medium transition-opacity hover:opacity-70"
              >
                {row.title === null
                  ? "열 수 없음"
                  : // 이미지만 올려 두고 저장하지 않은 초안이다
                    row.title || "제목 없음"}
              </Link>
              {row.tags.map((one) => (
                <span
                  key={one}
                  className="rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60"
                >
                  {one}
                </span>
              ))}
              <time
                dateTime={row.writtenAt.toISOString()}
                className="ml-auto text-xs text-faint"
              >
                {formatDate(row.writtenAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

const chip = "rounded-full px-3 py-1 text-xs transition-colors";
const activeChip = `${chip} bg-foreground text-background`;
const idleChip = `${chip} border border-border text-foreground/70 hover:bg-foreground/5`;

/** 열쇠가 없으면 아무 것도 못 한다. 왜 그런지와 무엇을 하면 되는지 적는다 */
function NoKey() {
  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">비밀글</h1>
      <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        열쇠(SECRETS_KEY)가 없어 열 수 없습니다. 32바이트 값을{" "}
        <code>openssl rand -base64 32</code> 로 만들어 환경 파일에 넣고 다시
        올리세요. 이미 쓴 글이 있다면 <strong>그때 쓰던 열쇠라야</strong>{" "}
        읽힙니다.
      </p>
    </Container>
  );
}
