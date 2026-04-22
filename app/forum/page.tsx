import Link from "next/link";
import {
  CalendarDays,
  Filter,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  Pin,
  UserCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSingleRelation } from "@/lib/relations";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type ForumPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createForumHref(filters: {
  category?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();

  return query ? `/forum?${query}` : "/forum";
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const params = await searchParams;

  const category = getSingleParam(params.category) ?? "all";
  const q = getSingleParam(params.q)?.trim() ?? "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const selectedCategory = (categories ?? []).find(
    (item) => item.slug === category
  );

  let topicsQuery = supabase
    .from("forum_topics")
    .select(
      `
      id,
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
    `,
      { count: "exact" }
    )
    .is("deleted_at", null);

  if (selectedCategory) {
    topicsQuery = topicsQuery.eq("id_category", selectedCategory.id);
  }

  if (q) {
    const safeQ = q.replaceAll(",", " ");
    topicsQuery = topicsQuery.or(
      `title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`
    );
  }

  const { data, error, count } = await topicsQuery
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const topics = data ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const topicIds = topics.map((topic) => topic.id);

  const { data: commentsData } =
    topicIds.length > 0
      ? await supabase
          .from("forum_comments")
          .select("id_topic")
          .in("id_topic", topicIds)
          .is("deleted_at", null)
      : { data: [] };

  const commentCounts = new Map<string, number>();

  (commentsData ?? []).forEach((comment: any) => {
    commentCounts.set(
      comment.id_topic,
      (commentCounts.get(comment.id_topic) ?? 0) + 1
    );
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Komunitná časť
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Fórum
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Fórum slúži na všeobecnú diskusiu používateľov, otázky k systému a
            zdieľanie skúseností bez uvádzania citlivých osobných alebo
            zdravotných údajov.
          </p>
        </div>

        <Link
          href="/forum/create"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <MessageSquarePlus className="size-4" />
          Vytvoriť tému
        </Link>
      </section>

      <section className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Pravidlá fóra</p>
        <p className="mt-1">
          Diskusia má byť vecná a rešpektujúca. Nezverejňuj diagnózy, výsledky
          vyšetrení, kontaktné údaje, rodné čísla, adresy ani iné citlivé
          údaje. Nevhodný obsah bude možné nahlásiť a moderovať.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filtre</h2>
        </div>

        <form
          action="/forum"
          className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Kategória
            </label>

            <select
              name="category"
              defaultValue={category}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetky kategórie</option>
              {(categories ?? []).map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vyhľadávanie
            </label>

            <input
              name="q"
              defaultValue={q}
              placeholder="názov alebo text témy..."
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Filtrovať
            </button>

            <Link
              href="/forum"
              className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zrušiť
            </Link>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {(categories ?? []).slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={createForumHref({ category: item.slug, q })}
              className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
            >
              {item.name}
            </Link>
          ))}

          <Link
            href="/forum"
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Reset filtrov
          </Link>
        </div>
      </section>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Témy sa nepodarilo načítať: {error.message}
          </CardContent>
        </Card>
      ) : topics.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            Pre zadané filtre sa nenašli žiadne témy.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-slate-600">
            Zobrazuje sa {topics.length} z {totalCount} tém.
          </p>

          {topics.map((topic: any) => {
            const category = getSingleRelation(topic.category);
            const creator = getSingleRelation(topic.creator);
            const commentCount = commentCounts.get(topic.id) ?? 0;

            return (
              <Link key={topic.id} href={`/forum/${topic.id}`} className="block">
                <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader>
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          {topic.is_pinned ? (
                            <Pin className="size-5 text-sky-700" />
                          ) : (
                            <MessageSquare className="size-5" />
                          )}
                          {topic.title}
                        </CardTitle>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <UserCircle className="size-4" />
                            {creator?.username ?? "Anonymný používateľ"}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-4" />
                            {new Date(topic.created_at).toLocaleDateString(
                              "sk-SK"
                            )}
                          </span>

                          <span>{category?.name ?? "Bez kategórie"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {topic.is_locked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                            <Lock className="size-4" />
                            Uzamknutá
                          </span>
                        ) : null}

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                          {commentCount} komentárov
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  {topic.description ? (
                    <CardContent>
                      <p className="line-clamp-3 text-sm text-slate-600">
                        {topic.description}
                      </p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </section>
      )}

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) =>
          createForumHref({
            category,
            q,
            page: pageNumber,
          })
        }
      />
    </main>
  );
}