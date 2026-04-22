import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Database,
  EyeOff,
  ShieldCheck,
  Stethoscope,
  Tag,
  UserCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import {
  getDataQualityStatusLabel,
  getVerificationStatusLabel,
} from "@/lib/labels";
import { AdminDataActions } from "@/components/admin/AdminDataActions";
import { AdminReferenceActions } from "@/components/admin/AdminReferenceActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminDataDetailPageProps = {
  params: Promise<{
    type: string;
    id: string;
  }>;
};

function getDoctorName(doctor: any) {
  return [doctor.title, doctor.first_name, doctor.last_name]
    .filter(Boolean)
    .join(" ");
}

function getBackHref(type: string) {
  if (type === "facilities") return "/admin/data?tab=facilities";
  if (type === "specializations") return "/admin/data?tab=specializations";
  if (type === "facility-types") return "/admin/data?tab=facility-types";

  return "/admin/data";
}

function formatDate(value?: string | null) {
  if (!value) return "Neuvedené";

  return new Date(value).toLocaleDateString("sk-SK");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Neuvedené";

  return new Date(value).toLocaleString("sk-SK");
}

export default async function AdminDataDetailPage({
  params,
}: AdminDataDetailPageProps) {
  const auth = await requireAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/admin");
  }

  const { type, id } = await params;

  const allowedTypes = [
    "doctors",
    "facilities",
    "specializations",
    "facility-types",
  ];

  if (!allowedTypes.includes(type)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  if (type === "doctors") {
    const { data, error } = await supabase
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
        verification_source,
        source_url,
        raw_name,
        source_page_id,
        specialization:specialization!doctors_specialization_fkey (
          id,
          name,
          slug,
          category
        ),
        verified_by_profile:profiles!doctors_verified_by_fkey (
          id,
          username
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      notFound();
    }

    const doctor = data as any;
    const specialization = getSingleRelation(doctor.specialization);
    const verifiedBy = getSingleRelation(doctor.verified_by_profile);
    const isHidden = Boolean(doctor.deleted_at);

    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link
          href={getBackHref(type)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          <ArrowLeft className="size-4" />
          Späť na referenčné údaje
        </Link>

        <section>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Správa lekára
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {getDoctorName(doctor) || doctor.raw_name || "Lekár"}
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Na tejto stránke upravuješ iba jeden konkrétny záznam lekára.
            Zmeny sa nevzťahujú na ostatné záznamy.
          </p>
        </section>

        <Card className={isHidden ? "border-red-200 bg-red-50/30" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="size-5" />
              Základné údaje lekára
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Meno</p>
                <p className="mt-1 font-semibold">
                  {getDoctorName(doctor) || "Neuvedené"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Pôvodný názov z importu</p>
                <p className="mt-1 font-semibold">
                  {doctor.raw_name ?? "Neuvedené"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Špecializácia</p>
                <p className="mt-1 font-semibold">
                  {specialization?.name ?? "Bez špecializácie"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Identifikátor</p>
                <p className="mt-1 font-semibold">
                  {doctor.identifier ?? "Neuvedené"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Stav overenia</p>
                <p className="mt-1 font-semibold">
                  {getVerificationStatusLabel(doctor.verification_status)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Stav údajov</p>
                <p className="mt-1 font-semibold">
                  {getDataQualityStatusLabel(doctor.data_quality_status)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Viditeľnosť</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold">
                  {isHidden ? (
                    <>
                      <EyeOff className="size-4 text-red-600" />
                      Skrytý
                    </>
                  ) : (
                    "Viditeľný"
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Vytvorený záznam</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold">
                  <CalendarDays className="size-4" />
                  {formatDate(doctor.created_at)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Posledná kontrola</p>
                <p className="mt-1 font-semibold">
                  {formatDateTime(doctor.last_checked_at)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Import</p>
                <p className="mt-1 font-semibold">
                  {doctor.import_status ?? "Neuvedené"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="size-5 text-emerald-700" />
                Informácie o overení
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-500">Overené dňa</p>
                  <p className="mt-1 font-semibold">
                    {formatDateTime(doctor.verified_at)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Overil</p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    <UserCircle className="size-4" />
                    {verifiedBy?.username ?? "Neuvedené"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Zdroj overenia</p>
                  <p className="mt-1 font-semibold">
                    {doctor.verification_source ?? "Neuvedené"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/doctors/${doctor.id}`}
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Otvoriť verejný profil
              </Link>

              {doctor.source_url ? (
                <a
                  href={doctor.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Zdroj údajov
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <AdminDataActions
          tableName="doctors"
          recordId={doctor.id}
          isHidden={isHidden}
          verificationStatus={doctor.verification_status}
          dataQualityStatus={doctor.data_quality_status}
        />
      </main>
    );
  }

  if (type === "facilities") {
    const { data, error } = await supabase
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
        evuc_identifier,
        evuc_page_id,
        evuc_import_status,
        evuc_parse_status,
        source_url,
        website_url,
        facility_kind,
        primary_specialization,
        insurance_companies,
        office_hours,
        facility_type:facility_type!facilities_id_facility_type_fkey (
          id,
          name,
          slug
        ),
        verified_by_profile:profiles!facilities_verified_by_fkey (
          id,
          username
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      notFound();
    }

    const facility = data as any;
    const facilityType = getSingleRelation(facility.facility_type);
    const verifiedBy = getSingleRelation(facility.verified_by_profile);
    const isHidden = Boolean(facility.deleted_at);

    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link
          href={getBackHref(type)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          <ArrowLeft className="size-4" />
          Späť na referenčné údaje
        </Link>

        <section>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Správa zariadenia
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {facility.name}
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Na tejto stránke upravuješ iba jeden konkrétny záznam
            zdravotníckeho zariadenia.
          </p>
        </section>

        <Card className={isHidden ? "border-red-200 bg-red-50/30" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Základné údaje zariadenia
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Názov</p>
                <p className="mt-1 font-semibold">{facility.name}</p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Typ zariadenia</p>
                <p className="mt-1 font-semibold">
                  {facilityType?.name ?? "Bez typu zariadenia"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Poskytovateľ</p>
                <p className="mt-1 font-semibold">
                  {facility.provider_name ?? "Neuvedené"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">IČO poskytovateľa</p>
                <p className="mt-1 font-semibold">
                  {facility.provider_ico ?? "Neuvedené"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Región / okres</p>
                <p className="mt-1 font-semibold">
                  {[facility.region, facility.district]
                    .filter(Boolean)
                    .join(" / ") || "Neuvedené"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Druh zariadenia</p>
                <p className="mt-1 font-semibold">
                  {facility.facility_kind ?? "Neuvedené"}
                </p>
              </div>
            </div>

            {facility.raw_address ? (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Adresa</p>
                <p className="mt-1">{facility.raw_address}</p>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Stav overenia</p>
                <p className="mt-1 font-semibold">
                  {getVerificationStatusLabel(facility.verification_status)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Stav údajov</p>
                <p className="mt-1 font-semibold">
                  {getDataQualityStatusLabel(facility.data_quality_status)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Viditeľnosť</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold">
                  {isHidden ? (
                    <>
                      <EyeOff className="size-4 text-red-600" />
                      Skryté
                    </>
                  ) : (
                    "Viditeľné"
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Vytvorený záznam</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold">
                  <CalendarDays className="size-4" />
                  {formatDate(facility.created_at)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Posledná kontrola</p>
                <p className="mt-1 font-semibold">
                  {formatDateTime(facility.last_checked_at)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">EVÚC import</p>
                <p className="mt-1 font-semibold">
                  {facility.evuc_import_status ?? "Neuvedené"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="size-5 text-emerald-700" />
                Informácie o overení
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-500">Overené dňa</p>
                  <p className="mt-1 font-semibold">
                    {formatDateTime(facility.verified_at)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Overil</p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    <UserCircle className="size-4" />
                    {verifiedBy?.username ?? "Neuvedené"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">EVÚC identifikátor</p>
                  <p className="mt-1 font-semibold">
                    {facility.evuc_identifier ?? "Neuvedené"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Doplňujúce údaje</p>

              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <p>
                  Primárna špecializácia:{" "}
                  <span className="font-semibold">
                    {facility.primary_specialization ?? "Neuvedené"}
                  </span>
                </p>

                <p>
                  Parsovanie EVÚC:{" "}
                  <span className="font-semibold">
                    {facility.evuc_parse_status ?? "Neuvedené"}
                  </span>
                </p>

                <p>
                  Poisťovne:{" "}
                  <span className="font-semibold">
                    {Array.isArray(facility.insurance_companies)
                      ? facility.insurance_companies.join(", ")
                      : "Neuvedené"}
                  </span>
                </p>

                <p>
                  Web:{" "}
                  <span className="font-semibold">
                    {facility.website_url ?? "Neuvedené"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/facilities/${facility.id}`}
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Otvoriť verejný profil
              </Link>

              {facility.source_url ? (
                <a
                  href={facility.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Zdroj údajov
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <AdminDataActions
          tableName="facilities"
          recordId={facility.id}
          isHidden={isHidden}
          verificationStatus={facility.verification_status}
          dataQualityStatus={facility.data_quality_status}
        />
      </main>
    );
  }

  if (type === "specializations") {
    const { data, error } = await supabase
      .from("specialization")
      .select("id, name, slug, category")
      .eq("id", id)
      .single();

    if (error || !data) {
      notFound();
    }

    const item = data as any;

    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link
          href={getBackHref(type)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          <ArrowLeft className="size-4" />
          Späť na referenčné údaje
        </Link>

        <section>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Správa špecializácie
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {item.name}
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Tu upravuješ iba jeden konkrétny číselníkový záznam.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="size-5" />
              Aktuálne údaje špecializácie
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Názov</p>
                <p className="mt-1 font-semibold">{item.name}</p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Slug</p>
                <p className="mt-1 font-semibold">{item.slug}</p>
              </div>

              <div className="rounded-xl border bg-white p-3 md:col-span-2">
                <p className="text-sm text-slate-500">Kategória</p>
                <p className="mt-1 font-semibold">
                  {item.category ?? "Neuvedené"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <AdminReferenceActions
          tableName="specialization"
          recordId={item.id}
          initialName={item.name}
          initialSlug={item.slug}
          initialCategory={item.category}
        />
      </main>
    );
  }

  if (type === "facility-types") {
    const { data, error } = await supabase
      .from("facility_type")
      .select("id, name, slug, info")
      .eq("id", id)
      .single();

    if (error || !data) {
      notFound();
    }

    const item = data as any;

    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link
          href={getBackHref(type)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          <ArrowLeft className="size-4" />
          Späť na referenčné údaje
        </Link>

        <section>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Správa typu zariadenia
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {item.name}
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Tu upravuješ iba jeden konkrétny číselníkový záznam.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Aktuálne údaje typu zariadenia
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Názov</p>
                <p className="mt-1 font-semibold">{item.name}</p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Slug</p>
                <p className="mt-1 font-semibold">
                  {item.slug ?? "Neuvedené"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3 md:col-span-2">
                <p className="text-sm text-slate-500">Popis</p>
                <p className="mt-1 font-semibold">
                  {item.info ?? "Neuvedené"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <AdminReferenceActions
          tableName="facility_type"
          recordId={item.id}
          initialName={item.name}
          initialSlug={item.slug}
          initialInfo={item.info}
        />
      </main>
    );
  }

  notFound();
}