import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSingleRelation } from "@/lib/relations";
import { ReviewEditForm } from "@/components/reviews/ReviewEditForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type ReviewEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getDoctorName(doctor: any) {
  return [doctor.title, doctor.first_name, doctor.last_name]
    .filter(Boolean)
    .join(" ");
}

export default async function ReviewEditPage({ params }: ReviewEditPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: reviewData, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      id_user,
      id_doctor,
      id_facility,
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
      visit_type,
      is_anonymous,
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
    .eq("id", id)
    .eq("id_user", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !reviewData) {
    notFound();
  }

  const review = reviewData as any;
  const doctor = getSingleRelation(review.doctor);
  const facility = getSingleRelation(review.facility);

  const targetType = doctor ? "doctor" : "facility";
  const targetName = doctor
    ? getDoctorName(doctor)
    : facility?.name ?? "Zdravotnícke zariadenie";
  const targetHref = doctor
    ? `/doctors/${doctor.id}`
    : facility?.id
      ? `/facilities/${facility.id}`
      : "/facilities";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Button variant="ghost" asChild>
        <Link href="/reviews/mine">
          <ArrowLeft className="size-4" />
          Späť na moje recenzie
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Upraviť recenziu</CardTitle>
        </CardHeader>

        <CardContent>
          <ReviewEditForm
            reviewId={review.id}
            targetType={targetType}
            targetName={targetName}
            targetHref={targetHref}
            initialReview={{
              rating_communication: review.rating_communication,
              rating_explanation: review.rating_explanation,
              rating_waiting_time: review.rating_waiting_time,
              rating_organization: review.rating_organization,
              rating_approach: review.rating_approach,
              rating_professionalism: review.rating_professionalism,
              rating_cleanliness: review.rating_cleanliness,
              rating_environment: review.rating_environment,
              rating_equipment: review.rating_equipment,
              rating_accessibility: review.rating_accessibility,
              rating_privacy: review.rating_privacy,
              rating_recommendation: review.rating_recommendation,
              visit_type: review.visit_type,
              is_anonymous: review.is_anonymous,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}