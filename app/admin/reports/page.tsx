import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ExternalLink, Filter, Star } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { AdminReportActions } from "@/components/admin/AdminReportActions";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminReportsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    target?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

type ReportRow = {
  id: string;
  id_reporter: string | null;
  id_target: string;
  target_type: string;
  reason: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_action: string | null;
  resolution_note: string | null;
  created_at: string;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDoctorName(doctor: any) {
  return [doctor?.title, doctor?.first_name, doctor?.last_name]
    .filter(Boolean)
    .join(" ");
}

function getResolutionActionLabel(action?: string | null) {
  const labels: Record<string, string> = {
    no_action: "Bez zásahu do obsahu",
    content_hidden: "Obsah bol skrytý",
    content_removed: "Obsah bol odstránený",
    duplicate: "Duplicitné nahlásenie",
    invalid_report: "Neopodstatnené nahlásenie",
  };

  return labels[action ?? ""] ?? "Neuvedené";
}

function getTargetTypeLabel(type: string) {
  const labels: Record<string, string> = {
    review: "Recenzia",
    forum_comment: "Komentár vo fóre",
    forum_topic: "Téma vo fóre",
  };

  return labels[type] ?? "Iný obsah";
}

function getTargetInfo(review: any) {
  if (!review) {
    return {
      title: "Cieľ sa nepodarilo načítať",
      href: "#",
      description: "Obsah už môže byť odstránený alebo nedostupný.",
    };
  }

  const doctor = getSingleRelation(review.doctor);
  const facility = getSingleRelation(review.facility);

  if (doctor) {
    return {
      title: getDoctorName(doctor) || "Lekár",
      href: `/doctors/${doctor.id}`,
      description: "Nahlásená recenzia lekára",
    };
  }

  if (facility) {
    return {
      title: facility.name ?? "Zdravotnícke zariadenie",
      href: `/facilities/${facility.id}`,
      description: "Nahlásená recenzia zariadenia",
    };
  }

  return {
    title: "Recenzia bez cieľa",
    href: "#",
    description: "Recenzia nemá priradeného lekára ani zariadenie.",
  };
}

function createReportsHref(filters: {
  status?: string;
  target?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
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

  return query ? `/admin/reports?${query}` : "/admin/reports";
}

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  const auth = await requireModeratorOrAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/");
  }

  const params = await searchParams;

  const status = getSingleParam(params.status) ?? "all";
  const target = getSingleParam(params.target) ?? "all";
  const q = getSingleParam(params.q)?.trim() ?? "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  let reportsQuery = supabase
    .from("reports")
    .select(
      `
      id,
      id_reporter,
      id_target,
      target_type,
      reason,
      is_resolved,
      resolved_at,
      resolution_action,
      resolution_note,
      created_at
    `,
      { count: "exact" }
    );

  if (status === "open") {
    reportsQuery = reportsQuery.eq("is_resolved", false);
  }

  if (status === "resolved") {
    reportsQuery = reportsQuery.eq("is_resolved", true);
  }

  if (target !== "all") {
    reportsQuery = reportsQuery.eq("target_type", target);
  }

  if (q) {
    reportsQuery = reportsQuery.ilike("reason", `%${q}%`);
  }

  const {
    data: reportsData,
    error: reportsError,
    count,
  } = await reportsQuery
    .order("is_resolved", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, to);

  const reports = (reportsData ?? []) as ReportRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const unresolvedCount = reports.filter((report) => !report.is_resolved).length;
  const resolvedCount = reports.filter((report) => report.is_resolved).length;

  const reviewIds = reports
    .filter((report) => report.target_type === "review")
    .map((report) => report.id_target);

  const { data: reviewsData } =
    reviewIds.length > 0
      ? await supabase
          .from("reviews")
          .select(
            `
            id,
            rating,
            comment,
            created_at,
            deleted_at,
            id_doctor,
            id_facility,
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
          `
          )
          .in("id", reviewIds)
      : { data: [] };

  const reviewsById = new Map(
    (reviewsData ?? []).map((review: any) => [review.id, review])
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Moderovanie obsahu
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Nahlásenia obsahu
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Tu sa zobrazujú používateľské nahlásenia. Moderátor môže nahlásenie
          vyriešiť bez zásahu, označiť ho ako neopodstatnené alebo skryť
          problematickú recenziu z verejného zobrazenia.
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
            <p className="text-sm text-slate-500">
              Nevyriešené na tejto strane
            </p>
            <p className="mt-2 text-2xl font-bold">{unresolvedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Vyriešené na tejto strane</p>
            <p className="mt-2 text-2xl font-bold">{resolvedCount}</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filtre</h2>
        </div>

        <form
          action="/admin/reports"
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Stav nahlásenia
            </label>

            <select
              name="status"
              defaultValue={status}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetky</option>
              <option value="open">Len nevyriešené</option>
              <option value="resolved">Len vyriešené</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Typ obsahu
            </label>

            <select
              name="target"
              defaultValue={target}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetky typy</option>
              <option value="review">Recenzie</option>
              <option value="forum_comment">Komentáre vo fóre</option>
              <option value="forum_topic">Témy vo fóre</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vyhľadávanie v dôvode
            </label>

            <input
              name="q"
              defaultValue={q}
              placeholder="napr. osobné údaje, spam, urážlivý obsah..."
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
              href="/admin/reports"
              className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zrušiť
            </Link>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href={createReportsHref({ status: "open", target, q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Nevyriešené
          </Link>

          <Link
            href={createReportsHref({ status: "resolved", target, q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Vyriešené
          </Link>

          <Link
            href={createReportsHref({ status, target: "review", q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Recenzie
          </Link>

          <Link
            href="/admin/reports"
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Reset filtrov
          </Link>
        </div>
      </section>

      {reportsError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Nahlásenia sa nepodarilo načítať: {reportsError.message}
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            Pre zadané filtre sa nenašli žiadne nahlásenia.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {reports.map((report) => {
            const review = reviewsById.get(report.id_target);
            const targetInfo =
              report.target_type === "review"
                ? getTargetInfo(review)
                : {
                    title: getTargetTypeLabel(report.target_type),
                    href: "#",
                    description:
                      "Tento typ nahlásenia bude napojený v ďalšej fáze.",
                  };

            const isHidden = Boolean(review?.deleted_at);

            return (
              <Card
                key={report.id}
                className={
                  report.is_resolved
                    ? "border-emerald-100 bg-emerald-50/30"
                    : "border-amber-200"
                }
              >
                <CardHeader>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <AlertTriangle className="size-5 text-amber-600" />
                        {getTargetTypeLabel(report.target_type)}
                      </CardTitle>

                      <p className="mt-1 text-sm text-slate-500">
                        Vytvorené:{" "}
                        {new Date(report.created_at).toLocaleString("sk-SK")}
                      </p>
                    </div>

                    <span
                      className={
                        report.is_resolved
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800"
                          : "rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800"
                      }
                    >
                      {report.is_resolved ? "Vyriešené" : "Nevyriešené"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-xl border bg-white p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Dôvod nahlásenia
                    </p>
                    <p className="mt-1 text-slate-800">{report.reason}</p>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Cieľ nahlásenia
                    </p>

                    {targetInfo.href !== "#" ? (
                      <Link
                        href={targetInfo.href}
                        className="mt-1 inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:underline"
                      >
                        {targetInfo.title}
                        <ExternalLink className="size-4" />
                      </Link>
                    ) : (
                      <p className="mt-1 font-semibold text-slate-900">
                        {targetInfo.title}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-slate-600">
                      {targetInfo.description}
                    </p>

                    {review ? (
                      <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          <Star className="size-4" />
                          {review.rating}/5
                        </p>

                        {review.comment ? (
                          <p className="text-sm text-slate-700">
                            {review.comment}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Recenzia neobsahuje textový komentár.
                          </p>
                        )}

                        {isHidden ? (
                          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            Táto recenzia je skrytá z verejného zobrazenia.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {report.is_resolved ? (
                    <div className="rounded-xl border bg-white p-4">
                      <p className="text-sm font-medium text-slate-500">
                        Výsledok moderovania
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        Akcia:{" "}
                        {getResolutionActionLabel(report.resolution_action)}
                      </p>

                      {report.resolution_note ? (
                        <p className="mt-1 text-sm text-slate-700">
                          Poznámka: {report.resolution_note}
                        </p>
                      ) : null}

                      {report.resolved_at ? (
                        <p className="mt-1 text-sm text-slate-500">
                          Vyriešené:{" "}
                          {new Date(report.resolved_at).toLocaleString("sk-SK")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <AdminReportActions
                    reportId={report.id}
                    targetType={report.target_type}
                    targetId={report.id_target}
                    isResolved={report.is_resolved}
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
          createReportsHref({
            status,
            target,
            q,
            page: pageNumber,
          })
        }
      />
    </main>
  );
}