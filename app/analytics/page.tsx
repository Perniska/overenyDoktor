import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Building2,
  FileWarning,
  MessageSquare,
  Star,
  Stethoscope,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/reviews/aspectLexicon";

export const dynamic = "force-dynamic";

type AnalyticsOverview = {
  doctors_count: number;
  facilities_count: number;
  reviews_count: number;
  forum_topics_count: number;
  forum_comments_count: number;
  open_reports_count: number;
  average_rating: number | null;
};

type RatingDistributionRow = {
  rating: number;
  review_count: number;
  percentage: number;
};

type ReviewsByMonthRow = {
  month_key: string;
  review_count: number;
};

type FacilitiesByRegionRow = {
  region: string;
  facility_count: number;
};

type DoctorsBySpecializationRow = {
  specialization_name: string;
  doctor_count: number;
};

type SpecializationRatingsRow = {
  specialization_name: string;
  doctor_count: number;
  review_count: number;
  average_rating: number | null;
};

type SentimentDistributionRow = {
  sentiment_label: string;
  review_count: number;
  percentage: number;
};

type SentimentByMonthRow = {
  month_key: string;
  average_sentiment: number | null;
  review_count: number;
};

type DetectedCategoryRow = {
  category_key: string;
  usage_count: number;
};

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("sk-SK").format(value ?? 0);
}

function formatRating(value: number | null | undefined) {
  if (value == null) return "—";
  return Number(value).toFixed(2).replace(".", ",");
}

function monthKeyToLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("sk-SK", {
    month: "long",
    year: "numeric",
  });
}

