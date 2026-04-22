"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function UserGdprRequestActions() {
  const router = useRouter();

  const [reason, setReason] = useState("");
  const [savingExport, setSavingExport] = useState(false);
  const [savingDeletion, setSavingDeletion] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  async function createExportRequest() {
    setMessage("");
    setMessageType("info");
    setSavingExport(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSavingExport(false);
      setMessageType("error");
      setMessage("Pre vytvorenie žiadosti sa musíš prihlásiť.");
      return;
    }

    const { error } = await supabase.from("gdpr_export_requests").insert({
      id_user: user.id,
      status: "pending",
      notes: "Žiadosť vytvorená používateľom cez GDPR stránku.",
    });

    setSavingExport(false);

    if (error) {
      setMessageType("error");
      setMessage(`Žiadosť o export sa nepodarilo vytvoriť: ${error.message}`);
      return;
    }

    setMessageType("success");
    setMessage(
      "Žiadosť o export údajov bola vytvorená. Jej stav môžeš sledovať nižšie."
    );

    router.refresh();
  }

  async function createDeletionRequest() {
    const confirmed = window.confirm(
      "Naozaj chceš požiadať o výmaz alebo anonymizáciu účtu? Po spracovaní žiadosti môže dôjsť k anonymizácii profilu a odpojeniu väzieb na recenzie a fórum."
    );

    if (!confirmed) return;

    setMessage("");
    setMessageType("info");
    setSavingDeletion(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSavingDeletion(false);
      setMessageType("error");
      setMessage("Pre vytvorenie žiadosti sa musíš prihlásiť.");
      return;
    }

    const { error } = await supabase.from("data_deletion_requests").insert({
      id_user: user.id,
      reason: reason.trim() || null,
      status: "pending",
    });

    setSavingDeletion(false);

    if (error) {
      setMessageType("error");
      setMessage(`Žiadosť o výmaz sa nepodarilo vytvoriť: ${error.message}`);
      return;
    }

    setReason("");
    setMessageType("success");
    setMessage(
      "Žiadosť o výmaz alebo anonymizáciu účtu bola vytvorená. Administrátor ju spracuje."
    );

    router.refresh();
  }

  const messageClassName =
    messageType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : messageType === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Vytvoriť GDPR žiadosť
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Tu môžeš požiadať o export svojich údajov alebo o výmaz či
          anonymizáciu účtu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <Download className="mt-1 size-5 text-sky-700" />

            <div>
              <p className="font-semibold text-slate-900">
                Export osobných údajov
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Použi, ak chceš získať prehľad údajov, ktoré sú s tvojím účtom
                spojené.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={createExportRequest}
            disabled={savingExport}
            className="mt-4 min-h-11 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {savingExport ? "Odosiela sa..." : "Požiadať o export údajov"}
          </button>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <Trash2 className="mt-1 size-5 text-red-700" />

            <div>
              <p className="font-semibold text-red-950">
                Výmaz alebo anonymizácia účtu
              </p>

              <p className="mt-1 text-sm text-red-800">
                Použi, ak chceš požiadať o odstránenie alebo anonymizáciu údajov
                spojených s účtom.
              </p>
            </div>
          </div>

          <label
            htmlFor="deletion-reason"
            className="mt-4 block text-sm font-medium text-red-950"
          >
            Dôvod žiadosti
          </label>

          <textarea
            id="deletion-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Voliteľne uveď dôvod žiadosti..."
            className="mt-1 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-900"
          />

          <button
            type="button"
            onClick={createDeletionRequest}
            disabled={savingDeletion}
            className="mt-4 min-h-11 w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {savingDeletion
              ? "Odosiela sa..."
              : "Požiadať o výmaz/anonymizáciu"}
          </button>
        </div>
      </div>

      {message ? (
        <p className={`rounded-xl border px-3 py-3 text-sm ${messageClassName}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}