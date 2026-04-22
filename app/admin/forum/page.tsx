import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  EyeOff,
  Filter,
  Lock,
  MessageSquare,
  Pin,
  UserCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import {
  AdminForumCommentActions,
  AdminForumTopicActions,
} from "@/components/admin/AdminForumActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminForumPageProps = {
  searchParams: Promise<{
    tab?: string | string[];
    status?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createForumAdminHref(filters: {
  tab?: string;
  status?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.tab && filters.tab !== "topics") {
    params.set("tab", filters.tab);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();

  return query ? `/admin/forum?${query}` : "/admin/forum";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    all: "Všetko",
    visible: "Viditeľné",
    hidden: "Skryté",
    locked: "Uzamknuté",
    pinned: "Pripnuté",
  };

  return labels[status] ?? "Všetko";
}

export default async function AdminForumPage({
  searchParams,
}: AdminForumPageProps) {
  const auth = await requireModeratorOrAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/");
  }

  const params = await searchParams;

  const tab = getSingleParam(params.tab) ?? "topics";
  const status = getSingleParam(params.status) ?? "all";
  const q = getSingleParam(params.q)?.trim() ?? "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  let totalCount = 0;
  let totalPages = 1;
  let content: React.ReactNode = null;

  if (tab === "topics") {
    let query = supabase
      .from("forum_topics")
      .select(
        `
        id,
        id_creator,
        title,
        description,
        created_at,
        updated_at,
        deleted_at,
        is_pinned,
        is_locked,
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
      );

    if (status === "visible") {
      query = query.is("deleted_at", null);
    }

    if (status === "hidden") {
      query = query.not("deleted_at", "is", null);
    }

    if (status === "locked") {
      query = query.eq("is_locked", true);
    }

    if (status === "pinned") {
      query = query.eq("is_pinned", true);
    }

    if (q) {
      const safeQ = q.replaceAll(",", " ");
      query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
    }

    const { data, error, count } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const topics = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
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
        {topics.map((topic: any) => {
          const category = getSingleRelation(topic.category);
          const creator = getSingleRelation(topic.creator);
          const isHidden = Boolean(topic.deleted_at);

          return (
            <Card
              key={topic.id}
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

              <CardContent className="space-y-4">
                {topic.description ? (
                  <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                    {topic.description}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Téma nemá textový popis.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/forum/${topic.id}`}
                    className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Otvoriť tému
                  </Link>
                </div>

                <AdminForumTopicActions
                  topicId={topic.id}
                  isHidden={isHidden}
                  isLocked={topic.is_locked}
                  isPinned={topic.is_pinned}
                />
              </CardContent>
            </Card>
          );
        })}
      </section>
    );
  }

  if (tab === "comments") {
    let query = supabase
      .from("forum_comments")
      .select(
        `
        id,
        id_user,
        id_topic,
        content,
        created_at,
        updated_at,
        deleted_at,
        edited_at,
        is_edited,
        author:profiles!forum_comments_id_user_fkey (
          id,
          username
        ),
        topic:forum_topics!forum_comments_id_topic_fkey (
          id,
          title,
          deleted_at
        )
      `,
        { count: "exact" }
      );

    if (status === "visible") {
      query = query.is("deleted_at", null);
    }

    if (status === "hidden") {
      query = query.not("deleted_at", "is", null);
    }

    if (q) {
      query = query.ilike("content", `%${q}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    const comments = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4 text-red-700">
          Komentáre sa nepodarilo načítať: {error.message}
        </CardContent>
      </Card>
    ) : comments.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-slate-600">
          Pre zadané filtre sa nenašli žiadne komentáre.
        </CardContent>
      </Card>
    ) : (
      <section className="space-y-4">
        {comments.map((comment: any) => {
          const author = getSingleRelation(comment.author);
          const topic = getSingleRelation(comment.topic);
          const isHidden = Boolean(comment.deleted_at);

          return (
            <Card
              key={comment.id}
              className={isHidden ? "border-red-200 bg-red-50/30" : ""}
            >
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <MessageSquare className="size-5" />
                      Komentár vo fóre
                    </CardTitle>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <UserCircle className="size-4" />
                        {author?.username ?? "Anonymný používateľ"}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-4" />
                        {new Date(comment.created_at).toLocaleDateString(
                          "sk-SK"
                        )}
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

              <CardContent className="space-y-4">
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
                </div>

                <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  {comment.content}
                </div>

                <AdminForumCommentActions
                  commentId={comment.id}
                  isHidden={isHidden}
                />
              </CardContent>
            </Card>
          );
        })}
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Moderovanie fóra
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Fórum
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Táto časť slúži na moderovanie tém a komentárov vo fóre. Obsah môžeš
          skryť, obnoviť, uzamknúť alebo pripnúť podľa pravidiel platformy.
        </p>
      </section>

      <section className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Kedy používať moderovanie fóra</p>
        <p className="mt-1">
          Skrytie používaj pri citlivých osobných údajoch, zdravotných údajoch,
          urážkach alebo spame. Uzamknutie témy je vhodné vtedy, keď chceš
          zabrániť ďalšej diskusii, ale ponechať tému čitateľnú.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Link href={createForumAdminHref({ tab: "topics" })}>
          <Card className={tab === "topics" ? "border-sky-300 bg-sky-50" : ""}>
            <CardContent className="py-4">
              <p className="font-semibold">Témy fóra</p>
              <p className="mt-1 text-sm text-slate-600">
                Moderovanie tém, uzamknutie, pripnutie alebo skrytie.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={createForumAdminHref({ tab: "comments" })}>
          <Card
            className={tab === "comments" ? "border-sky-300 bg-sky-50" : ""}
          >
            <CardContent className="py-4">
              <p className="font-semibold">Komentáre</p>
              <p className="mt-1 text-sm text-slate-600">
                Kontrola, skrytie alebo obnovenie komentárov.
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filtre</h2>
        </div>

        <form
          action="/admin/forum"
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
        >
          <input type="hidden" name="tab" value={tab} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Typ obsahu
            </label>

            <select
              name="tab"
              defaultValue={tab}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="topics">Témy</option>
              <option value="comments">Komentáre</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Stav
            </label>

            <select
              name="status"
              defaultValue={status}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetko</option>
              <option value="visible">Viditeľné</option>
              <option value="hidden">Skryté</option>
              {tab === "topics" ? (
                <>
                  <option value="locked">Uzamknuté</option>
                  <option value="pinned">Pripnuté</option>
                </>
              ) : null}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vyhľadávanie
            </label>

            <input
              name="q"
              defaultValue={q}
              placeholder={
                tab === "topics"
                  ? "názov alebo popis témy..."
                  : "text komentára..."
              }
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
              href={createForumAdminHref({ tab })}
              className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zrušiť
            </Link>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href={createForumAdminHref({ tab, status: "visible", q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Viditeľné
          </Link>

          <Link
            href={createForumAdminHref({ tab, status: "hidden", q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Skryté
          </Link>

          {tab === "topics" ? (
            <>
              <Link
                href={createForumAdminHref({ tab, status: "locked", q })}
                className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
              >
                Uzamknuté
              </Link>

              <Link
                href={createForumAdminHref({ tab, status: "pinned", q })}
                className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
              >
                Pripnuté
              </Link>
            </>
          ) : null}

          <Link
            href={createForumAdminHref({ tab })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Reset filtrov
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Celkový počet podľa filtra</p>
            <p className="mt-2 text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Aktívna sekcia</p>
            <p className="mt-2 text-lg font-bold">
              {tab === "comments" ? "Komentáre" : "Témy"} ·{" "}
              {getStatusLabel(status)}
            </p>
          </CardContent>
        </Card>
      </section>

      {content}

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) =>
          createForumAdminHref({
            tab,
            status,
            q,
            page: pageNumber,
          })
        }
      />
    </main>
  );
}