function getSentimentLabelSk(label?: string | null) {
  if (label === "positive") return "Pozitívny";
  if (label === "negative") return "Negatívny";
  if (label === "neutral") return "Neutrálny";
  return label ?? "Neuvedené";
}

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: roleAllowed } = await supabase.rpc("current_user_has_role", {
    p_allowed_slugs: ["admin", "moderator"],
  });

  if (!roleAllowed) {
    redirect("/");
  }

  const [
    overviewResult,
    ratingDistributionResult,
    reviewsByMonthResult,
    facilitiesByRegionResult,
    doctorsBySpecializationResult,
    specializationRatingsResult,
    sentimentDistributionResult,
    sentimentByMonthResult,
    detectedCategoriesResult,
    unreadNotificationsCountResult,
  ] = await Promise.all([
    supabase.rpc("analytics_overview"),
    supabase.rpc("analytics_rating_distribution"),
    supabase.rpc("analytics_reviews_by_month", { p_limit: 6 }),
    supabase.rpc("analytics_facilities_by_region", { p_limit: 8 }),
    supabase.rpc("analytics_doctors_by_specialization", { p_limit: 8 }),
    supabase.rpc("analytics_specialization_ratings", { p_limit: 8 }),
    supabase.rpc("analytics_sentiment_distribution"),
    supabase.rpc("analytics_sentiment_by_month", { p_limit: 6 }),
    supabase.rpc("analytics_detected_categories", { p_limit: 8 }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("id_user", user.id)
      .eq("is_read", false),
  ]);

  const overview = (overviewResult.data ?? null) as AnalyticsOverview | null;

  const ratingDistribution =
    (ratingDistributionResult.data as RatingDistributionRow[] | null) ?? [];

  const reviewsByMonth =
    (reviewsByMonthResult.data as ReviewsByMonthRow[] | null) ?? [];

  const facilitiesByRegion =
    (facilitiesByRegionResult.data as FacilitiesByRegionRow[] | null) ?? [];

  const doctorsBySpecialization =
    (doctorsBySpecializationResult.data as DoctorsBySpecializationRow[] | null) ??
    [];

  const specializationRatings =
    (specializationRatingsResult.data as SpecializationRatingsRow[] | null) ?? [];

  const sentimentDistribution =
    (sentimentDistributionResult.data as SentimentDistributionRow[] | null) ?? [];

  const sentimentByMonth =
    (sentimentByMonthResult.data as SentimentByMonthRow[] | null) ?? [];

  const detectedCategories =
    (detectedCategoriesResult.data as DetectedCategoryRow[] | null) ?? [];

  const unreadNotificationsCount = unreadNotificationsCountResult.count ?? 0;

  const overviewError =
    overviewResult.error ||
    ratingDistributionResult.error ||
    reviewsByMonthResult.error ||
    facilitiesByRegionResult.error ||
    doctorsBySpecializationResult.error ||
    specializationRatingsResult.error ||
    sentimentDistributionResult.error ||
    sentimentByMonthResult.error ||
    detectedCategoriesResult.error;

  const maxMonthlyCount = Math.max(
    ...reviewsByMonth.map((item) => Number(item.review_count ?? 0)),
    1
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Administrácia a vyhodnotenie
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Analytika systému
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Prehľad základných štatistických ukazovateľov systému, recenzií,
          fóra, nahlásení a referenčných údajov. Stránka je rozšírená aj o
          výsledky textovej analytiky, sentimentu a automatickej kategorizácie
          spätnej väzby.
        </p>
      </section>

      {overviewError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Analytické dáta sa nepodarilo načítať: {overviewError.message}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
                <Stethoscope className="size-5" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Lekári</p>
                <p className="text-2xl font-bold text-slate-950">
                  {formatNumber(overview?.doctors_count)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <Building2 className="size-5" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Zariadenia</p>
                <p className="text-2xl font-bold text-slate-950">
                  {formatNumber(overview?.facilities_count)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <Star className="size-5" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Recenzie</p>
                <p className="text-2xl font-bold text-slate-950">
                  {formatNumber(overview?.reviews_count)}
                </p>
                <p className="text-xs text-slate-500">
                  Priemer: {formatRating(overview?.average_rating)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-50 p-3 text-red-700">
                <FileWarning className="size-5" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Otvorené nahlásenia</p>
                <p className="text-2xl font-bold text-slate-950">
                  {formatNumber(overview?.open_reports_count)}
                </p>
                <p className="text-xs text-slate-500">
                  Neprečítané notifikácie: {formatNumber(unreadNotificationsCount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rozdelenie hodnotení recenzií</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {ratingDistribution.length === 0 ? (
              <p className="text-sm text-slate-600">
                Zatiaľ nie sú dostupné dáta o hodnoteniach recenzií.
              </p>
            ) : (
              ratingDistribution.map((row) => (
                <div key={row.rating} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      {row.rating}{" "}
                      {row.rating === 1 ? "hviezdička" : "hviezdičky"}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(row.review_count)} (
                      {Number(row.percentage).toFixed(1).replace(".", ",")} %)
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-sky-600"
                      style={{ width: `${Math.max(Number(row.percentage), 0)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivita fóra a komunity</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <MessageSquare className="size-4" />
                Témy vo fóre
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatNumber(overview?.forum_topics_count)}
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Users className="size-4" />
                Komentáre vo fóre
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatNumber(overview?.forum_comments_count)}
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4 sm:col-span-2">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Activity className="size-4" />
                Interpretácia
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Táto sekcia ukazuje základnú mieru aktivity používateľov v
                komunitnej časti systému. V ďalšom kroku je možné ju rozšíriť o
                analýzu rastu tém, odpovedí a používateľských interakcií v čase.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Najčastejšie regióny zariadení</CardTitle>
          </CardHeader>

          <CardContent>
            {facilitiesByRegion.length === 0 ? (
              <p className="text-sm text-slate-600">
                Regióny sa zatiaľ nepodarilo načítať.
              </p>
            ) : (
              <div className="space-y-3">
                {facilitiesByRegion.map((row) => (
                  <div
                    key={row.region}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <span className="text-sm text-slate-700">{row.region}</span>
                    <span className="text-sm font-semibold text-slate-950">
                      {formatNumber(row.facility_count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Najčastejšie špecializácie lekárov</CardTitle>
          </CardHeader>

          <CardContent>
            {doctorsBySpecialization.length === 0 ? (
              <p className="text-sm text-slate-600">
                Špecializácie sa zatiaľ nepodarilo načítať.
              </p>
            ) : (
              <div className="space-y-3">
                {doctorsBySpecialization.map((row) => (
                  <div
                    key={row.specialization_name}
                    className="rounded-xl border px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-800">
                        {row.specialization_name}
                      </span>
                      <span className="text-sm font-semibold text-slate-950">
                        {formatNumber(row.doctor_count)} lekárov
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Priemerné hodnotenie podľa špecializácie</CardTitle>
          </CardHeader>

          <CardContent>
            {specializationRatings.length === 0 ? (
              <p className="text-sm text-slate-600">
                Zatiaľ nie sú dostupné dáta pre špecializácie a recenzie.
              </p>
            ) : (
              <div className="space-y-3">
                {specializationRatings.map((row) => (
                  <div
                    key={row.specialization_name}
                    className="rounded-xl border px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-800">
                        {row.specialization_name}
                      </span>
                      <span className="text-sm font-semibold text-slate-950">
                        {formatRating(row.average_rating)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatNumber(row.doctor_count)} lekárov ·{" "}
                      {formatNumber(row.review_count)} recenzií
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vývoj počtu recenzií v čase</CardTitle>
          </CardHeader>

          <CardContent>
            {reviewsByMonth.length === 0 ? (
              <p className="text-sm text-slate-600">
                Zatiaľ nie sú dostupné dáta pre časový prehľad recenzií.
              </p>
            ) : (
              <div className="space-y-3">
                {[...reviewsByMonth].reverse().map((row) => {
                  const percentage =
                    (Number(row.review_count) / maxMonthlyCount) * 100;

                  return (
                    <div key={row.month_key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">
                          {monthKeyToLabel(row.month_key)}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatNumber(row.review_count)}
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rozdelenie recenzií podľa sentimentu</CardTitle>
          </CardHeader>

          <CardContent>
            {sentimentDistribution.length === 0 ? (
              <p className="text-sm text-slate-600">
                Zatiaľ nie sú dostupné dáta o sentimente recenzií.
              </p>
            ) : (
              <div className="space-y-3">
                {sentimentDistribution.map((row) => (
                  <div key={row.sentiment_label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">
                        {getSentimentLabelSk(row.sentiment_label)}
                      </span>

                      <span className="font-semibold text-slate-900">
                        {formatNumber(row.review_count)} (
                        {Number(row.percentage).toFixed(1).replace(".", ",")} %)
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${
                          row.sentiment_label === "positive"
                            ? "bg-emerald-600"
                            : row.sentiment_label === "negative"
                              ? "bg-red-600"
                              : "bg-amber-500"
                        }`}
                        style={{
                          width: `${Math.max(Number(row.percentage), 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Najčastejšie kategórie spätnej väzby</CardTitle>
          </CardHeader>

          <CardContent>
            {detectedCategories.length === 0 ? (
              <p className="text-sm text-slate-600">
                Zatiaľ nie sú dostupné kategórie automatickej analýzy.
              </p>
            ) : (
              <div className="space-y-3">
                {detectedCategories.map((row) => (
                  <div
                    key={row.category_key}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <span className="text-sm text-slate-700">
                      {CATEGORY_LABELS[row.category_key] ?? row.category_key}
                    </span>
                    <span className="text-sm font-semibold text-slate-950">
                      {formatNumber(row.usage_count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vývoj priemerného sentimentu v čase</CardTitle>
          </CardHeader>

          <CardContent>
            {sentimentByMonth.length === 0 ? (
              <p className="text-sm text-slate-600">
                Zatiaľ nie sú dostupné časové dáta sentimentu.
              </p>
            ) : (
              <div className="space-y-3">
                {[...sentimentByMonth].reverse().map((row) => {
                  const sentiment = Number(row.average_sentiment ?? 0);
                  const percentage = ((sentiment + 1) / 2) * 100;

                  return (
                    <div key={row.month_key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">
                          {monthKeyToLabel(row.month_key)}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatRating(row.average_sentiment)} ·{" "}
                          {formatNumber(row.review_count)} recenzií
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${
                            sentiment > 0.2
                              ? "bg-emerald-600"
                              : sentiment < -0.2
                                ? "bg-red-600"
                                : "bg-amber-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interpretácia textovej analytiky</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              Sentiment recenzií je vypočítaný lexikónovým prístupom ako
              normalizovaný rozdiel medzi pozitívnymi a negatívnymi jazykovými
              zásahmi. Výsledok sa ukladá do intervalu od -1 do 1.
            </p>

            <p>
              Okrem polarity sa z recenzie automaticky odvodzujú aj tematické
              kategórie spätnej väzby, napríklad komunikácia, odbornosť,
              čakacia doba, organizácia alebo prostredie.
            </p>

            <p>
              Táto vrstva predstavuje praktickú implementáciu automatickej
              kategorizácie a sentimentovej analýzy spätnej väzby pacientov v
              systéme.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ďalší analytický krok</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate-700">
              Tento dashboard tvorí základ pre ďalšie rozšírenie o analýzu
              textu recenzií. V ďalšom kroku je možné doplniť AI asistované
              preformulovanie recenzií, TF-IDF reprezentáciu textu alebo
              presnejšie modely automatickej klasifikácie.
            </p>

            <div className="grid gap-3">
              <Link
                href="/admin/reviews"
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Prejsť na správu recenzií
              </Link>

              <Link
                href="/forum"
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Prejsť na fórum
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poznámka k implementácii</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              Základné agregácie sú realizované na databázovej vrstve cez RPC
              funkcie. Prezentačná vrstva následne zobrazuje pripravené
              analytické výstupy bez potreby rozsiahleho prepočtu v UI.
            </p>

            <p>
              Takýto prístup zjednodušuje rozšírenie systému o ďalšie analytické
              výstupy, napríklad sentiment recenzií, kategorizáciu spätnej
              väzby alebo modely založené na TF-IDF reprezentácii textu.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}