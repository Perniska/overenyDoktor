"use client";

import { useState } from "react";
import { CheckCircle, CopyCheck, EyeOff, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type AdminReportActionsProps = {
  reportId: string;
  targetType: string;
  targetId: string;
  isResolved: boolean;
};

export function AdminReportActions({
  reportId,
  targetType,
  targetId,
  isResolved,
}: AdminReportActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function resolveReport(
    action: "no_action" | "invalid_report" | "duplicate"
  ) {
    setMessage("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Na vyriešenie nahlásenia sa musíš prihlásiť.");
      return;
    }

    const note =
      action === "no_action"
        ? "Nahlásenie bolo posúdené bez zásahu do obsahu."
        : action === "duplicate"
          ? "Nahlásenie bolo označené ako duplicitné."
          : "Nahlásenie bolo označené ako neopodstatnené.";

    const { error } = await supabase
      .from("reports")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_action: action,
        resolution_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    setSaving(false);

    if (error) {
      setMessage(`Nahlásenie sa nepodarilo vyriešiť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function hideReportedContent() {
    if (targetType !== "review") {
      setMessage("Zatiaľ je podporované skrývanie iba pri recenziách.");
      return;
    }

    const confirmed = window.confirm(
      "Naozaj chceš skryť túto recenziu z verejného zobrazenia? Recenzia sa nezmaže natvrdo, iba sa označí ako skrytá."
    );

    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Na skrytie obsahu sa musíš prihlásiť.");
      return;
    }

    const { error: reviewError } = await supabase
      .from("reviews")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId);

    if (reviewError) {
      setSaving(false);
      setMessage(`Recenziu sa nepodarilo skryť: ${reviewError.message}`);
      return;
    }

    const { error: reportError } = await supabase
      .from("reports")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_action: "content_hidden",
        resolution_note:
          "Nahlásená recenzia bola skrytá z verejného zobrazenia.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    setSaving(false);

    if (reportError) {
      setMessage(
        `Recenzia bola skrytá, ale nahlásenie sa nepodarilo uzavrieť: ${reportError.message}`
      );
      return;
    }

    router.refresh();
  }

  if (isResolved) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">Nahlásenie je vyriešené.</p>
        <p className="mt-1">
          Ďalšia akcia nie je potrebná. Rozhodnutie je uložené v databáze a
          auditované triggerom.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">Moderátorské rozhodnutie</p>
        <p className="mt-1 text-sm text-slate-600">
          Vyber akciu podľa toho, či nahlásenie vyžaduje zásah do obsahu.
          Skrytie recenzie používaj len vtedy, keď obsah porušuje pravidlá,
          obsahuje osobné/citlivé údaje alebo je zjavne nevhodný.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => resolveReport("no_action")}
          disabled={saving}
          className="rounded-xl border p-4 text-left transition hover:bg-slate-50 disabled:opacity-60"
        >
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <CheckCircle className="size-4 text-emerald-600" />
            Vyriešiť bez zásahu
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Použi, keď je recenzia vecná, neobsahuje citlivé údaje a netreba ju
            skrývať.
          </span>
        </button>

        <button
          type="button"
          onClick={hideReportedContent}
          disabled={saving}
          className="rounded-xl border border-red-200 p-4 text-left transition hover:bg-red-50 disabled:opacity-60"
        >
          <span className="flex items-center gap-2 font-semibold text-red-800">
            <EyeOff className="size-4" />
            Skryť recenziu
          </span>
          <span className="mt-1 block text-sm text-red-700">
            Použi, keď recenzia obsahuje osobné údaje, zdravotné údaje,
            urážlivý alebo zjavne problémový obsah.
          </span>
        </button>

        <button
          type="button"
          onClick={() => resolveReport("invalid_report")}
          disabled={saving}
          className="rounded-xl border p-4 text-left transition hover:bg-slate-50 disabled:opacity-60"
        >
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <XCircle className="size-4 text-slate-600" />
            Neopodstatnené
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Použi, keď nahlásenie nesúvisí s porušením pravidiel alebo je
            zjavne nesprávne.
          </span>
        </button>

        <button
          type="button"
          onClick={() => resolveReport("duplicate")}
          disabled={saving}
          className="rounded-xl border p-4 text-left transition hover:bg-slate-50 disabled:opacity-60"
        >
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <CopyCheck className="size-4 text-slate-600" />
            Duplicitné
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Použi, keď rovnaký obsah už bol nahlásený a riešený v inom podnete.
          </span>
        </button>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Poznámka ku GDPR</p>
        <p className="mt-1">
          Pri obsahu, ktorý obsahuje osobné údaje pacienta, lekára alebo
          zdravotné údaje, je bezpečnejšie recenziu skryť a ponechať
          dohľadateľný auditný záznam.
        </p>
      </div>

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      {saving ? (
        <p className="text-sm text-slate-500">Ukladá sa rozhodnutie...</p>
      ) : null}
    </div>
  );
}