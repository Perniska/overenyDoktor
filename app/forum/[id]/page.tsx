import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Lock,
  MessageSquare,
  Pin,
  UserCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSingleRelation } from "@/lib/relations";
import { ForumCommentForm } from "@/components/forum/ForumCommentForm";
import { ForumCommentActions } from "@/components/forum/ForumCommentActions";
import { ReportContentButton } from "@/components/reports/ReportContentButton";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type ForumTopicDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createTopicHref(topicId: string, page: number) {
  if (page <= 1) {
    return `/forum/${topicId}`;
  }

  return `/forum/${topicId}?page=${page}`;
}

export default async function ForumTopicDetailPage({
  params,
  searchParams,
}: ForumTopicDetailPageProps) {
  const { id } = await params;
  const queryParams = await searchParams;

  const pageParam = Number(getSingleParam(queryParams.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: topicData, error: topicError } = await supabase
    .from("forum_topics")
    .select(
      `
      id,
      id_creator,
      title,
      description,
      created_at,
      updated_at,
      is_pinned,
      is_locked,
      id_category,
      category:forum_categories!forum_topics_id_category_fkey (
        id,
        name,
        slug
      ),
      creator:profiles!forum_topics_id_creator_fkey (
        id,
        username
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (topicError || !topicData) {
    notFound();
  }

  const topic = topicData as any;
  const category = getSingleRelation(topic.category);
  const creator = getSingleRelation(topic.creator);

  const { data: commentsData, error: commentsError, count } = await supabase
    .from("forum_comments")
    .select(
      `
      id,
      id_user,
      id_parent,
      content,
      created_at,
      updated_at,
      edited_at,
      is_edited,
      author:profiles!forum_comments_id_user_fkey (
        id,
        username
      )
    `,
      { count: "exact" }
    )
    .eq("id_topic", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .range(from, to);

  const comments = commentsData ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link
        href="/forum"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
      >
        <ArrowLeft className="size-4" />
        Späť na fórum
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
                {category?.name ?? "Fórum"}
              </p>

              <CardTitle className="mt-2 flex items-center gap-2 text-3xl">
                {topic.is_pinned ? (
                  <Pin className="size-6 text-sky-700" />
                ) : (
                  <MessageSquare className="size-6" />
                )}
                {topic.title}
              </CardTitle>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <UserCircle className="size-4" />
                  {creator?.username ?? "Anonymný používateľ"}
                </span>

                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-4" />
                  {new Date(topic.created_at).toLocaleDateString("sk-SK")}
                </span>

                {topic.is_locked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
                    <Lock className="size-4" />
                    Uzamknutá téma
                  </span>
                ) : null}
              </div>
            </div>

            <ReportContentButton
              targetId={topic.id}
              targetType="forum_topic"
              buttonLabel="Nahlásiť tému"
            />
          </div>
        </CardHeader>

        {topic.description ? (
          <CardContent>
            <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-slate-700">
              {topic.description}
            </div>
          </CardContent>
        ) : null}
      </Card>

      <section className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Pripomienka k súkromiu</p>
        <p className="mt-1">
          Komentáre vo fóre nesmú obsahovať citlivé zdravotné údaje, rodné
          čísla, adresy, kontaktné údaje ani iné informácie, ktoré by mohli
          identifikovať konkrétnu osobu.
        </p>
      </section>

      <ForumCommentForm topicId={topic.id} isLocked={topic.is_locked} />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Komentáre</h2>
          <p className="mt-1 text-sm text-slate-600">
            Zobrazuje sa {comments.length} z {totalCount} komentárov.
          </p>
        </div>

        {commentsError ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-red-700">
              Komentáre sa nepodarilo načítať: {commentsError.message}
            </CardContent>
          </Card>
        ) : comments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-600">
              Táto téma zatiaľ nemá komentáre.
            </CardContent>
          </Card>
        ) : (
          comments.map((comment: any) => {
            const author = getSingleRelation(comment.author);
            const canManage = Boolean(user?.id && user.id === comment.id_user);

            return (
              <Card key={comment.id}>
                <CardContent className="space-y-4 py-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <UserCircle className="size-4" />
                        {author?.username ?? "Anonymný používateľ"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(comment.created_at).toLocaleString("sk-SK")}
                        {comment.is_edited ? " · upravené" : ""}
                      </p>
                    </div>

                    <ReportContentButton
                      targetId={comment.id}
                      targetType="forum_comment"
                      buttonLabel="Nahlásiť komentár"
                    />
                  </div>

                  <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                    {comment.content}
                  </div>

                  <ForumCommentActions
                    commentId={comment.id}
                    initialContent={comment.content}
                    canManage={canManage}
                  />
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) => createTopicHref(topic.id, pageNumber)}
      />
    </main>
  );
}