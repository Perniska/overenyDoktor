import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  CalendarDays,
  Database,
  Filter,
  Shield,
  User,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminAuditPageProps = {
  searchParams: Promise<{
    table?: string | string[];
    action?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

type AuditProfileRelation = {
  id: string;
  username: string;
};

type AuditLogRow = {
  id: string;
  id_user: string | null;
  created_at: string;
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  action: string;
  retain_until: string | null;
  profile?: AuditProfileRelation | AuditProfileRelation[] | null;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuditActionLabel(action?: string | null) {
  const labels: Record<string, string> = {
    review_created: "Vytvorenie recenzie",
    review_updated: "Úprava recenzie",
    review_deleted: "Skrytie alebo odstránenie recenzie",
    review_hard_deleted: "Trvalé odstránenie recenzie",

    report_created: "Vytvorenie nahlásenia",
    report_updated: "Úprava nahlásenia",
    report_resolved: "Vyriešenie nahlásenia",
    report_deleted: "Odstránenie nahlásenia",

    profile_admin_updated: "Administrátorská zmena profilu",

    forum_topic_created: "Vytvorenie témy vo fóre",
    forum_topic_updated: "Úprava témy vo fóre",
    forum_topic_deleted: "Odstránenie témy vo fóre",

    forum_comment_created: "Vytvorenie komentára",
    forum_comment_updated: "Úprava komentára",
    forum_comment_deleted: "Odstránenie komentára",
  };

  return labels[action ?? ""] ?? action ?? "Neznáma akcia";
}

function getTableLabel(tableName?: string | null) {
  const labels: Record<string, string> = {
    reviews: "Recenzie",
    reports: "Nahlásenia",
    profiles: "Používatelia",
    forum_topics: "Témy vo fóre",
    forum_comments: "Komentáre vo fóre",
    doctors: "Lekári",
    facilities: "Zariadenia",
  };

  return labels[tableName ?? ""] ?? tableName ?? "Neznáma tabuľka";
}

function getChangedFields(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
) {
  if (!oldData || !newData) {
    return [];
  }

  const keys = Array.from(
    new Set([...Object.keys(oldData), ...Object.keys(newData)])
  );

  return keys.filter((key) => {
    return JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]);
  });
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function createAuditHref(filters: {
  table?: string;
  action?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.table && filters.table !== "all") {
    params.set("table", filters.table);
  }

  if (filters.action && filters.action !== "all") {
    params.set("action", filters.action);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();

  return query ? `/admin/audit?${query}` : "/admin/audit";
}

export default async function AdminAuditPage({
  searchParams,
}: AdminAuditPageProps) {
  const auth = await requireAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/admin");
  }

  const params = await searchParams;

  const table = getSingleParam(params.table) ?? "all";
  const action = getSingleParam(params.action) ?? "all";
  const q = getSingleParam(params.q)?.trim() ?? "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  let auditQuery = supabase
    .from("audit_logs")
    .select(
      `
      id,
      id_user,
      created_at,
      table_name,
      record_id,
      old_data,
      new_data,
      ip_address,
      action,
      retain_until,
      profile:profiles!audit_logs_id_user_fkey (
        id,
        username
      )
    `,
      { count: "exact" }
    );

  if (table !== "all") {
    auditQuery = auditQuery.eq("table_name", table);
  }

  if (action !== "all") {
    auditQuery = auditQuery.eq("action", action);
  }

  if (q) {
    auditQuery = auditQuery.or(
      `table_name.ilike.%${q}%,action.ilike.%${q}%,record_id.eq.${q}`
    );
  }

  const { data, error, count } = await auditQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  const logs = ((data ?? []) as unknown) as AuditLogRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const sensitiveCountOnPage = logs.filter((log) =>
    ["profiles", "reviews", "reports"].includes(log.table_name)
  ).length;

  const userActionsOnPage = logs.filter((log) => log.id_user).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Audit a dohľadateľnosť
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Audit logy
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Táto stránka slúži na administrátorskú kontrolu citlivých zmien v
          systéme. Audit logy pomáhajú spätne overiť, kto a kedy vykonal zásah
          do recenzií, nahlásení, používateľov alebo ďalších dôležitých údajov.
        </p>
      </section>

      <section className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Poznámka ku GDPR</p>
        <p className="mt-1">
          Auditné záznamy by mali obsahovať iba nevyhnutné technické a
          organizačné údaje. Citlivý text recenzií sa do audit logu neukladá v
          plnom znení, aby sa minimalizovalo riziko nadmerného spracúvania
          osobných údajov.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Celkový počet podľa filtra</p>
            <p className="mt-2 text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">
              Citlivé tabuľky na tejto strane
            </p>
            <p className="mt-2 text-2xl font-bold">{sensitiveCountOnPage}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">
              Akcie s používateľom na tejto strane
            </p>
            <p className="mt-2 text-2xl font-bold">{userActionsOnPage}</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filtre</h2>
        </div>

        <form
          action="/admin/audit"
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tabuľka
            </label>

            <select
              name="table"
              defaultValue={table}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetky tabuľky</option>
              <option value="reviews">Recenzie</option>
              <option value="reports">Nahlásenia</option>
              <option value="profiles">Používatelia</option>
              <option value="forum_topics">Témy vo fóre</option>
              <option value="forum_comments">Komentáre vo fóre</option>
              <option value="doctors">Lekári</option>
              <option value="facilities">Zariadenia</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Akcia
            </label>

            <select
              name="action"
              defaultValue={action}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetky akcie</option>
              <option value="review_created">Vytvorenie recenzie</option>
              <option value="review_updated">Úprava recenzie</option>
              <option value="review_deleted">Skrytie recenzie</option>
              <option value="report_created">Vytvorenie nahlásenia</option>
              <option value="report_resolved">Vyriešenie nahlásenia</option>
              <option value="profile_admin_updated">
                Administrátorská zmena profilu
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vyhľadávanie
            </label>

            <input
              name="q"
              defaultValue={q}
              placeholder="tabuľka, akcia alebo presné ID záznamu..."
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
              href="/admin/audit"
              className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zrušiť
            </Link>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href={createAuditHref({ table: "reviews", action, q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Recenzie
          </Link>

          <Link
            href={createAuditHref({ table: "reports", action, q })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Nahlásenia
          </Link>

          <Link
            href={createAuditHref({
              table,
              action: "profile_admin_updated",
              q,
            })}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Zmeny profilov
          </Link>

          <Link
            href="/admin/audit"
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Reset filtrov
          </Link>
        </div>
      </section>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Audit logy sa nepodarilo načítať: {error.message}
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            Pre zadané filtre sa nenašli žiadne auditné záznamy.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {logs.map((log) => {
            const profile = getSingleRelation(log.profile);
            const changedFields = getChangedFields(log.old_data, log.new_data);

            return (
              <Card key={log.id}>
                <CardHeader>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Activity className="size-5" />
                        {getAuditActionLabel(log.action)}
                      </CardTitle>

                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(log.created_at).toLocaleString("sk-SK")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        <Database className="size-4" />
                        {getTableLabel(log.table_name)}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                        <Shield className="size-4" />
                        Audit
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-sm text-slate-500">Používateľ</p>
                      <p className="mt-1 flex items-center gap-1.5 font-semibold">
                        <User className="size-4" />
                        {profile?.username ?? "Systém alebo neznámy používateľ"}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-sm text-slate-500">ID záznamu</p>
                      <p className="mt-1 break-all font-mono text-xs">
                        {log.record_id}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-sm text-slate-500">Uchovať do</p>
                      <p className="mt-1 flex items-center gap-1.5 font-semibold">
                        <CalendarDays className="size-4" />
                        {log.retain_until
                          ? new Date(log.retain_until).toLocaleDateString(
                              "sk-SK"
                            )
                          : "Neuvedené"}
                      </p>
                    </div>
                  </div>

                  {changedFields.length > 0 ? (
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">
                        Zmenené polia
                      </p>

                      <div className="mt-3 space-y-2">
                        {changedFields.map((field) => (
                          <div
                            key={field}
                            className="grid gap-2 rounded-lg bg-white p-3 text-sm md:grid-cols-[160px_1fr_1fr]"
                          >
                            <p className="font-medium text-slate-800">
                              {field}
                            </p>

                            <p className="wrap-break-word text-slate-500">
                              Pred: {formatValue(log.old_data?.[field])}
                            </p>

                            <p className="wrap-break-word text-slate-700">
                              Po: {formatValue(log.new_data?.[field])}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                      Tento záznam neobsahuje porovnateľné polia pred a po
                      zmene. Môže ísť o vytvorenie alebo odstránenie záznamu.
                    </div>
                  )}

                  <details className="rounded-xl border bg-white p-4">
                    <summary className="cursor-pointer font-semibold text-slate-900">
                      Technické dáta auditného záznamu
                    </summary>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Pôvodné dáta
                        </p>
                        <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                          {JSON.stringify(log.old_data, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Nové dáta
                        </p>
                        <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                          {JSON.stringify(log.new_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) =>
          createAuditHref({
            table,
            action,
            q,
            page: pageNumber,
          })
        }
      />
    </main>
  );
}