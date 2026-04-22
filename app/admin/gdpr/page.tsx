import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, FileText, Filter, Shield, Trash2, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { AdminGdprActions } from "@/components/admin/AdminGdprActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminGdprPageProps = {
  searchParams: Promise<{
    tab?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getRequestStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    pending: "Čaká na spracovanie",
    processing: "Spracováva sa",
    completed: "Dokončené",
    rejected: "Zamietnuté",
    expired: "Expirované",
    failed: "Neúspešné",
  };

  return labels[status ?? ""] ?? "Neznámy stav";
}

function getTriggerLabel(trigger?: string | null) {
  const labels: Record<string, string> = {
    user_request: "Žiadosť používateľa",
    admin_action: "Administrátorský zásah",
    retention_policy: "Retenčná politika",
    account_deletion: "Odstránenie účtu",
  };

  return labels[trigger ?? ""] ?? "Neuvedené";
}

function createGdprHref(filters: {
  tab?: string;
  status?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.tab && filters.tab !== "deletion") {
    params.set("tab", filters.tab);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();

  return query ? `/admin/gdpr?${query}` : "/admin/gdpr";
}

function getProfileLabel(profileRelation: unknown) {
  const profile = getSingleRelation(profileRelation as any);

  if (!profile) {
    return "Neznámy alebo anonymizovaný používateľ";
  }

  return profile.username ?? "Používateľ bez mena";
}

export default async function AdminGdprPage({
  searchParams,
}: AdminGdprPageProps) {
  const auth = await requireAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/admin");
  }

  const params = await searchParams;

  const tab = getSingleParam(params.tab) ?? "deletion";
  const status = getSingleParam(params.status) ?? "all";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  let totalCount = 0;
  let totalPages = 1;
  let content: React.ReactNode = null;

  if (tab === "export") {
    let query = supabase
      .from("gdpr_export_requests")
      .select(
        `
        id,
        id_user,
        requested_at,
        status,
        download_url,
        expires_at,
        completed_at,
        notes,
        profile:profiles!gdpr_export_requests_id_user_fkey (
          id,
          username,
          deleted_at,
          anonymized_at
        )
      `,
        { count: "exact" }
      );

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order("requested_at", { ascending: false })
      .range(from, to);

    const requests = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4 text-red-700">
          Žiadosti o export sa nepodarilo načítať: {error.message}
        </CardContent>
      </Card>
    ) : requests.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-slate-600">
          Pre zadané filtre neexistujú žiadne žiadosti o export.
        </CardContent>
      </Card>
    ) : (
      <section className="space-y-4">
        {requests.map((request: any) => (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Žiadosť o export údajov
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Používateľ</p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    <User className="size-4" />
                    {getProfileLabel(request.profile)}
                  </p>
                </div>

                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Stav</p>
                  <p className="mt-1 font-semibold">
                    {getRequestStatusLabel(request.status)}
                  </p>
                </div>

                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Vytvorené</p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    <CalendarDays className="size-4" />
                    {new Date(request.requested_at).toLocaleDateString("sk-SK")}
                  </p>
                </div>
              </div>

              {request.notes ? (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  {request.notes}
                </div>
              ) : null}

              <AdminGdprActions
                type="export"
                requestId={request.id}
                currentStatus={request.status}
              />
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  if (tab === "deletion") {
    let query = supabase
      .from("data_deletion_requests")
      .select(
        `
        id,
        id_user,
        requested_at,
        reason,
        status,
        processed_at,
        processed_by,
        notes,
        profile:profiles!data_deletion_requests_id_user_fkey (
          id,
          username,
          deleted_at,
          anonymized_at
        ),
        processor:profiles!data_deletion_requests_processed_by_fkey (
          id,
          username
        )
      `,
        { count: "exact" }
      );

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order("requested_at", { ascending: false })
      .range(from, to);

    const requests = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4 text-red-700">
          Žiadosti o výmaz sa nepodarilo načítať: {error.message}
        </CardContent>
      </Card>
    ) : requests.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-slate-600">
          Pre zadané filtre neexistujú žiadne žiadosti o výmaz.
        </CardContent>
      </Card>
    ) : (
      <section className="space-y-4">
        {requests.map((request: any) => (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="size-5" />
                Žiadosť o výmaz alebo anonymizáciu
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Používateľ</p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    <User className="size-4" />
                    {getProfileLabel(request.profile)}
                  </p>
                </div>

                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Stav</p>
                  <p className="mt-1 font-semibold">
                    {getRequestStatusLabel(request.status)}
                  </p>
                </div>

                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm text-slate-500">Vytvorené</p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    <CalendarDays className="size-4" />
                    {new Date(request.requested_at).toLocaleDateString("sk-SK")}
                  </p>
                </div>
              </div>

              {request.reason ? (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Dôvod žiadosti</p>
                  <p className="mt-1">{request.reason}</p>
                </div>
              ) : null}

              {request.notes ? (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Poznámka</p>
                  <p className="mt-1">{request.notes}</p>
                </div>
              ) : null}

              <AdminGdprActions
                type="deletion"
                requestId={request.id}
                currentStatus={request.status}
              />
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  if (tab === "anonymization") {
    const { data, error, count } = await supabase
      .from("anonymization_log")
      .select(
        `
        id,
        id_user,
        anonymized_at,
        triggered_by,
        tables_affected,
        performed_by
      `,
        { count: "exact" }
      )
      .order("anonymized_at", { ascending: false })
      .range(from, to);

    const logs = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

    content = error ? (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4 text-red-700">
          Log anonymizácií sa nepodarilo načítať: {error.message}
        </CardContent>
      </Card>
    ) : logs.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-slate-600">
          Zatiaľ neexistujú žiadne záznamy anonymizácie.
        </CardContent>
      </Card>
    ) : (
      <section className="space-y-4">
        {logs.map((log: any) => (
          <Card key={log.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Záznam anonymizácie
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Anonymizované:{" "}
                {new Date(log.anonymized_at).toLocaleString("sk-SK")}
              </p>

              <p className="text-sm text-slate-600">
                Spúšťač: {getTriggerLabel(log.triggered_by)}
              </p>

              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Dotknuté tabuľky</p>
                <p className="mt-1">
                  {Array.isArray(log.tables_affected)
                    ? log.tables_affected.join(", ")
                    : "Neuvedené"}
                </p>
              </div>
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
          GDPR a ochrana údajov
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          GDPR žiadosti
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Táto časť slúži na spracovanie žiadostí o export údajov, výmaz alebo
          anonymizáciu účtu. Prístup má iba administrátor.
        </p>
      </section>

      <section className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Poznámka k implementácii</p>
        <p className="mt-1">
          Pri spracovaní žiadosti o výmaz sa používa kombinácia anonymizácie a
          obmedzeného uchovania nevyhnutných auditných záznamov. Používateľský profil
          sa anonymizuje a väzby na recenzie, fórum a nahlásenia sa odpoja. Auditné a
          anonymizačné logy ostávajú zachované iba v nevyhnutnom rozsahu a počas
          stanovenej retenčnej doby pre bezpečnostnú, právnu a administratívnu
          dohľadateľnosť.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Link href={createGdprHref({ tab: "deletion" })}>
          <Card className={tab === "deletion" ? "border-sky-300 bg-sky-50" : ""}>
            <CardContent className="py-4">
              <p className="font-semibold">Výmaz/anonymizácia</p>
              <p className="mt-1 text-sm text-slate-600">
                Žiadosti o odstránenie alebo anonymizáciu účtu.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={createGdprHref({ tab: "export" })}>
          <Card className={tab === "export" ? "border-sky-300 bg-sky-50" : ""}>
            <CardContent className="py-4">
              <p className="font-semibold">Export údajov</p>
              <p className="mt-1 text-sm text-slate-600">
                Žiadosti používateľov o prístup k vlastným údajom.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={createGdprHref({ tab: "anonymization" })}>
          <Card
            className={
              tab === "anonymization" ? "border-sky-300 bg-sky-50" : ""
            }
          >
            <CardContent className="py-4">
              <p className="font-semibold">Log anonymizácií</p>
              <p className="mt-1 text-sm text-slate-600">
                Záznamy o vykonaných anonymizáciách.
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      {tab !== "anonymization" ? (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="size-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Filtre</h2>
          </div>

          <form action="/admin/gdpr" className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="tab" value={tab} />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Stav
              </label>

              <select
                name="status"
                defaultValue={status}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Všetky stavy</option>
                <option value="pending">Čakajúce</option>
                <option value="processing">Spracovávané</option>
                <option value="completed">Dokončené</option>
                {tab === "deletion" ? (
                  <option value="rejected">Zamietnuté</option>
                ) : (
                  <>
                    <option value="failed">Neúspešné</option>
                    <option value="expired">Expirované</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Filtrovať
              </button>

              <Link
                href={createGdprHref({ tab })}
                className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Zrušiť
              </Link>
            </div>
          </form>
        </section>
      ) : null}

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
            <p className="mt-2 text-lg font-bold">
              {tab === "export"
                ? "Export údajov"
                : tab === "anonymization"
                  ? "Log anonymizácií"
                  : "Výmaz/anonymizácia"}
            </p>
          </CardContent>
        </Card>
      </section>

      {content}

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) =>
          createGdprHref({
            tab,
            status,
            page: pageNumber,
          })
        }
      />
    </main>
  );
}