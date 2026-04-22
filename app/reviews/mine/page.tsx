import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSingleRelation } from "@/lib/relations";
import {
  MyReviewCard,
  type MyReviewItem,
} from "@/components/reviews/MyReviewCard";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type MyReviewsPageProps = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDoctorName(doctor: any) {
  return [doctor.title, doctor.first_name, doctor.last_name]
    .filter(Boolean)
    .join(" ");
}

function createPageHref(page: number) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/reviews/mine?${query}` : "/reviews/mine";
}

export default async function MyReviewsPage({
  searchParams,
}: MyReviewsPageProps) {
  const params = await searchParams;

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error, count } = await supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      comment,
      created_at,
      updated_at,
      visit_type,
      review_source,
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
    `,
      { count: "exact" }
    )
    .eq("id_user", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const reviews: MyReviewItem[] =
    data?.map((item: any) => {
      const doctor = getSingleRelation(item.doctor);
      const facility = getSingleRelation(item.facility);

      if (doctor) {
        return {
          id: item.id,
          rating: item.rating,
          comment: item.comment,
          created_at: item.created_at,
          updated_at: item.updated_at,
          visit_type: item.visit_type,
          review_source: item.review_source,
          targetType: "doctor",
          targetName: getDoctorName(doctor),
          targetHref: `/doctors/${doctor.id}`,
        };
      }

      return {
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        created_at: item.created_at,
        updated_at: item.updated_at,
        visit_type: item.visit_type,
        review_source: item.review_source,
        targetType: "facility",
        targetName: facility?.name ?? "Zdravotnícke zariadenie",
        targetHref: facility?.id ? `/facilities/${facility.id}` : "/facilities",
      };
    }) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Používateľský účet
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Moje recenzie
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Tu nájdeš svoje zverejnené recenzie. Recenziu môžeš otvoriť,
            upraviť alebo odstrániť z verejného profilu.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/doctors">Pridať ďalšiu recenziu</Link>
        </Button>
      </section>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Recenzie sa nepodarilo načítať: {error.message}
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Zatiaľ nemáš žiadne recenzie
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Recenziu môžeš pridať z profilu lekára alebo zariadenia.
            </p>

            <div className="mt-5 flex justify-center gap-3">
              <Button asChild>
                <Link href="/doctors">Vyhľadať lekára</Link>
              </Button>

              <Button variant="outline" asChild>
                <Link href="/facilities">Vyhľadať zariadenie</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-4">
            <p className="text-sm text-slate-600">
              Zobrazuje sa {reviews.length} z {totalCount} recenzií.
            </p>

            {reviews.map((review) => (
              <MyReviewCard key={review.id} review={review} />
            ))}
          </section>

          <NumberedPagination
            currentPage={page}
            totalPages={totalPages}
            createHref={createPageHref}
          />
        </>
      )}
    </main>
  );
}