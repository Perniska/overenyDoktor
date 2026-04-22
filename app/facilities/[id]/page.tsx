import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  ShieldCheck,
  Star,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSingleRelation } from "@/lib/relations";
import { ReportReviewButton } from "@/components/reports/ReportReviewButton";
import {
  getDataQualityStatusLabel,
  getVisitTypeLabel,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type FacilityDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getDoctorFullName(doctor: any) {
  return [doctor.title, doctor.first_name, doctor.last_name]
    .filter(Boolean)
    .join(" ");
}

function getRatingRow(label: string, value?: number | null) {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}/5</span>
    </div>
  );
}

export default async function FacilityDetailPage({
  params,
}: FacilityDetailPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: facilityData, error } = await supabase
    .from("facilities")
    .select(
      `
      id,
      name,
      description,
      website_url,
      provider_name,
      provider_ico,
      region,
      district,
      raw_address,
      facility_kind,
      primary_specialization,
      office_hours,
      price_list_url,
      price_list_note,
      verification_status,
      data_quality_status,
      facility_type:id_facility_type (
        id,
        name,
        slug
      ),
      addresses (
        id,
        street,
        city,
        region,
        zip_code,
        is_primary,
        latitude,
        longitude,
        raw_address
      ),
      facility_specializations (
        is_primary,
        specialization:id_specialization (
          id,
          name,
          slug,
          category
        )
      ),
      doctor_facilities (
        role,
        is_current,
        since,
        doctors (
          id,
          title,
          first_name,
          last_name,
          verification_status,
          specialization:specialization (
            id,
            name,
            slug
          )
        )
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !facilityData) {
    notFound();
  }

  const facility = facilityData as any;
  const facilityType = getSingleRelation(facility.facility_type);

  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      comment,
      sentiment_score,
      created_at,
      is_anonymous,
      visit_type,
      review_source,
      rating_communication,
      rating_waiting_time,
      rating_organization,
      rating_cleanliness,
      rating_environment,
      rating_equipment,
      rating_accessibility,
      rating_privacy,
      rating_recommendation
    `
    )
    .eq("id_facility", id)
    .is("id_doctor", null)
    .eq("status", "approved")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const reviews = reviewsData ?? [];

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
        reviews.length
      : 0;

  const primaryAddress =
    facility.addresses?.find((address: any) => address.is_primary) ??
    facility.addresses?.[0];

  const specializations =
    facility.facility_specializations
      ?.map((item: any) => getSingleRelation(item.specialization))
      .filter(Boolean) ?? [];

  const doctors =
    facility.doctor_facilities
      ?.filter((item: any) => item.is_current)
      .map((item: any) => {
        const doctor = getSingleRelation(item.doctors);

        if (!doctor) {
          return null;
        }

        return {
          role: item.role,
          since: item.since,
          ...doctor,
        };
      })
      .filter(Boolean) ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Button variant="ghost" asChild>
        <Link href="/facilities">
          <ArrowLeft className="size-4" />
          Späť na zariadenia
        </Link>
      </Button>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
                  Profil zariadenia
                </p>

                <CardTitle className="mt-2 text-3xl">{facility.name}</CardTitle>

                <p className="mt-2 flex items-center gap-2 text-slate-600">
                  <Building2 className="size-4" />
                  {facilityType?.name ??
                    facility.facility_kind ??
                    "Zdravotnícke zariadenie"}
                </p>
              </div>

              {facility.verification_status === "verified" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  <ShieldCheck className="size-4" />
                  Overené zariadenie
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                  Čaká na overenie
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-slate-500">Priemerné hodnotenie</p>
                <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
                  <Star className="size-5" />
                  {reviews.length > 0 ? avgRating.toFixed(1) : "—"}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-slate-500">Počet recenzií</p>
                <p className="mt-2 text-2xl font-bold">{reviews.length}</p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-slate-500">Stav údajov</p>
                <p className="mt-2 text-base font-semibold">
                  {getDataQualityStatusLabel(facility.data_quality_status)}
                </p>
              </div>
            </div>

            {facility.provider_name ? (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Poskytovateľ</h2>
                <p className="text-slate-700">{facility.provider_name}</p>

                {facility.provider_ico ? (
                  <p className="mt-1 text-sm text-slate-500">
                    IČO: {facility.provider_ico}
                  </p>
                ) : null}
              </div>
            ) : null}

            {primaryAddress || facility.raw_address ? (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Adresa</h2>
                <p className="flex items-start gap-2 text-slate-700">
                  <MapPin className="mt-0.5 size-4" />
                  <span>
                    {primaryAddress
                      ? [
                          primaryAddress.street,
                          primaryAddress.city,
                          primaryAddress.zip_code,
                          primaryAddress.region,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : facility.raw_address}
                  </span>
                </p>
              </div>
            ) : null}

            {facility.website_url ? (
              <div>
                <a
                  href={facility.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline"
                >
                  <Globe className="size-4" />
                  Web zariadenia
                </a>
              </div>
            ) : null}

            <div>
              <h2 className="mb-3 text-lg font-semibold">Špecializácie</h2>

              {specializations.length === 0 &&
              !facility.primary_specialization ? (
                <p className="text-sm text-slate-600">
                  Špecializácie zatiaľ nie sú uvedené.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {facility.primary_specialization ? (
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                      {facility.primary_specialization}
                    </span>
                  ) : null}

                  {specializations.map((specialization: any) => (
                    <span
                      key={specialization.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                    >
                      {specialization.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold">Lekári v zariadení</h2>

              {doctors.length === 0 ? (
                <p className="text-sm text-slate-600">
                  K zariadeniu zatiaľ nie sú priradení lekári.
                </p>
              ) : (
                <div className="space-y-3">
                  {doctors.map((doctor: any) => {
                    const doctorSpecialization = getSingleRelation(
                      doctor.specialization
                    );

                    return (
                      <div
                        key={doctor.id}
                        className="rounded-xl border bg-slate-50 p-4"
                      >
                        <p className="flex items-center gap-2 font-semibold">
                          <UserRound className="size-4" />
                          <Link
                            href={`/doctors/${doctor.id}`}
                            className="hover:underline"
                          >
                            {getDoctorFullName(doctor)}
                          </Link>
                        </p>

                        {doctorSpecialization?.name ? (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                            <Stethoscope className="size-4" />
                            {doctorSpecialization.name}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hodnotenie zariadenia</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Tu sa hodnotí zariadenie ako organizačné miesto poskytovania
                starostlivosti.
              </p>

              <Button asChild className="w-full">
                <Link href={`/reviews/create?facilityId=${facility.id}`}>
                  Pridať recenziu zariadenia
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Recenzie zariadenia</h2>

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-600">
              Toto zariadenie zatiaľ nemá recenzie.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold">
                        <Star className="size-4" />
                        {review.rating}/5
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getVisitTypeLabel(review.visit_type)}
                      </p>
                    </div>

                    <p className="text-sm text-slate-500">
                      {new Date(review.created_at).toLocaleDateString("sk-SK")}
                    </p>
                  </div>

                  {review.comment ? (
                    <p className="text-slate-700">{review.comment}</p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Recenzia neobsahuje textový komentár.
                    </p>
                  )}

                  <div className="grid gap-2 md:grid-cols-2">
                  {getRatingRow(
                    "Komunikácia personálu",
                    review.rating_communication
                  )}
                  {getRatingRow(
                    "Čakanie a vybavenie",
                    review.rating_waiting_time
                  )}
                  {getRatingRow("Organizácia", review.rating_organization)}
                  {getRatingRow("Čistota", review.rating_cleanliness)}
                  {getRatingRow("Prostredie", review.rating_environment)}
                  {getRatingRow("Vybavenie", review.rating_equipment)}
                  {getRatingRow("Dostupnosť", review.rating_accessibility)}
                  {getRatingRow("Súkromie", review.rating_privacy)}
                  {getRatingRow("Odporúčanie", review.rating_recommendation)}
                </div>

                <div className="flex justify-end border-t pt-3">
                  <ReportReviewButton reviewId={review.id} />
                </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
