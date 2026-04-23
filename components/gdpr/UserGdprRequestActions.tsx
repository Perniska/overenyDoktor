"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { guardClientWriteAction } from "@/lib/profile/clientActionGuard";

export function UserGdprRequestActions() {
  const router = useRouter();

  const [reason, setReason] = useState("");
  const [savingExport, setSavingExport] = useState(false);
  const [savingDeletion, setSavingDeletion] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  function setError(text: string) {
    setMessageType("error");
    setMessage(text);
  }

  function setSuccess(text: string) {
    setMessageType("success");
    setMessage(text);
  }

  async function createExportRequest() {
    setMessage("");
    setMessageType("info");
    setSavingExport(true);

    const guard = await guardClientWriteAction();

    if (!guard.allowed || !guard.userId) {
      setSavingExport(false);
      setError(guard.message ?? "Žiadosť sa nepodarilo vytvoriť.");
      return;
    }

    const { data: existingOpenRequest, error: existingError } = await supabase
      .from("gdpr_export_requests")
      .select("id, status")
      .eq("id_user", guard.userId)
      .in("status", ["pending", "processing"])
      .limit(1)
      .maybeSingle();

    if (existingError) {
      setSavingExport(false);
      setError(`Nepodarilo sa overiť existujúce žiadosti: ${existingError.message}`);
      return;
    }

    if (existingOpenRequest) {
      setSavingExport(false);
      setError(
        "Už máš otvorenú žiadosť o export údajov. Počkaj na jej spracovanie."
      );
      return;
    }

    const { error } = await supabase.from("gdpr_export_requests").insert({
      id_user: guard.userId,
      status: "pending",
      notes: "Žiadosť vytvorená používateľom cez GDPR stránku.",
    });

    setSavingExport(false);

    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        setError(
          "Už máš otvorenú žiadosť o export údajov. Počkaj na jej spracovanie."
        );
        return;
      }

      setError(`Žiadosť o export sa nepodarilo vytvoriť: ${error.message}`);
      return;
    }

    setSuccess(
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

    const guard = await guardClientWriteAction();

    if (!guard.allowed || !guard.userId) {
      setSavingDeletion(false);
      setError(guard.message ?? "Žiadosť sa nepodarilo vytvoriť.");
      return;
    }

    const { data: existingOpenRequest, error: existingError } = await supabase
      .from("data_deletion_requests")
      .select("id, status")
      .eq("id_user", guard.userId)
      .in("status", ["pending", "processing"])
      .limit(1)
      .maybeSingle();

    if (existingError) {
      setSavingDeletion(false);
      setError(`Nepodarilo sa overiť existujúce žiadosti: ${existingError.message}`);
      return;
    }

    if (existingOpenRequest) {
      setSavingDeletion(false);
      setError(
        "Už máš otvorenú žiadosť o výmaz alebo anonymizáciu. Počkaj na jej spracovanie."
      );
      return;
    }

    const { error } = await supabase.from("data_deletion_requests").insert({
      id_user: guard.userId,
      reason: reason.trim() || null,
      status: "pending",
    });

    setSavingDeletion(false);

    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        setError(
          "Už máš otvorenú žiadosť o výmaz alebo anonymizáciu. Počkaj na jej spracovanie."
        );
        return;
      }

      setError(`Žiadosť o výmaz sa nepodarilo vytvoriť: ${error.message}`);
      return;
    }

    setReason("");
    setSuccess(
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
        <h2 className="text-lg font-semibold text-slate-900">
          Vytvoriť GDPR žiadosť
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Tu môžeš požiadať o export svojich údajov alebo o výmaz či anonymizáciu účtu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Download className="size-5 text-sky-700" />
            <h3 className="font-semibold text-slate-900">Export osobných údajov</h3>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Použi, ak chceš získať prehľad údajov, ktoré sú s tvojím účtom spojené.
          </p>

          <button
            type="button"
            onClick={createExportRequest}
            disabled={savingExport}
            className="mt-4 min-h-11 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {savingExport ? "Odosiela sa..." : "Požiadať o export údajov"}
          </button>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
          <div className="flex items-center gap-2">
            <Trash2 className="size-5 text-red-700" />
            <h3 className="font-semibold text-slate-900">
              Výmaz alebo anonymizácia účtu
            </h3>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Použi, ak chceš požiadať o odstránenie alebo anonymizáciu údajov spojených s účtom.
          </p>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Dôvod žiadosti
          </label>

          <textarea
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
            {savingDeletion ? "Odosiela sa..." : "Požiadať o výmaz/anonymizáciu"}
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