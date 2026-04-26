import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReviewCreateForm } from "@/components/reviews/ReviewCreateForm";

type SearchParams = {
  doctorId?: string;
  facilityId?: string;
};

export default async function CreateReviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  if (params.doctorId) {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id, full_name")
      .eq("id", params.doctorId)
      .single();

    if (!doctor) {
      notFound();
    }

    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        <Link
          href={`/doctors/${doctor.id}`}
          className="inline-flex text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          Späť na profil lekára
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h1 className="mb-6 text-lg font-semibold text-slate-950">
            Pridať recenziu lekára
          </h1>

          <ReviewCreateForm
            targetType="doctor"
            targetId={doctor.id}
            targetName={doctor.full_name}
          />
        </section>
      </main>
    );
  }

  if (params.facilityId) {
    const { data: facility } = await supabase
      .from("facilities")
      .select("id, name")
      .eq("id", params.facilityId)
      .single();

    if (!facility) {
      notFound();
    }

    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        <Link
          href={`/facilities/${facility.id}`}
          className="inline-flex text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          Späť na profil zariadenia
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h1 className="mb-6 text-lg font-semibold text-slate-950">
            Pridať recenziu zariadenia
          </h1>

          <ReviewCreateForm
            targetType="facility"
            targetId={facility.id}
            targetName={facility.name}
          />
        </section>
      </main>
    );
  }

  notFound();
}