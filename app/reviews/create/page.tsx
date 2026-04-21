import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReviewCreateForm } from "@/components/reviews/ReviewCreateForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type CreateReviewPageProps = {
  searchParams: Promise<{
    doctorId?: string | string[];
    facilityId?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDoctorName(doctor: {
  title: string | null;
  first_name: string;
  last_name: string;
}) {
  return [doctor.title, doctor.first_name, doctor.last_name]
    .filter(Boolean)
    .join(" ");
}

export default async function CreateReviewPage({
  searchParams,
}: CreateReviewPageProps) {
  const params = await searchParams;

  const doctorId = getSingleParam(params.doctorId);
  const facilityId = getSingleParam(params.facilityId);

  if ((!doctorId && !facilityId) || (doctorId && facilityId)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex gap-3 py-4 text-amber-800">
            <AlertCircle className="mt-0.5 size-5" />
            <div>
              <p className="font-medium">Nie je zvolený cieľ hodnotenia.</p>
              <p className="text-sm">
                Recenzia musí patriť buď lekárovi, alebo zariadeniu.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();

  if (doctorId) {
    const { data: doctor, error } = await supabase
      .from("doctors")
      .select("id, title, first_name, last_name")
      .eq("id", doctorId)
      .is("deleted_at", null)
      .single();

    if (error || !doctor) {
      return (
        <main className="mx-auto max-w-2xl px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              Lekár neexistuje alebo nie je dostupný.
            </CardContent>
          </Card>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Button variant="ghost" asChild>
          <Link href={`/doctors/${doctor.id}`}>Späť na profil lekára</Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Pridať recenziu lekára</CardTitle>
          </CardHeader>

          <CardContent>
            <ReviewCreateForm
              targetType="doctor"
              targetId={doctor.id}
              targetName={getDoctorName(doctor)}
            />
          </CardContent>
        </Card>
      </main>
    );
  }

  const { data: facility, error } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("id", facilityId)
    .is("deleted_at", null)
    .single();

  if (error || !facility) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            Zariadenie neexistuje alebo nie je dostupné.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Button variant="ghost" asChild>
        <Link href={`/facilities/${facility.id}`}>
          Späť na profil zariadenia
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Pridať recenziu zariadenia</CardTitle>
        </CardHeader>

        <CardContent>
          <ReviewCreateForm
            targetType="facility"
            targetId={facility.id}
            targetName={facility.name}
          />
        </CardContent>
      </Card>
    </main>
  );
}