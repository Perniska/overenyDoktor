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

type DoctorDetailPageProps = {
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

export default async function DoctorDetailPage({
  params,
}: DoctorDetailPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: doctorData, error } = await supabase
    .from("doctors")
    .select(
      `
      id,
      title,
      first_name,
      last_name,
      identifier,
      verification_status,
      data_quality_status,
      verified_at,
      created_at,
      specialization:specialization (
        id,
        name,
        slug,
        category
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
      doctor_facilities (
        role,
        is_current,
        since,
        facilities (
          id,
          name,
          provider_name,
          provider_ico,
          website_url,
          region,
          district,
          raw_address,
          facility_kind,
          addresses (
            id,
            street,
            city,
            region,
            zip_code,
            is_primary,
            raw_address
          )
        )
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !doctorData) {
    notFound();
  }

  const doctor = doctorData as any;
  const specialization = getSingleRelation(doctor.specialization);

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
      rating_explanation,
      rating_waiting_time,
      rating_organization,
      rating_approach,
      rating_professionalism,
      rating_privacy,
      rating_recommendation
    `
    )
    .eq("id_doctor", id)
    .is("id_facility", null)
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

  const doctorName = getDoctorFullName(doctor);

  const primaryAddress =
    doctor.addresses?.find((address: any) => address.is_primary) ??
    doctor.addresses?.[0];

  const currentFacilities =
    doctor.doctor_facilities
      ?.filter((item: any) => item.is_current)
      .map((item: any) => {
        const facility = getSingleRelation(item.facilities);

        if (!facility) {
          return null;
        }

        return {
          role: item.role,
          since: item.since,
          ...facility,
        };
      })
      .filter(Boolean) ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Button variant="ghost" asChild>
        <Link href="/doctors">
          <ArrowLeft className="size-4" />
          Späť na lekárov
        </Link>
      </Button>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
                  Profil lekára
                </p>

                <CardTitle className="mt-2 text-3xl">{doctorName}</CardTitle>

                {specialization?.name ? (
                  <p className="mt-2 flex items-center gap-2 text-slate-600">
                    <Stethoscope className="size-4" />
                    {specialization.name}
                  </p>
                ) : null}
              </div>

              {doctor.verification_status === "verified" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  <ShieldCheck className="size-4" />
                  Overený profil
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
                  {getDataQualityStatusLabel(doctor.data_quality_status)}
                </p>
              </div>
            </div>

            {primaryAddress ? (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Adresa</h2>
                <p className="flex items-start gap-2 text-slate-700">
                  <MapPin className="mt-0.5 size-4" />
                  <span>
                    {[primaryAddress.street, primaryAddress.city]
                      .filter(Boolean)
                      .join(", ")}
                    {primaryAddress.zip_code
                      ? `, ${primaryAddress.zip_code}`
                      : ""}
                    {primaryAddress.region ? `, ${primaryAddress.region}` : ""}
                  </span>
                </p>
              </div>
            ) : null}

            <div>
              <h2 className="mb-3 text-lg font-semibold">
                Zdravotnícke zariadenia
              </h2>

              {currentFacilities.length === 0 ? (
                <p className="text-sm text-slate-600">
                  K lekárovi zatiaľ nie je priradené zdravotnícke zariadenie.
                </p>
              ) : (
                <div className="space-y-3">
                  {currentFacilities.map((facility: any) => {
                    const facilityAddress =
                      facility.addresses?.find(
                        (address: any) => address.is_primary
                      ) ?? facility.addresses?.[0];

                    return (
                      <div
                        key={facility.id}
                        className="rounded-xl border bg-slate-50 p-4"
                      >
                        <p className="flex items-center gap-2 font-semibold">
                          <Building2 className="size-4" />
                          <Link
                            href={`/facilities/${facility.id}`}
                            className="hover:underline"
                          >
                            {facility.name}
                          </Link>
                        </p>

                        {facility.provider_name ? (
                          <p className="mt-1 text-sm text-slate-600">
                            Poskytovateľ: {facility.provider_name}
                          </p>
                        ) : null}

                        {facilityAddress ? (
                          <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                            <MapPin className="mt-0.5 size-4" />
                            {[facilityAddress.street, facilityAddress.city]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        ) : facility.raw_address ? (
                          <p className="mt-2 text-sm text-slate-600">
                            {facility.raw_address}
                          </p>
                        ) : null}

                        {facility.website_url ? (
                          <a
                            href={facility.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline"
                          >
                            <Globe className="size-4" />
                            Web zariadenia
                          </a>
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
              <CardTitle>Hodnotenie lekára</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Hodnotenie sa vytvára cez štruktúrovaný formulár a zobrazí sa
                hneď po odoslaní.
              </p>

              <Button asChild className="w-full">
                <Link href={`/reviews/create?doctorId=${doctor.id}`}>
                  Pridať recenziu lekára
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Recenzie lekára</h2>

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-600">
              Tento lekár zatiaľ nemá recenzie.
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
                  {getRatingRow("Komunikácia", review.rating_communication)}
                  {getRatingRow(
                    "Vysvetlenie postupu",
                    review.rating_explanation
                  )}
                  {getRatingRow("Čakanie", review.rating_waiting_time)}
                  {getRatingRow("Organizácia", review.rating_organization)}
                  {getRatingRow("Prístup", review.rating_approach)}
                  {getRatingRow("Odbornosť", review.rating_professionalism)}
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
