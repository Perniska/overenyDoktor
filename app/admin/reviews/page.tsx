import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExternalLink,
  EyeOff,
  Filter,
  Star,
  Stethoscope,
  Building2,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import {
  getReviewSourceLabel,
  getReviewStatusLabel,
  getVisitTypeLabel,
} from "@/lib/labels";
import { AdminReviewActions } from "@/components/admin/AdminReviewActions";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminReviewsPageProps = {
  searchParams: Promise<{
    visibility?: string | string[];
    target?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDoctorName(doctor: any) {
  return [doctor?.title, doctor?.first_name, doctor?.last_name]
    .filter(Boolean)
    .join(" ");
}

function getTargetInfo(review: any) {
  const doctor = getSingleRelation(review.doctor);
  const facility = getSingleRelation(review.facility);

  if (doctor) {
    return {
      type: "doctor" as const,
      name: getDoctorName(doctor) || "Lekár",
      href: `/doctors/${doctor.id}`,
      label: "Lekár",
    };
  }

  if (facility) {
    return {
      type: "facility" as const,
      name: facility.name ?? "Zdravotnícke zariadenie",
      href: `/facilities/${facility.id}`,
      label: "Zariadenie",
    };
  }

  return {
    type: "unknown" as const,
    name: "Neznámy cieľ",
    href: "#",
    label: "Neznáme",
  };
}

function createReviewsHref(filters: {
  visibility?: string;
  target?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.visibility && filters.visibility !== "all") {
    params.set("visibility", filters.visibility);
  }

  if (filters.target && filters.target !== "all") {
    params.set("target", filters.target);
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

  const visibility = getSingleParam(params.visibility) ?? "all";
  const target = getSingleParam(params.target) ?? "all";
  const q = getSingleParam(params.q)?.trim() ?? "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  let query = supabase.from("reviews").select(
    `
    id,
    id_user,
    id_doctor,
    id_facility,
    rating,
    comment,
    status,
    created_at,
    updated_at,
    deleted_at,
    is_anonymous,
    visit_type,
    review_source,
    rating_communication,
    rating_explanation,
    rating_waiting_time,
    rating_organization,
    rating_approach,
    rating_professionalism,
    rating_cleanliness,
    rating_environment,
    rating_equipment,
    rating_accessibility,
    rating_privacy,
    rating_recommendation,
    doctor:doctors!reviews_id_doctor_fkey (
      id,
      title,
      first_name,
      last_name
    ),
    facility:facilities!reviews_id_facility_fkey (
      id,
      name
    )
  `,
    { count: "exact" }
  );

  if (visibility === "visible") {
    query = query.is("deleted_at", null);
  }

  if (visibility === "hidden") {
    query = query.not("deleted_at", "is", null);
  }

  if (target === "doctor") {
    query = query.not("id_doctor", "is", null);
  }

  if (target === "facility") {
    query = query.not("id_facility", "is", null);
  }

  if (q) {
    query = query.ilike("comment", `%${q}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const reviews = data ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const visibleCount = reviews.filter((review: any) => !review.deleted_at).length;
  const hiddenCount = reviews.filter((review: any) => review.deleted_at).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Moderovanie recenzií
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Recenzie
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Táto stránka slúži na kontrolu recenzií naprieč celým systémom.
          Moderátor alebo administrátor môže vidieť aktívne aj skryté recenzie
          a podľa potreby ich skryť alebo obnoviť.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Celkový počet podľa filtra</p>
            <p className="mt-2 text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Viditeľné na tejto strane</p>
            <p className="mt-2 text-2xl font-bold">{visibleCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Skryté na tejto strane</p>
            <p className="mt-2 text-2xl font-bold">{hiddenCount}</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filtre</h2>
        </div>

        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
          action="/admin/reviews"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Viditeľnosť
            </label>

            <select
              name="visibility"
              defaultValue={visibility}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetky</option>
              <option value="visible">Len viditeľné</option>
              <option value="hidden">Len skryté</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cieľ hodnotenia
            </label>

            <select
              name="target"
              defaultValue={target}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Lekári aj zariadenia</option>
              <option value="doctor">Len lekári</option>
              <option value="facility">Len zariadenia</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vyhľadávanie v texte recenzie
            </label>

            <input
              name="q"
              defaultValue={q}
              placeholder="napr. komunikácia, čakanie, organizácia..."
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
              href="/admin/reviews"
              className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zrušiť
            </Link>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href={createReviewsHref({ visibility: "visible", target, q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Viditeľné
          </Link>

          <Link
            href={createReviewsHref({ visibility: "hidden", target, q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Skryté
          </Link>

          <Link
            href={createReviewsHref({ visibility, target: "doctor", q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Lekári
          </Link>

          <Link
            href={createReviewsHref({ visibility, target: "facility", q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Zariadenia
          </Link>

          <Link
            href="/admin/reviews"
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Reset filtrov
          </Link>
        </div>
      </section>

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
          {reviews.map((review: any) => {
            const targetInfo = getTargetInfo(review);
            const isHidden = Boolean(review.deleted_at);

            return (
              <Card
                key={review.id}
                className={isHidden ? "border-red-200 bg-red-50/30" : ""}
              >
                <CardHeader>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {targetInfo.type === "doctor" ? (
                          <Stethoscope className="size-5" />
                        ) : (
                          <Building2 className="size-5" />
                        )}
                        {targetInfo.name}
                      </CardTitle>

                      <Link
                        href={targetInfo.href}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline"
                      >
                        Otvoriť verejný profil
                        <ExternalLink className="size-4" />
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {targetInfo.label}
                      </span>

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
                            Skrytá
                          </>
                        ) : (
                          "Viditeľná"
                        )}
                      </span>

                      <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                        {getReviewStatusLabel(review.status)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-sm text-slate-500">Hodnotenie</p>
                      <p className="mt-1 flex items-center gap-1.5 font-semibold">
                        <Star className="size-4" />
                        {review.rating}/5
                      </p>
                    </div>

                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-sm text-slate-500">Typ návštevy</p>
                      <p className="mt-1 font-semibold">
                        {getVisitTypeLabel(review.visit_type)}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-sm text-slate-500">Zdroj</p>
                      <p className="mt-1 font-semibold">
                        {getReviewSourceLabel(review.review_source)}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-sm text-slate-500">Vytvorené</p>
                      <p className="mt-1 font-semibold">
                        {new Date(review.created_at).toLocaleDateString(
                          "sk-SK"
                        )}
                      </p>
                    </div>
                  </div>

                  {review.comment ? (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                      {review.comment}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Recenzia neobsahuje textový komentár.
                    </p>
                  )}

                  <AdminReviewActions
                    reviewId={review.id}
                    isHidden={isHidden}
                  />
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) =>
          createReviewsHref({
            visibility,
            target,
            q,
            page: pageNumber,
          })
        }
      />
    </main>
  );
}