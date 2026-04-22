import Link from "next/link";
import { CalendarDays, Download, Shield, Trash2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserGdprRequestActions } from "@/components/gdpr/UserGdprRequestActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

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

export default async function GdprPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: exportRequests } = user
    ? await supabase
        .from("gdpr_export_requests")
        .select(
        `
        id,
        requested_at,
        status,
        completed_at,
        expires_at,
        download_url,
        notes
      `
      )
        .eq("id_user", user.id)
        .order("requested_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const { data: deletionRequests } = user
    ? await supabase
        .from("data_deletion_requests")
        .select(
          `
          id,
          requested_at,
          reason,
          status,
          processed_at,
          notes
        `
        )
        .eq("id_user", user.id)
        .order("requested_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Ochrana osobných údajov
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          GDPR a používateľské údaje
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Táto stránka slúži na vysvetlenie spracúvania údajov a na vytvorenie
          používateľských žiadostí o export, výmaz alebo anonymizáciu účtu.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="size-5" />
              Export údajov
            </CardTitle>
          </CardHeader>

          <CardContent className="text-sm text-slate-600">
            Používateľ môže požiadať o prehľad údajov, ktoré sú spojené s jeho
            účtom.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="size-5" />
              Výmaz a anonymizácia
            </CardTitle>
          </CardHeader>

          <CardContent className="text-sm text-slate-600">
            Pri žiadosti o výmaz sa osobné údaje odstránia alebo anonymizujú
            tam, kde už nie sú potrebné.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="size-5" />
              Audit a bezpečnosť
            </CardTitle>
          </CardHeader>

          <CardContent className="text-sm text-slate-600">
            Nevyhnutné auditné záznamy môžu byť uchované v obmedzenom rozsahu a
            po stanovenú retenčnú dobu.
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Ako systém spracúva žiadosť o výmaz</p>
        <p className="mt-1">
          Výmaz účtu neznamená automatické odstránenie každého historického
          záznamu. Systém odstráni alebo anonymizuje osobné údaje používateľa
          tam, kde už nie sú potrebné, a ponechá iba nevyhnutné technické alebo
          auditné údaje. Tieto údaje sú uchovávané v minimalizovanom rozsahu a
          po obmedzenú retenčnú dobu.
        </p>
      </section>

      {user ? (
        <UserGdprRequestActions />
      ) : (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Pre vytvorenie GDPR žiadosti sa musíš prihlásiť
            </h2>

            <p className="text-sm text-slate-600">
              Po prihlásení budeš môcť požiadať o export údajov alebo o
              výmaz/anonymizáciu účtu.
            </p>

            <div className="flex justify-center gap-3">
              <Link
                href="/auth/login"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Prihlásiť sa
              </Link>

              <Link
                href="/auth/register"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Registrovať sa
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {user ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Moje žiadosti o export údajov</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {(exportRequests ?? []).length === 0 ? (
                <p className="text-sm text-slate-600">
                  Zatiaľ nemáš žiadnu žiadosť o export údajov.
                </p>
              ) : (
                (exportRequests ?? []).map((request: any) => (
                  <div
                    key={request.id}
                    className="rounded-xl border bg-white p-4"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <CalendarDays className="size-4" />
                          {new Date(request.requested_at).toLocaleDateString(
                            "sk-SK"
                          )}
                        </p>

                        {request.notes ? (
                          <p className="mt-1 text-sm text-slate-600">
                            {request.notes}
                          </p>
                        ) : null}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClassName(
                          request.status
                        )}`}
                      >
                        {getRequestStatusLabel(request.status)}
                      </span>
                    </div>

                    {request.completed_at ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Dokončené:{" "}
                        {new Date(request.completed_at).toLocaleDateString(
                          "sk-SK"
                        )}
                      </p>
                    ) : null}

                    {request.expires_at ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Platnosť exportu do:{" "}
                        {new Date(request.expires_at).toLocaleDateString(
                          "sk-SK"
                        )}
                      </p>
                    ) : null}

                    {request.status === "completed" && request.download_url ? (
                    <a
                      href={request.download_url}
                      className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Stiahnuť export údajov
                    </a>
                  ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Moje žiadosti o výmaz/anonymizáciu</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {(deletionRequests ?? []).length === 0 ? (
                <p className="text-sm text-slate-600">
                  Zatiaľ nemáš žiadnu žiadosť o výmaz alebo anonymizáciu účtu.
                </p>
              ) : (
                (deletionRequests ?? []).map((request: any) => (
                  <div
                    key={request.id}
                    className="rounded-xl border bg-white p-4"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <CalendarDays className="size-4" />
                          {new Date(request.requested_at).toLocaleDateString(
                            "sk-SK"
                          )}
                        </p>

                        {request.reason ? (
                          <p className="mt-1 text-sm text-slate-600">
                            Dôvod: {request.reason}
                          </p>
                        ) : null}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClassName(
                          request.status
                        )}`}
                      >
                        {getRequestStatusLabel(request.status)}
                      </span>
                    </div>

                    {request.processed_at ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Spracované:{" "}
                        {new Date(request.processed_at).toLocaleDateString(
                          "sk-SK"
                        )}
                      </p>
                    ) : null}

                    {request.notes ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Poznámka: {request.notes}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}