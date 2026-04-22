"use client";

import { useState } from "react";
import { CheckCircle, FileCheck, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AdminGdprActionsProps =
  | {
      type: "export";
      requestId: string;
      currentStatus: string;
    }
  | {
      type: "deletion";
      requestId: string;
      currentStatus: string;
    };

export function AdminGdprActions(props: AdminGdprActionsProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function updateExportStatus(
    status: "processing" | "completed" | "failed" | "expired"
  ) {
    if (props.type !== "export") return;

    setMessage("");
    setSaving(true);

    const payload: Record<string, string | null> = {
      status,
      notes: notes.trim() || null,
    };

    if (status === "completed") {
      payload.completed_at = new Date().toISOString();
      payload.expires_at = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    const { error } = await supabase
      .from("gdpr_export_requests")
      .update(payload)
      .eq("id", props.requestId);

    setSaving(false);

    if (error) {
      setMessage(`Žiadosť sa nepodarilo upraviť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function updateDeletionStatus(status: "processing" | "rejected") {
    if (props.type !== "deletion") return;

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
        status,
        processed_by: user.id,
        processed_at: status === "rejected" ? new Date().toISOString() : null,
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
      "Naozaj chceš dokončiť anonymizáciu používateľa? Táto akcia anonymizuje profil a odpojí používateľské väzby na recenzie, fórum a ďalšie dáta."
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

  if (props.currentStatus === "completed" || props.currentStatus === "expired") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">Žiadosť je uzavretá.</p>
        <p className="mt-1">
          Ďalšia akcia už zvyčajne nie je potrebná. Záznam ostáva dostupný pre
          administrátorskú kontrolu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">Administrátorské akcie</p>
        <p className="mt-1 text-sm text-slate-600">
          Poznámku použi na interné zdôvodnenie spracovania žiadosti. Pri
          výmaze sa používateľské údaje anonymizujú, nie fyzicky mažú z celej
          histórie systému.
        </p>
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
        maxLength={800}
        placeholder="Interná poznámka k spracovaniu žiadosti..."
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
      />

      {props.type === "export" ? (
        <div className="grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => updateExportStatus("processing")}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Loader2 className="size-4" />
            Označiť ako spracovávané
          </button>

          <button
            type="button"
            onClick={() => updateExportStatus("completed")}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            <FileCheck className="size-4" />
            Označiť ako dokončené
          </button>

          <button
            type="button"
            onClick={() => updateExportStatus("failed")}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <XCircle className="size-4" />
            Označiť ako neúspešné
          </button>

          <button
            type="button"
            onClick={() => updateExportStatus("expired")}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Expirované
          </button>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          <button
            type="button"
            onClick={() => updateDeletionStatus("processing")}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Loader2 className="size-4" />
            Spracovávať
          </button>

          <button
            type="button"
            onClick={completeDeletionRequest}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            <CheckCircle className="size-4" />
            Dokončiť anonymizáciu
          </button>

          <button
            type="button"
            onClick={() => updateDeletionStatus("rejected")}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <XCircle className="size-4" />
            Zamietnuť
          </button>
        </div>
      )}

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}