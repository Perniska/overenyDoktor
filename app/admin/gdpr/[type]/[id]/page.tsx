import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { AdminGdprActions } from "@/components/admin/AdminGdprActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminGdprDetailPageProps = {
  params: Promise<{
    type: string;
    id: string;
  }>;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Neuvedené";
  return new Date(value).toLocaleString("sk-SK");
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

function getStatusClassName(status?: string | null) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "processing") {
    return "bg-sky-100 text-sky-800";
  }

  if (status === "rejected" || status === "failed" || status === "expired") {
    return "bg-red-100 text-red-800";
  }

  return "bg-amber-100 text-amber-800";
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

function getProfileLabel(profileRelation: unknown) {
  const profile = getSingleRelation(profileRelation as any);

  if (!profile) {
    return "Neznámy alebo anonymizovaný používateľ";
  }

  return profile.username ?? "Používateľ bez mena";
}

export default async function AdminGdprDetailPage({
  params,
}: AdminGdprDetailPageProps) {
  const auth = await requireAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/admin");
  }

  const { type, id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!["export", "deletion", "anonymization"].includes(type)) {
    notFound();
  }

  if (type === "export") {
    const { data, error } = await supabase
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
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      notFound();
    }

    const request = data as any;

    const { data: payload } = await supabase
      .from("gdpr_export_payloads")
      .select("request_id, created_at, expires_at")
      .eq("request_id", request.id)
      .maybeSingle();

    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link
          href="/admin/gdpr?tab=export"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          <ArrowLeft className="size-4" />
          Späť na GDPR žiadosti
        </Link>

        <section>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            GDPR export údajov
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Žiadosť o export používateľských údajov
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Po vytvorení exportu systém uloží JSON dáta a používateľ ich bude
            môcť stiahnuť cez odkaz na svojej GDPR stránke.
          </p>
        </section>

        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FileText className="size-6" />
                  Export údajov
                </CardTitle>

                <p className="mt-1 text-sm text-slate-500">
                  Vytvorené: {formatDateTime(request.requested_at)}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClassName(
                  request.status
                )}`}
              >
                {getRequestStatusLabel(request.status)}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Používateľ</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold">
                  <User className="size-4" />
                  {getProfileLabel(request.profile)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Dokončené</p>
                <p className="mt-1 font-semibold">
                  {formatDateTime(request.completed_at)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Platnosť exportu</p>
                <p className="mt-1 font-semibold">
                  {formatDateTime(request.expires_at)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <p className="font-semibold text-slate-900">Stav exportného súboru</p>

              {payload ? (
                <p className="mt-1 text-sm text-slate-700">
                  Exportný JSON bol vytvorený: {formatDateTime(payload.created_at)}.
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-700">
                  Exportný JSON zatiaľ nebol vytvorený.
                </p>
              )}

              {request.download_url ? (
                <a
                  href={request.download_url}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Download className="size-4" />
                  Stiahnuť export
                </a>
              ) : null}
            </div>

            {request.notes ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Poznámka</p>
                <p className="mt-1 whitespace-pre-wrap">{request.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <AdminGdprActions
          type="export"
          requestId={request.id}
          status={request.status}
          downloadUrl={request.download_url}
          expiresAt={request.expires_at}
        />
      </main>
    );
  }

  if (type === "deletion") {
    const { data, error } = await supabase
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
          is_banned,
          deleted_at,
          anonymized_at
        ),
        processor:profiles!data_deletion_requests_processed_by_fkey (
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

    const request = data as any;
    const profile = getSingleRelation(request.profile);
    const processor = getSingleRelation(request.processor);

    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link
          href="/admin/gdpr?tab=deletion"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          <ArrowLeft className="size-4" />
          Späť na GDPR žiadosti
        </Link>

        <section>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            GDPR výmaz/anonymizácia
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Žiadosť o výmaz alebo anonymizáciu
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Dokončenie žiadosti spustí anonymizáciu aplikačných údajov
            používateľa a vytvorí záznam v anonymizačnom logu.
          </p>
        </section>

        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Trash2 className="size-6" />
                  Výmaz/anonymizácia účtu
                </CardTitle>

                <p className="mt-1 text-sm text-slate-500">
                  Vytvorené: {formatDateTime(request.requested_at)}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClassName(
                  request.status
                )}`}
              >
                {getRequestStatusLabel(request.status)}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Používateľ</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold">
                  <User className="size-4" />
                  {profile?.username ?? "Neznámy používateľ"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Spracoval</p>
                <p className="mt-1 font-semibold">
                  {processor?.username ?? "Zatiaľ nikto"}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Spracované</p>
                <p className="mt-1 font-semibold">
                  {formatDateTime(request.processed_at)}
                </p>
              </div>
            </div>

            {profile ? (
              <div className="rounded-xl border bg-white p-4">
                <p className="font-semibold text-slate-900">
                  Aktuálny stav profilu
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-slate-500">Blokovaný</p>
                    <p className="mt-1 font-semibold">
                      {profile.is_banned ? "Áno" : "Nie"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Odstránený</p>
                    <p className="mt-1 font-semibold">
                      {profile.deleted_at ? formatDateTime(profile.deleted_at) : "Nie"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Anonymizovaný</p>
                    <p className="mt-1 font-semibold">
                      {profile.anonymized_at
                        ? formatDateTime(profile.anonymized_at)
                        : "Nie"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {request.reason ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Dôvod žiadosti</p>
                <p className="mt-1 whitespace-pre-wrap">{request.reason}</p>
              </div>
            ) : null}

            {request.notes ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Poznámka</p>
                <p className="mt-1 whitespace-pre-wrap">{request.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <AdminGdprActions
          type="deletion"
          requestId={request.id}
          status={request.status}
          userId={request.id_user}
        />
      </main>
    );
  }

  if (type === "anonymization") {
    const { data, error } = await supabase
      .from("anonymization_log")
      .select(
        `
        id,
        id_user,
        anonymized_at,
        triggered_by,
        tables_affected,
        performed_by
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      notFound();
    }

    const log = data as any;

    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link
          href="/admin/gdpr?tab=anonymization"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
        >
          <ArrowLeft className="size-4" />
          Späť na log anonymizácií
        </Link>

        <section>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Anonymizačný log
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Záznam anonymizácie
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Tento záznam slúži na dohľadateľnosť vykonanej anonymizácie.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Shield className="size-6" />
              Anonymizácia používateľa
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Anonymizované</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold">
                  <CalendarDays className="size-4" />
                  {formatDateTime(log.anonymized_at)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Spúšťač</p>
                <p className="mt-1 font-semibold">
                  {getTriggerLabel(log.triggered_by)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <p className="text-sm text-slate-500">Počet tabuliek</p>
                <p className="mt-1 font-semibold">
                  {Array.isArray(log.tables_affected)
                    ? log.tables_affected.length
                    : 0}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <p className="font-semibold text-slate-900">Dotknuté tabuľky</p>

              {Array.isArray(log.tables_affected) &&
              log.tables_affected.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {log.tables_affected.map((tableName: string) => (
                    <span
                      key={tableName}
                      className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                    >
                      {tableName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  Dotknuté tabuľky nie sú uvedené.
                </p>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Technické údaje</p>

              <div className="mt-2 space-y-1">
                <p>
                  ID anonymizovaného používateľa:{" "}
                  <span className="font-mono text-xs">{log.id_user}</span>
                </p>

                <p>
                  Vykonal:{" "}
                  <span className="font-mono text-xs">
                    {log.performed_by ?? "Neuvedené"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  notFound();
}