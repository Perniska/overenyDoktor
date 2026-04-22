import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  EyeOff,
  MessageSquare,
  UserCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { AdminForumCommentActions } from "@/components/admin/AdminForumActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminForumCommentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Neuvedené";
  return new Date(value).toLocaleString("sk-SK");
}

export default async function AdminForumCommentDetailPage({
  params,
}: AdminForumCommentDetailPageProps) {
  const auth = await requireModeratorOrAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/");
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("forum_comments")
    .select(
      `
      id,
      id_user,
      id_topic,
      id_parent,
      content,
      is_edited,
      created_at,
      updated_at,
      edited_at,
      deleted_at,
      author:profiles!forum_comments_id_user_fkey (
        id,
        username,
        deleted_at,
        anonymized_at
      ),
      topic:forum_topics!forum_comments_id_topic_fkey (
        id,
        title,
        deleted_at,
        is_locked
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const comment = data as any;
  const author = getSingleRelation(comment.author);
  const topic = getSingleRelation(comment.topic);
  const isHidden = Boolean(comment.deleted_at);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/admin/forum?tab=comments"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
      >
        <ArrowLeft className="size-4" />
        Späť na komentáre
      </Link>

      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Správa komentára vo fóre
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Komentár vo fóre
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Na tejto stránke moderuješ jeden konkrétny komentár. Komentár môžeš
          skryť alebo obnoviť podľa pravidiel platformy.
        </p>
      </section>

      <Card className={isHidden ? "border-red-200 bg-red-50/30" : ""}>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MessageSquare className="size-6" />
                Komentár
              </CardTitle>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <UserCircle className="size-4" />
                  {author?.username ?? "Anonymný používateľ"}
                </span>

                {comment.is_edited ? <span>Upravený</span> : null}
              </div>
            </div>

            <span
              className={
                isHidden
                  ? "inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                  : "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
              }
            >
              {isHidden ? (
                <>
                  <EyeOff className="size-4" />
                  Skrytý
                </>
              ) : (
                "Viditeľný"
              )}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm font-medium text-slate-500">
              Téma komentára
            </p>

            {topic?.id ? (
              <Link
                href={`/forum/${topic.id}`}
                className="mt-1 inline-block font-semibold text-sky-700 hover:underline"
              >
                {topic.title}
              </Link>
            ) : (
              <p className="mt-1 font-semibold text-slate-900">
                Téma sa nepodarila načítať
              </p>
            )}

            {topic?.deleted_at ? (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Téma, ku ktorej komentár patrí, je skrytá.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Vytvorený</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <CalendarDays className="size-4" />
                {formatDateTime(comment.created_at)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Upravený</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(comment.edited_at ?? comment.updated_at)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">ID rodiča</p>
              <p className="mt-1 break-all font-mono text-xs">
                {comment.id_parent ?? "Bez rodičovského komentára"}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Text komentára</p>
            <p className="mt-2 whitespace-pre-wrap">{comment.content}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {topic?.id ? (
              <Link
                href={`/forum/${topic.id}`}
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Otvoriť verejnú tému
              </Link>
            ) : null}

            {topic?.id ? (
              <Link
                href={`/admin/forum/topics/${topic.id}`}
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Spravovať tému
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AdminForumCommentActions
        commentId={comment.id}
        isHidden={isHidden}
      />
    </main>
  );
}