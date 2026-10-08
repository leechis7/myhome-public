import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Container from "@/components/Container";
import NoteEditor from "@/components/admin/NoteEditor";
import { listAttachments, listPostImages } from "@/lib/attachments";
import { isAdmin } from "@/lib/auth";
import { getDb, posts } from "@/lib/db";

export const metadata: Metadata = {
  title: "짧은 글 관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  required: "본문은 비울 수 없습니다.",
};

export default async function AdminNotesPage({
  searchParams,
}: PageProps<"/admin/notes">) {
  if (!(await isAdmin())) redirect("/admin");

  const params = await searchParams;
  const error = typeof params.e === "string" ? messages[params.e] : undefined;
  const saved = params.ok === "1";

  const rows = await getDb()
    .select()
    .from(posts)
    .where(eq(posts.kind, "note"))
    .orderBy(desc(posts.createdAt));

  // 글마다 따로 묻지 않고 한 번에 읽어 나눈다
  const attachmentsByNote: Record<number, Awaited<ReturnType<typeof listAttachments>>> =
    {};
  const imagesByNote: Record<number, Awaited<ReturnType<typeof listPostImages>>> =
    {};
  for (const note of rows) {
    attachmentsByNote[note.id] = await listAttachments(note.id);
    imagesByNote[note.id] = await listPostImages(note.id);
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">짧은 글 관리</h1>
      <p className="mt-3 text-sm text-muted">
        제목과 주소는 적지 않습니다. 본문 첫 줄이 제목이 되고 주소는 쓴 시각으로
        만듭니다. 태그와 댓글은 블로그와 같습니다.
      </p>

      {error ? (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-6 text-sm text-muted">저장했습니다.</p>
      ) : null}

      <NoteEditor
        rows={rows}
        attachments={attachmentsByNote}
        images={imagesByNote}
      />
    </Container>
  );
}
