import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  EyeOff,
  Lock,
  MessageSquare,
  Pin,
  UserCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { AdminForumTopicActions } from "@/components/admin/AdminForumActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminForumTopicDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Neuvedené";
  return new Date(value).toLocaleString("sk-SK");
}

export default async function AdminForumTopicDetailPage({
  params,
}: AdminForumTopicDetailPageProps) {
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
    .from("forum_topics")
    .select(
      `
      id,
      id_creator,
      id_category,
      title,
      description,
      is_pinned,
      is_locked,
      deleted_at,
      created_at,
      updated_at,
      category:forum_categories!forum_topics_id_category_fkey (
        id,
        name,
        slug
      ),
      creator:profiles!forum_topics_id_creator_fkey (
        id,
        username,
        deleted_at,
        anonymized_at
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const topic = data as any;
  const category = getSingleRelation(topic.category);
  const creator = getSingleRelation(topic.creator);
  const isHidden = Boolean(topic.deleted_at);

  const { count: commentsCount } = await supabase
    .from("forum_comments")
    .select("id", { count: "exact", head: true })
    .eq("id_topic", topic.id);

  const { count: visibleCommentsCount } = await supabase
    .from("forum_comments")
    .select("id", { count: "exact", head: true })
    .eq("id_topic", topic.id)
    .is("deleted_at", null);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/admin/forum"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
      >
        <ArrowLeft className="size-4" />
        Späť na moderovanie fóra
      </Link>

      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Správa témy vo fóre
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {topic.title}
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Na tejto stránke moderuješ jednu konkrétnu tému. Tému môžeš skryť,
          obnoviť, uzamknúť alebo pripnúť podľa pravidiel platformy.
        </p>
      </section>

      <Card
        className={
          isHidden
            ? "border-red-200 bg-red-50/30"
            : topic.is_locked
              ? "border-amber-200 bg-amber-50/30"
              : ""
        }
      >
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {topic.is_pinned ? (
                  <Pin className="size-6 text-sky-700" />
                ) : (
                  <MessageSquare className="size-6" />
                )}
                {topic.title}
              </CardTitle>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>{category?.name ?? "Bez kategórie"}</span>

                <span className="inline-flex items-center gap-1">
                  <UserCircle className="size-4" />
                  {creator?.username ?? "Anonymný používateľ"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isHidden ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                  <EyeOff className="size-4" />
                  Skrytá
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                  Viditeľná
                </span>
              )}

              {topic.is_locked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                  <Lock className="size-4" />
                  Uzamknutá
                </span>
              ) : null}

              {topic.is_pinned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                  <Pin className="size-4" />
                  Pripnutá
                </span>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Vytvorená</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <CalendarDays className="size-4" />
                {formatDateTime(topic.created_at)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Naposledy upravená</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(topic.updated_at)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Komentáre</p>
              <p className="mt-1 font-semibold">
                {visibleCommentsCount ?? 0} viditeľných / {commentsCount ?? 0} celkom
              </p>
            </div>
          </div>

          {topic.description ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Popis témy</p>
              <p className="mt-2 whitespace-pre-wrap">{topic.description}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Téma nemá textový popis.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/forum/${topic.id}`}
              className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Otvoriť verejnú tému
            </Link>

            <Link
              href={`/admin/forum?tab=comments&q=${encodeURIComponent(
                topic.title
              )}`}
              className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hľadať komentáre
            </Link>
          </div>
        </CardContent>
      </Card>

      <AdminForumTopicActions
        topicId={topic.id}
        isHidden={isHidden}
        isLocked={topic.is_locked}
        isPinned={topic.is_pinned}
      />
    </main>
  );
}