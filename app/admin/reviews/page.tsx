import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  EyeOff,
  Filter,
  Search,
  ShieldAlert,
  Star,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import {
  getReviewSourceLabel,
  getReviewStatusLabel,
  getVisitTypeLabel,
} from "@/lib/labels";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminReviewsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    source?: string | string[];
    flagged?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createReviewsHref(filters: {
  status?: string;
  source?: string;
  flagged?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.source && filters.source !== "all") {
    params.set("source", filters.source);
  }

  if (filters.flagged && filters.flagged !== "all") {
    params.set("flagged", filters.flagged);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();
  return query ? `/admin/reviews?${query}` : "/admin/reviews";
}

function getDoctorName(doctor: any) {
  return [doctor?.title, doctor?.first_name, doctor?.last_name]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "Neuvedené";
  return new Date(value).toLocaleDateString("sk-SK");
}

function getTargetName(review: any) {
  const doctor = getSingleRelation(review.doctor);
  const facility = getSingleRelation(review.facility);

  if (doctor) {
    return getDoctorName(doctor) || "Lekár";
  }

  if (facility?.name) {
    return facility.name;
  }

  return "Neznámy cieľ";
}

function getAuthorName(review: any) {
  if (review.is_anonymous) return "Anonymná recenzia";

  const author = getSingleRelation(review.author);
  return author?.username ?? "Neznámy používateľ";
}

export default async function AdminReviewsPage({
  searchParams,
}: AdminReviewsPageProps) {
  const auth = await requireModeratorOrAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/");
  }

  const params = await searchParams;
  const status = getSingleParam(params.status) ?? "all";
  const source = getSingleParam(params.source) ?? "all";
  const flagged = getSingleParam(params.flagged) ?? "all";
  const q = getSingleParam(params.q)?.trim() ?? "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 15;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  let reviewsQuery = supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      comment,
      status,
      review_source,
      visit_type,
      created_at,
      deleted_at,
      is_anonymous,
      sentiment_label,
      sentiment_score,
      contains_sensitive_data,
      contains_offensive_language,
      needs_manual_review,
      doctor:doctors!reviews_id_doctor_fkey (
        id,
        title,
        first_name,
        last_name
      ),
      facility:facilities!reviews_id_facility_fkey (
        id,
        name
      ),
      author:profiles!reviews_id_user_fkey (
        id,
        username
      )
    `,
      { count: "exact" }
    );

  if (status !== "all") {
    reviewsQuery = reviewsQuery.eq("status", status);
  }

  if (source !== "all") {
    reviewsQuery = reviewsQuery.eq("review_source", source);
  }

  if (flagged === "manual") {
    reviewsQuery = reviewsQuery.eq("needs_manual_review", true);
  }

  if (flagged === "sensitive") {
    reviewsQuery = reviewsQuery.eq("contains_sensitive_data", true);
  }

  if (flagged === "offensive") {
    reviewsQuery = reviewsQuery.eq("contains_offensive_language", true);
  }

  if (q) {
    reviewsQuery = reviewsQuery.or(
      `comment.ilike.%${q}%,status.ilike.%${q}%,review_source.ilike.%${q}%`
    );
  }

  const { data, error, count } = await reviewsQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  const reviews = data ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const pendingCount = reviews.filter((item: any) => item.status === "pending").length;
  const hiddenCount = reviews.filter((item: any) => item.deleted_at).length;
  const flaggedCount = reviews.filter(
    (item: any) =>
      item.needs_manual_review ||
      item.contains_sensitive_data ||
      item.contains_offensive_language
  ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Moderovanie obsahu
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Prehľad recenzií
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Na tejto stránke vieš vyhľadať recenzie, skontrolovať ich analytické
          príznaky a otvoriť detail pre moderovanie.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Celkový počet podľa filtra</p>
                <p className="text-2xl font-bold text-slate-950">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Na tejto strane: pending/rizikové</p>
                <p className="text-2xl font-bold text-slate-950">
                  {pendingCount} / {flaggedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <EyeOff className="size-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Skryté na tejto strane</p>
                <p className="text-2xl font-bold text-slate-950">{hiddenCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filtre recenzií</CardTitle>
        </CardHeader>

        <CardContent>
          <form className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Stav
              </label>
              <select
                name="status"
                defaultValue={status}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              >
                <option value="all">Všetky stavy</option>
                <option value="approved">Schválené</option>
                <option value="pending">Čakajúce</option>
                <option value="rejected">Zamietnuté</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Zdroj
              </label>
              <select
                name="source"
                defaultValue={source}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              >
                <option value="all">Všetky zdroje</option>
                <option value="structured_form">Štruktúrovaný formulár</option>
                <option value="manual">Manuálny text</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Rizikový príznak
              </label>
              <select
                name="flagged"
                defaultValue={flagged}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              >
                <option value="all">Všetky</option>
                <option value="manual">Manuálne posúdenie</option>
                <option value="sensitive">Citlivé údaje</option>
                <option value="offensive">Nevhodný jazyk</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Vyhľadávanie
              </label>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Komentár alebo stav"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              />
            </div>

            <div className="md:col-span-4 flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Filter className="size-4" />
                Filtrovať
              </button>

              <Link
                href="/admin/reviews"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Search className="size-4" />
                Zrušiť filtre
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Recenzie sa nepodarilo načítať: {error.message}
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            Pre zadané filtre sa nenašli žiadne recenzie.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {reviews.map((review: any) => (
            <Card key={review.id}>
              <CardContent className="py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {getReviewStatusLabel(review.status)}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {getReviewSourceLabel(review.review_source)}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {getVisitTypeLabel(review.visit_type)}
                      </span>

                      {review.needs_manual_review ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          Manuálne posúdenie
                        </span>
                      ) : null}

                      {review.contains_sensitive_data ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          Citlivé údaje
                        </span>
                      ) : null}

                      {review.contains_offensive_language ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          Nevhodný jazyk
                        </span>
                      ) : null}

                      {review.deleted_at ? (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                          Skrytá
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {getTargetName(review)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Autor: {getAuthorName(review)} · Vytvorené: {formatDate(review.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Star className="size-4 fill-current text-yellow-500" />
                      {review.rating}/5
                      <span className="text-slate-400">·</span>
                      Sentiment: {review.sentiment_label ?? "—"}
                      <span className="text-slate-400">·</span>
                      Skóre: {review.sentiment_score ?? "—"}
                    </div>

                    <p className="line-clamp-3 max-w-3xl text-sm leading-6 text-slate-700">
                      {review.comment ?? "Bez komentára"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center">
                    <Link
                      href={`/admin/reviews/${review.id}`}
                      className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Otvoriť detail
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) =>
          createReviewsHref({ status, source, flagged, q, page: pageNumber })
        }
      />
    </main>
  );
}