import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  EyeOff,
  ShieldCheck,
  Star,
  Stethoscope,
  UserCircle,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminReviewDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getDoctorName(doctor: any) {
  return [doctor?.title, doctor?.first_name, doctor?.last_name]
    .filter(Boolean)
    .join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Neuvedené";
  return new Date(value).toLocaleString("sk-SK");
}

function getRatingRows(review: any) {
  return [
    ["Komunikácia", review.rating_communication],
    ["Vysvetlenie liečby", review.rating_explanation],
    ["Čakacia doba", review.rating_waiting_time],
    ["Organizácia", review.rating_organization],
    ["Prístup", review.rating_approach],
    ["Profesionalita", review.rating_professionalism],
    ["Čistota", review.rating_cleanliness],
    ["Prostredie", review.rating_environment],
    ["Vybavenie", review.rating_equipment],
    ["Dostupnosť", review.rating_accessibility],
    ["Súkromie", review.rating_privacy],
    ["Odporúčanie", review.rating_recommendation],
  ].filter(([, value]) => value !== null && value !== undefined);
}

export default async function AdminReviewDetailPage({
  params,
}: AdminReviewDetailPageProps) {
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
    .from("reviews")
    .select(
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
      ),
      author:profiles!reviews_id_user_fkey (
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

  const review = data as any;
  const doctor = getSingleRelation(review.doctor);
  const facility = getSingleRelation(review.facility);
  const author = getSingleRelation(review.author);

  const isHidden = Boolean(review.deleted_at);

  const targetName = doctor
    ? getDoctorName(doctor) || "Lekár"
    : facility?.name ?? "Zdravotnícke zariadenie";

  const targetHref = doctor
    ? `/doctors/${doctor.id}`
    : facility?.id
      ? `/facilities/${facility.id}`
      : "#";

  const targetLabel = doctor ? "Lekár" : facility ? "Zariadenie" : "Neznáme";

  const ratingRows = getRatingRows(review);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/admin/reviews"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
      >
        <ArrowLeft className="size-4" />
        Späť na recenzie
      </Link>

      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Správa recenzie
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Recenzia pre: {targetName}
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Na tejto stránke moderuješ iba jednu konkrétnu recenziu. Skrytie
          recenzie ju odstráni z verejného zobrazenia, ale záznam ostane
          zachovaný pre audit.
        </p>
      </section>

      <Card className={isHidden ? "border-red-200 bg-red-50/30" : ""}>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {doctor ? (
                  <Stethoscope className="size-6" />
                ) : (
                  <Building2 className="size-6" />
                )}
                {targetName}
              </CardTitle>

              <p className="mt-1 text-sm text-slate-500">{targetLabel}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {getReviewStatusLabel(review.status)}
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Celkové hodnotenie</p>
              <p className="mt-1 flex items-center gap-1.5 text-lg font-bold">
                <Star className="size-5" />
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
              <p className="text-sm text-slate-500">Zdroj recenzie</p>
              <p className="mt-1 font-semibold">
                {getReviewSourceLabel(review.review_source)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Autor</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <UserCircle className="size-4" />
                {review.is_anonymous
                  ? "Anonymná recenzia"
                  : author?.username ?? "Neznámy používateľ"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Vytvorená</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <CalendarDays className="size-4" />
                {formatDateTime(review.created_at)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Naposledy upravená</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(review.updated_at)}
              </p>
            </div>
          </div>

          {review.comment ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Text recenzie</p>
              <p className="mt-2 whitespace-pre-wrap">{review.comment}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Recenzia neobsahuje textový komentár.
            </div>
          )}

          {ratingRows.length > 0 ? (
            <div className="rounded-xl border bg-white p-4">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="size-5 text-sky-700" />
                Detailné hodnotenie
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {ratingRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold">{value}/5</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {targetHref !== "#" ? (
              <Link
                href={targetHref}
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Otvoriť verejný profil
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AdminReviewActions reviewId={review.id} isHidden={isHidden} />
    </main>
  );
}