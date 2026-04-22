import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ExternalLink, Star } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { AdminReportActions } from "@/components/admin/AdminReportActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

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

function getDoctorName(doctor: any) {
  return [doctor?.title, doctor?.first_name, doctor?.last_name]
    .filter(Boolean)
    .join(" ");
}

function getTargetInfo(review: any) {
  if (!review) {
    return {
      title: "Cieľ sa nepodarilo načítať",
      href: "#",
      description: "Recenzia už môže byť odstránená alebo nedostupná.",
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

export default async function AdminReportsPage() {
  const auth = await requireModeratorOrAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();

  const { data: reportsData, error: reportsError } = await supabase
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
    `
    )
    .order("is_resolved", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);

  const reports = (reportsData ?? []) as ReportRow[];

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
          Tu sa zobrazujú nahlásené recenzie. Moderátor môže nahlásenie
          vyriešiť bez zásahu alebo skryť recenziu z verejného zobrazenia.
        </p>
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
            Zatiaľ neexistujú žiadne nahlásenia.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {reports.map((report) => {
            const review = reviewsById.get(report.id_target);
            const target = getTargetInfo(review);
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
                        {report.target_type === "review"
                          ? "Nahlásená recenzia"
                          : "Nahlásený obsah"}
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

                    <Link
                      href={target.href}
                      className="mt-1 inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:underline"
                    >
                      {target.title}
                      <ExternalLink className="size-4" />
                    </Link>

                    <p className="mt-1 text-sm text-slate-600">
                      {target.description}
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
                        Akcia: {report.resolution_action ?? "neuvedené"}
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
    </main>
  );
}