import Link from "next/link";
import { AlertCircle, Stethoscope } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FacilityCard, type FacilityListItem } from "@/components/facilities/FacilityCard";
import { PublicSearchForm } from "@/components/public-search/PublicSearchForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type FilterOption = {
  id: string;
  name: string;
  slug: string;
};

export const dynamic = "force-dynamic";

type FacilitiesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    specialization?: string | string[];
    facilityType?: string | string[];
    city?: string | string[];
    region?: string | string[];
    page?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createPageHref(
  page: number,
  filters: {
    q?: string;
    specialization?: string;
    facilityType?: string;
    city?: string;
    region?: string;
  }
) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.specialization) params.set("specialization", filters.specialization);
  if (filters.facilityType) params.set("facilityType", filters.facilityType);
  if (filters.city) params.set("city", filters.city);
  if (filters.region) params.set("region", filters.region);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/facilities?${query}` : "/facilities";
}

export default async function FacilitiesPage({ searchParams }: FacilitiesPageProps) {
  const params = await searchParams;

  const q = getSingleParam(params.q)?.trim() || "";
  const specialization = getSingleParam(params.specialization)?.trim() || "";
  const facilityType = getSingleParam(params.facilityType)?.trim() || "";
  const city = getSingleParam(params.city)?.trim() || "";
  const region = getSingleParam(params.region)?.trim() || "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const limit = 24;
  const offset = (page - 1) * limit;

  const supabase = await createSupabaseServerClient();

  const [facilitiesResult, specializationsResult, facilityTypesResult] = await Promise.all([
    supabase.rpc("search_facilities", {
      p_query: q || null,
      p_specialization_slug: specialization || null,
      p_facility_type_slug: facilityType || null,
      p_city: city || null,
      p_region: region || null,
      p_limit: limit,
      p_offset: offset,
    }),
    supabase.rpc("get_filter_specializations", {
    p_target: "facility",
    }),
    supabase
      .from("facility_type")
      .select("id, name, slug")
      .order("name", { ascending: true }),
  ]);

  const facilities = (facilitiesResult.data ?? []) as FacilityListItem[];

  const specializations = ((specializationsResult.data ?? []) as FilterOption[]).filter(
  (item: FilterOption) => Boolean(item.id && item.name && item.slug)
  );

const facilityTypes = ((facilityTypesResult.data ?? []) as FilterOption[]).filter(
  (item: FilterOption) => Boolean(item.id && item.name && item.slug)
  );

  const hasNextPage = facilities.length === limit;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Register zdravotníckych zariadení
        </p>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Zdravotnícke zariadenia
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Vyhľadaj ambulanciu, kliniku alebo poskytovateľa podľa EVÚC dát.
            </p>
          </div>

          <Button variant="outline" asChild>
            <Link href="/doctors">
              <Stethoscope className="size-4" />
              Zobraziť lekárov
            </Link>
          </Button>
        </div>
      </section>

      <PublicSearchForm
        basePath="/facilities"
        placeholder="napr. ambulancia, názov poskytovateľa, mesto..."
        specializations={specializations}
        facilityTypes={facilityTypes}
        showFacilityType
      />

      {facilitiesResult.error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex gap-3 py-4 text-red-700">
            <AlertCircle className="mt-0.5 size-5" />
            <div>
              <p className="font-medium">Zariadenia sa nepodarilo načítať.</p>
              <p className="text-sm">{facilitiesResult.error.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : facilities.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Nenašli sa žiadne zariadenia
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Skús zmeniť názov, mesto, typ zariadenia alebo špecializáciu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Zobrazuje sa {facilities.length} výsledkov{page > 1 ? ` na strane ${page}` : ""}.
          </p>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {facilities.map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </section>

          <div className="flex justify-center gap-3">
            {page > 1 ? (
              <Button variant="outline" asChild>
                <Link
                  href={createPageHref(page - 1, {
                    q,
                    specialization,
                    facilityType,
                    city,
                    region,
                  })}
                >
                  Predchádzajúca
                </Link>
              </Button>
            ) : null}

            {hasNextPage ? (
              <Button variant="outline" asChild>
                <Link
                  href={createPageHref(page + 1, {
                    q,
                    specialization,
                    facilityType,
                    city,
                    region,
                  })}
                >
                  Ďalšia
                </Link>
              </Button>
            ) : null}
          </div>
        </>
      )}
    </main>
  );
}