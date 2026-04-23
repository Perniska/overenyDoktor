import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
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
import { CATEGORY_LABELS } from "@/lib/reviews/aspectLexicon";
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

function formatNumber(value?: number | null) {
  if (value == null) return "—";
  return Number(value).toFixed(2).replace(".", ",");
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

function getSentimentLabelSk(label?: string | null) {
  if (label === "positive") return "Pozitívny";
  if (label === "negative") return "Negatívny";
  if (label === "neutral") return "Neutrálny";
  return "Neuvedené";
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
      sentiment_score,
      sentiment_label,
      sentiment_confidence,
      detected_categories,
      aspect_scores,
      contains_sensitive_data,
      contains_offensive_language,
      needs_manual_review,
      analysis_version,
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

  const detectedCategories = Array.isArray(review.detected_categories)
    ? review.detected_categories
    : [];

  const aspectScores =
    review.aspect_scores && typeof review.aspect_scores === "object"
      ? review.aspect_scores
      : {};

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/reviews"
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="size-4" />
        Späť na recenzie
      </Link>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
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

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Cieľ recenzie</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border bg-slate-50 p-4">
              <div className="rounded-xl bg-white p-3 text-slate-700">
                {doctor ? (
                  <Stethoscope className="size-5" />
                ) : (
                  <Building2 className="size-5" />
                )}
              </div>

              <div>
                <p className="font-semibold text-slate-900">{targetName}</p>
                <p className="mt-1 text-sm text-slate-500">{targetLabel}</p>

                <Link
                  href={targetHref}
                  className="mt-3 inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  Otvoriť verejný profil
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Celkové hodnotenie</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {review.rating}/5
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Typ návštevy</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {getVisitTypeLabel(review.visit_type)}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Zdroj recenzie</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {getReviewSourceLabel(review.review_source)}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Autor</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {review.is_anonymous
                    ? "Anonymná recenzia"
                    : author?.username ?? "Neznámy používateľ"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Komentár</p>
              <p className="mt-2 whitespace-pre-line text-slate-800">
                {review.comment ?? "Bez komentára"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stav a moderácia</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Stav recenzie</p>
              <p className="mt-2 font-semibold text-slate-950">
                {getReviewStatusLabel(review.status)}
              </p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Viditeľnosť</p>
              <p className="mt-2 font-semibold text-slate-950">
                {isHidden ? "Skrytá" : "Viditeľná"}
              </p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Vytvorené</p>
              <p className="mt-2 font-semibold text-slate-950">
                {formatDateTime(review.created_at)}
              </p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Aktualizované</p>
              <p className="mt-2 font-semibold text-slate-950">
                {formatDateTime(review.updated_at)}
              </p>
            </div>

            <AdminReviewActions reviewId={review.id} isHidden={isHidden} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Štruktúrované hodnotenie</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {ratingRows.length === 0 ? (
              <p className="text-sm text-slate-600">
                Táto recenzia neobsahuje detailné ratingy.
              </p>
            ) : (
              ratingRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <span className="text-sm text-slate-700">{label}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-950">
                    <Star className="size-4 fill-current text-yellow-500" />
                    {value}/5
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analýza recenzie</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Sentiment</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {getSentimentLabelSk(review.sentiment_label)}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Skóre sentimentu</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {formatNumber(review.sentiment_score)}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Dôvera výsledku</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {formatNumber(review.sentiment_confidence)}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Verzia analýzy</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {review.analysis_version ?? "—"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Detegované kategórie</p>

              {detectedCategories.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Neboli detegované žiadne kategórie.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {detectedCategories.map((category: string) => (
                    <span
                      key={category}
                      className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-800"
                    >
                      {CATEGORY_LABELS[category] ?? category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Aspektové skóre</p>

              {Object.keys(aspectScores).length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Aspektové skóre nie je dostupné.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {Object.entries(aspectScores).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                    >
                      <span className="text-sm text-slate-700">
                        {CATEGORY_LABELS[key] ?? key}
                      </span>
                      <span className="text-sm font-semibold text-slate-950">
                        {formatNumber(Number(value))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <div
                className={`rounded-2xl border p-4 ${
                  review.contains_sensitive_data
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldCheck className="size-4" />
                  Citlivé údaje
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {review.contains_sensitive_data
                    ? "Systém detegoval možné osobné alebo citlivé údaje."
                    : "Neboli detegované zjavné osobné alebo citlivé údaje."}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  review.contains_offensive_language
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <AlertTriangle className="size-4" />
                  Nevhodný jazyk
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {review.contains_offensive_language
                    ? "Systém detegoval nevhodné alebo urážlivé výrazy."
                    : "Neboli detegované zjavné urážlivé výrazy."}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  review.needs_manual_review
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  {review.needs_manual_review ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  Manuálne posúdenie
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {review.needs_manual_review
                    ? "Táto recenzia bola označená na manuálne posúdenie."
                    : "Táto recenzia nebola označená ako riziková."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}