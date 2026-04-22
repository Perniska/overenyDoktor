"use client";

import { useState } from "react";
import { CheckCircle, Download, Loader2, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AdminGdprActionsProps =
  | {
      type: "export";
      requestId: string;
      status: string;
      downloadUrl?: string | null;
      expiresAt?: string | null;
    }
  | {
      type: "deletion";
      requestId: string;
      status: string;
      userId: string | null;
    };

export function AdminGdprActions(props: AdminGdprActionsProps) {
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isFinalStatus =
    props.status === "completed" ||
    props.status === "rejected" ||
    props.status === "failed" ||
    props.status === "expired";

  async function updateExportStatus(
    status: "processing" | "completed" | "failed" | "expired"
  ) {
    if (props.type !== "export") return;

    setMessage("");
    setSaving(true);

    if (status === "completed") {
      const { error } = await supabase.rpc(
        "admin_complete_gdpr_export_request",
        {
          p_request_id: props.requestId,
          p_notes: notes.trim() || null,
        }
      );

      setSaving(false);

      if (error) {
        setMessage(`Export sa nepodarilo vytvoriť: ${error.message}`);
        return;
      }

      router.refresh();
      return;
    }

    const { error } = await supabase
      .from("gdpr_export_requests")
      .update({
        status,
        notes: notes.trim() || null,
      })
      .eq("id", props.requestId);

    setSaving(false);

    if (error) {
      setMessage(`Žiadosť sa nepodarilo upraviť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function completeDeletionRequest() {
    if (props.type !== "deletion") return;

    const confirmed = window.confirm(
      "Naozaj chceš dokončiť anonymizáciu používateľa? Táto akcia anonymizuje profil, odpojí väzby na recenzie, fórum a nahlásenia a zapíše anonymizačný log."
    );

    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase.rpc("admin_complete_deletion_request", {
      p_request_id: props.requestId,
      p_notes: notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      setMessage(`Anonymizáciu sa nepodarilo dokončiť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function rejectDeletionRequest() {
    if (props.type !== "deletion") return;

    const confirmed = window.confirm(
      "Naozaj chceš zamietnuť túto žiadosť o výmaz/anonymizáciu?"
    );

    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Na spracovanie žiadosti sa musíš prihlásiť.");
      return;
    }

    const { error } = await supabase
      .from("data_deletion_requests")
      .update({
        status: "rejected",
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        notes: notes.trim() || "Žiadosť bola zamietnutá administrátorom.",
      })
      .eq("id", props.requestId);

    setSaving(false);

    if (error) {
      setMessage(`Žiadosť sa nepodarilo zamietnuť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  if (isFinalStatus) {
    return (
      <div className="rounded-2xl border bg-slate-50 p-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">
          Táto žiadosť je už uzavretá.
        </p>

        <p className="mt-1">
          Ďalšie spracovanie nie je dostupné. Výsledok ostáva uložený v databáze
          a príslušných logoch.
        </p>

        {props.type === "export" && props.downloadUrl ? (
          <a
            href={props.downloadUrl}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Download className="size-4" />
            Stiahnuť export
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
      <div>
        <p className="font-semibold text-slate-900">
          {props.type === "export"
            ? "Spracovanie exportu údajov"
            : "Spracovanie výmazu/anonymizácie"}
        </p>

        <p className="mt-1 text-sm text-slate-600">
          {props.type === "export"
            ? "Pri dokončení systém vytvorí JSON export používateľských údajov a nastaví odkaz na stiahnutie."
            : "Pri dokončení systém anonymizuje aplikačný profil používateľa, odpojí väzby a zapíše anonymizačný log."}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Poznámka k spracovaniu
        </label>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Voliteľná interná poznámka..."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />

        <p className="mt-1 text-xs text-slate-500">{notes.length}/1000</p>
      </div>

      {props.type === "export" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => updateExportStatus("processing")}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Loader2 className="size-4" />
            Označiť ako spracovávané
          </button>

          <button
            type="button"
            onClick={() => updateExportStatus("completed")}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            <CheckCircle className="size-4" />
            Vytvoriť export
          </button>

          <button
            type="button"
            onClick={() => updateExportStatus("failed")}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <XCircle className="size-4" />
            Označiť ako neúspešné
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={completeDeletionRequest}
            disabled={saving || !props.userId}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="size-4" />
            Dokončiť anonymizáciu
          </button>

          <button
            type="button"
            onClick={rejectDeletionRequest}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <XCircle className="size-4" />
            Zamietnuť žiadosť
          </button>
        </div>
      )}

      {saving ? (
        <p className="text-sm text-slate-500">Spracováva sa...</p>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}