import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import Container from "@/components/Container";
import MessageList from "@/components/admin/MessageList";
import { isAdmin } from "@/lib/security/auth";
import { getDb, messages } from "@/lib/db";

export const metadata: Metadata = {
  title: "받은 메시지",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  if (!(await isAdmin())) redirect("/admin");

  const rows = await getDb()
    .select()
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .limit(100);

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">받은 메시지</h1>

      <div className="mt-8">
        <MessageList rows={rows} />
      </div>
    </Container>
  );
}
