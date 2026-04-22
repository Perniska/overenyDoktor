import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  Database,
  EyeOff,
  Filter,
  Stethoscope,
  Tag,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import {
  getDataQualityStatusLabel,
  getVerificationStatusLabel,
} from "@/lib/labels";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminDataPageProps = {
  searchParams: Promise<{
    tab?: string | string[];
    status?: string | string[];
    q?: string | string[];
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

function getTabLabel(tab: string) {
  const labels: Record<string, string> = {
    doctors: "Lekári",
    facilities: "Zariadenia",
    specializations: "Špecializácie",
    "facility-types": "Typy zariadení",
  };

  return labels[tab] ?? "Lekári";
}

function createDataHref(filters: {
  tab?: string;
  status?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.tab && filters.tab !== "doctors") {
    params.set("tab", filters.tab);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();

  return query ? `/admin/data?${query}` : "/admin/data";
}

export default async function AdminDataPage({
  searchParams,
}: AdminDataPageProps) {
  const auth = await requireAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/admin");
  }

  const params = await searchParams;

  const tab = getSingleParam(params.tab) ?? "doctors";
  const canFilterByStatus = tab === "doctors" || tab === "facilities";

  const status = canFilterByStatus
    ? getSingleParam(params.status) ?? "all"
    : "all";

  const q = getSingleParam(params.q)?.trim() ?? "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  let totalCount = 0;
  let totalPages = 1;
  let content: ReactNode = null;

  if (tab === "doctors") {
    let query = supabase
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
        deleted_at,
        created_at,
        last_checked_at,
        verified_at,
        verified_by,
        import_status,
        source_url,
        specialization:specialization!doctors_specialization_fkey (
          id,
          name,
          slug,
          category
        )
      `,
        { count: "exact" }
      );

    if (status === "visible") query = query.is("deleted_at", null);
    if (status === "hidden") query = query.not("deleted_at", "is", null);
    if (status === "verified") query = query.eq("verification_status", "verified");
    if (status === "pending") query = query.eq("verification_status", "pending");
    if (status === "needs_review") query = query.eq("verification_status", "needs_review");
    if (status === "current") query = query.eq("data_quality_status", "current");
    if (status === "outdated") query = query.eq("data_quality_status", "outdated");
    if (status === "reported") query = query.eq("data_quality_status", "reported");

    if (q) {
      const safeQ = q.replaceAll(",", " ");
      query = query.or(
        `first_name.ilike.%${safeQ}%,last_name.ilike.%${safeQ}%,raw_name.ilike.%${safeQ}%,identifier.ilike.%${safeQ}%`
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    const doctors = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4 text-red-700">
          Lekárov sa nepodarilo načítať: {error.message}
        </CardContent>
      </Card>
    ) : doctors.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-slate-600">
          Pre zadané filtre sa nenašli žiadni lekári.
        </CardContent>
      </Card>
    ) : (
      <section className="space-y-4">
        {doctors.map((doctor: any) => {
          const specialization = getSingleRelation(doctor.specialization);
          const isHidden = Boolean(doctor.deleted_at);

          return (
            <Card
              key={doctor.id}
              className={isHidden ? "border-red-200 bg-red-50/30" : ""}
            >
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Stethoscope className="size-5" />
                      {getDoctorName(doctor)}
                    </CardTitle>

                    <p className="mt-1 text-sm text-slate-600">
                      {specialization?.name ?? "Bez špecializácie"}
                    </p>

                    {doctor.identifier ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Identifikátor: {doctor.identifier}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {getVerificationStatusLabel(doctor.verification_status)}
                    </span>

                    <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                      {getDataQualityStatusLabel(doctor.data_quality_status)}
                    </span>

                    {isHidden ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                        <EyeOff className="size-4" />
                        Skrytý
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border bg-white p-3">
                    <p className="text-sm text-slate-500">Vytvorený záznam</p>
                    <p className="mt-1 font-semibold">
                      {new Date(doctor.created_at).toLocaleDateString("sk-SK")}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-white p-3">
                    <p className="text-sm text-slate-500">Overené</p>
                    <p className="mt-1 font-semibold">
                      {doctor.verified_at
                        ? new Date(doctor.verified_at).toLocaleDateString("sk-SK")
                        : "Zatiaľ nie"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-white p-3">
                    <p className="text-sm text-slate-500">Posledná kontrola</p>
                    <p className="mt-1 font-semibold">
                      {doctor.last_checked_at
                        ? new Date(doctor.last_checked_at).toLocaleDateString("sk-SK")
                        : "Nekontrolované"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/data/doctors/${doctor.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Spravovať záznam
                  </Link>

                  <Link
                    href={`/doctors/${doctor.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Verejný profil
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    );
  }

  if (tab === "facilities") {
    let query = supabase
      .from("facilities")
      .select(
        `
        id,
        name,
        provider_name,
        provider_ico,
        region,
        district,
        raw_address,
        verification_status,
        data_quality_status,
        deleted_at,
        created_at,
        last_checked_at,
        verified_at,
        verified_by,
        evuc_import_status,
        evuc_parse_status,
        source_url,
        facility_type:facility_type!facilities_id_facility_type_fkey (
          id,
          name,
          slug
        )
      `,
        { count: "exact" }
      );

    if (status === "visible") query = query.is("deleted_at", null);
    if (status === "hidden") query = query.not("deleted_at", "is", null);
    if (status === "verified") query = query.eq("verification_status", "verified");
    if (status === "pending") query = query.eq("verification_status", "pending");
    if (status === "needs_review") query = query.eq("verification_status", "needs_review");
    if (status === "current") query = query.eq("data_quality_status", "current");
    if (status === "outdated") query = query.eq("data_quality_status", "outdated");
    if (status === "reported") query = query.eq("data_quality_status", "reported");

    if (q) {
      const safeQ = q.replaceAll(",", " ");
      query = query.or(
        `name.ilike.%${safeQ}%,provider_name.ilike.%${safeQ}%,provider_ico.ilike.%${safeQ}%,raw_address.ilike.%${safeQ}%`
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    const facilities = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4 text-red-700">
          Zariadenia sa nepodarilo načítať: {error.message}
        </CardContent>
      </Card>
    ) : facilities.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-slate-600">
          Pre zadané filtre sa nenašli žiadne zariadenia.
        </CardContent>
      </Card>
    ) : (
      <section className="space-y-4">
        {facilities.map((facility: any) => {
          const facilityType = getSingleRelation(facility.facility_type);
          const isHidden = Boolean(facility.deleted_at);

          return (
            <Card
              key={facility.id}
              className={isHidden ? "border-red-200 bg-red-50/30" : ""}
            >
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Building2 className="size-5" />
                      {facility.name}
                    </CardTitle>

                    <p className="mt-1 text-sm text-slate-600">
                      {facilityType?.name ?? "Bez typu zariadenia"}
                    </p>

                    {facility.provider_name ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Poskytovateľ: {facility.provider_name}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {getVerificationStatusLabel(facility.verification_status)}
                    </span>

                    <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                      {getDataQualityStatusLabel(facility.data_quality_status)}
                    </span>

                    {isHidden ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                        <EyeOff className="size-4" />
                        Skryté
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border bg-white p-3">
                    <p className="text-sm text-slate-500">Región / okres</p>
                    <p className="mt-1 font-semibold">
                      {[facility.region, facility.district].filter(Boolean).join(" / ") ||
                        "Neuvedené"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-white p-3">
                    <p className="text-sm text-slate-500">Overené</p>
                    <p className="mt-1 font-semibold">
                      {facility.verified_at
                        ? new Date(facility.verified_at).toLocaleDateString("sk-SK")
                        : "Zatiaľ nie"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-white p-3">
                    <p className="text-sm text-slate-500">Posledná kontrola</p>
                    <p className="mt-1 font-semibold">
                      {facility.last_checked_at
                        ? new Date(facility.last_checked_at).toLocaleDateString("sk-SK")
                        : "Nekontrolované"}
                    </p>
                  </div>
                </div>

                {facility.raw_address ? (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    {facility.raw_address}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/data/facilities/${facility.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Spravovať záznam
                  </Link>

                  <Link
                    href={`/facilities/${facility.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Verejný profil
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    );
  }

  if (tab === "specializations") {
    let query = supabase
      .from("specialization")
      .select("id, name, slug, category", { count: "exact" });

    if (q) {
      const safeQ = q.replaceAll(",", " ");
      query = query.or(
        `name.ilike.%${safeQ}%,slug.ilike.%${safeQ}%,category.ilike.%${safeQ}%`
      );
    }

    const { data, error, count } = await query
      .order("name", { ascending: true })
      .range(from, to);

    const items = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4 text-red-700">
          Špecializácie sa nepodarilo načítať: {error.message}
        </CardContent>
      </Card>
    ) : items.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-slate-600">
          Pre zadané filtre sa nenašli žiadne špecializácie.
        </CardContent>
      </Card>
    ) : (
      <section className="space-y-4">
        {items.map((item: any) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Tag className="size-5" />
                {item.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Slug</p>
                  <p className="mt-1 font-semibold">{item.slug}</p>
                </div>

                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Kategória</p>
                  <p className="mt-1 font-semibold">
                    {item.category ?? "Neuvedené"}
                  </p>
                </div>
              </div>

              <Link
                href={`/admin/data/specializations/${item.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Upraviť špecializáciu
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  if (tab === "facility-types") {
    let query = supabase
      .from("facility_type")
      .select("id, name, slug, info", { count: "exact" });

    if (q) {
      const safeQ = q.replaceAll(",", " ");
      query = query.or(`name.ilike.%${safeQ}%,slug.ilike.%${safeQ}%`);
    }

    const { data, error, count } = await query
      .order("name", { ascending: true })
      .range(from, to);

    const items = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4 text-red-700">
          Typy zariadení sa nepodarilo načítať: {error.message}
        </CardContent>
      </Card>
    ) : items.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-slate-600">
          Pre zadané filtre sa nenašli žiadne typy zariadení.
        </CardContent>
      </Card>
    ) : (
      <section className="space-y-4">
        {items.map((item: any) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Database className="size-5" />
                {item.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Slug</p>
                  <p className="mt-1 font-semibold">
                    {item.slug ?? "Neuvedené"}
                  </p>
                </div>

                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Popis</p>
                  <p className="mt-1 font-semibold">
                    {item.info ?? "Neuvedené"}
                  </p>
                </div>
              </div>

              <Link
                href={`/admin/data/facility-types/${item.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Upraviť typ zariadenia
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Referenčné údaje
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Správa lekárov, zariadení a číselníkov
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Prehľad slúži iba na vyhľadanie a otvorenie konkrétneho záznamu.
          Samotná úprava sa robí až na detailnej stránke záznamu.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Link href={createDataHref({ tab: "doctors" })}>
          <Card className={tab === "doctors" ? "border-sky-300 bg-sky-50" : ""}>
            <CardContent className="py-4">
              <p className="font-semibold">Lekári</p>
              <p className="mt-1 text-sm text-slate-600">
                Overenie, stav dát a viditeľnosť.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={createDataHref({ tab: "facilities" })}>
          <Card className={tab === "facilities" ? "border-sky-300 bg-sky-50" : ""}>
            <CardContent className="py-4">
              <p className="font-semibold">Zariadenia</p>
              <p className="mt-1 text-sm text-slate-600">
                Kontrola zariadení a EVÚC importu.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={createDataHref({ tab: "specializations" })}>
          <Card className={tab === "specializations" ? "border-sky-300 bg-sky-50" : ""}>
            <CardContent className="py-4">
              <p className="font-semibold">Špecializácie</p>
              <p className="mt-1 text-sm text-slate-600">
                Číselník lekárskych špecializácií.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={createDataHref({ tab: "facility-types" })}>
          <Card className={tab === "facility-types" ? "border-sky-300 bg-sky-50" : ""}>
            <CardContent className="py-4">
              <p className="font-semibold">Typy zariadení</p>
              <p className="mt-1 text-sm text-slate-600">
                Číselník druhov zariadení.
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filtre</h2>
        </div>

        <form
          action="/admin/data"
          className={
            canFilterByStatus
              ? "grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
              : "grid gap-3 md:grid-cols-[1fr_2fr_auto]"
          }
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Typ údajov
            </label>

            <select
              name="tab"
              defaultValue={tab}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="doctors">Lekári</option>
              <option value="facilities">Zariadenia</option>
              <option value="specializations">Špecializácie</option>
              <option value="facility-types">Typy zariadení</option>
            </select>
          </div>

          {canFilterByStatus ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Stav
              </label>

              <select
                name="status"
                defaultValue={status}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Všetko</option>
                <option value="visible">Viditeľné</option>
                <option value="hidden">Skryté</option>
                <option value="verified">Overené</option>
                <option value="pending">Čaká na overenie</option>
                <option value="needs_review">Vyžaduje kontrolu</option>
                <option value="current">Aktuálne údaje</option>
                <option value="outdated">Zastarané údaje</option>
                <option value="reported">Nahlásený problém</option>
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vyhľadávanie
            </label>

            <input
              name="q"
              defaultValue={q}
              placeholder="názov, meno, identifikátor, slug..."
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Filtrovať
            </button>

            <Link
              href={createDataHref({ tab })}
              className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zrušiť
            </Link>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {canFilterByStatus ? (
            <>
              <Link
                href={createDataHref({ tab, status: "visible", q })}
                className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
              >
                Viditeľné
              </Link>

              <Link
                href={createDataHref({ tab, status: "hidden", q })}
                className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
              >
                Skryté
              </Link>

              <Link
                href={createDataHref({ tab, status: "needs_review", q })}
                className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
              >
                Vyžaduje kontrolu
              </Link>

              <Link
                href={createDataHref({ tab, status: "outdated", q })}
                className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
              >
                Zastarané
              </Link>
            </>
          ) : null}

          <Link
            href={createDataHref({ tab })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Reset filtrov
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Celkový počet podľa filtra</p>
            <p className="mt-2 text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Aktívna sekcia</p>
            <p className="mt-2 text-lg font-bold">{getTabLabel(tab)}</p>
          </CardContent>
        </Card>
      </section>

      {content}

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) =>
          createDataHref({
            tab,
            status,
            q,
            page: pageNumber,
          })
        }
      />
    </main>
  );
}