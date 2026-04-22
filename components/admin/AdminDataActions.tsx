"use client";

import { useState } from "react";
import { Eye, EyeOff, RefreshCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type DataTableName = "doctors" | "facilities";

type AdminDataActionsProps = {
  tableName: DataTableName;
  recordId: string;
  isHidden: boolean;
  verificationStatus: string;
  dataQualityStatus: string;
};

const verificationOptions = [
  { value: "pending", label: "Čaká na overenie" },
  { value: "verified", label: "Overené" },
  { value: "rejected", label: "Zamietnuté" },
  { value: "needs_review", label: "Vyžaduje kontrolu" },
];

const qualityOptions = [
  { value: "unknown", label: "Neznámy stav" },
  { value: "current", label: "Aktuálne údaje" },
  { value: "outdated", label: "Zastarané údaje" },
  { value: "reported", label: "Nahlásený problém" },
];

export function AdminDataActions({
  tableName,
  recordId,
  isHidden,
  verificationStatus,
  dataQualityStatus,
}: AdminDataActionsProps) {
  const router = useRouter();

  const [selectedVerification, setSelectedVerification] =
    useState(verificationStatus);
  const [selectedQuality, setSelectedQuality] = useState(dataQualityStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  }

  async function saveStatuses() {
    setMessage("");
    setSaving(true);

    const userId = await getCurrentUserId();

    if (!userId) {
      setSaving(false);
      setMessage("Na uloženie zmien sa musíš prihlásiť.");
      return;
    }

    const payload: Record<string, string | null> = {
      verification_status: selectedVerification,
      data_quality_status: selectedQuality,
      last_checked_at: new Date().toISOString(),
    };

    if (
      selectedVerification === "verified" &&
      verificationStatus !== "verified"
    ) {
      payload.verified_at = new Date().toISOString();
      payload.verified_by = userId;
    }

    if (
      selectedVerification !== "verified" &&
      verificationStatus === "verified"
    ) {
      payload.verified_at = null;
      payload.verified_by = null;
    }

    const { error } = await supabase
      .from(tableName)
      .update(payload)
      .eq("id", recordId);

    setSaving(false);

    if (error) {
      setMessage(`Zmeny sa nepodarilo uložiť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function markVerifiedAndCurrent() {
    setMessage("");
    setSaving(true);

    const userId = await getCurrentUserId();

    if (!userId) {
      setSaving(false);
      setMessage("Na overenie záznamu sa musíš prihlásiť.");
      return;
    }

    const payload: Record<string, string> = {
      verification_status: "verified",
      data_quality_status: "current",
      verified_at: new Date().toISOString(),
      verified_by: userId,
      last_checked_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(tableName)
      .update(payload)
      .eq("id", recordId);

    setSaving(false);

    if (error) {
      setMessage(`Záznam sa nepodarilo označiť ako overený: ${error.message}`);
      return;
    }

    setSelectedVerification("verified");
    setSelectedQuality("current");
    router.refresh();
  }

  async function toggleHidden() {
    const confirmed = window.confirm(
      isHidden
        ? "Naozaj chceš obnoviť tento záznam do verejného zobrazenia?"
        : "Naozaj chceš skryť tento záznam z verejného zobrazenia?"
    );

    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from(tableName)
      .update({
        deleted_at: isHidden ? null : new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    setSaving(false);

    if (error) {
      setMessage(`Záznam sa nepodarilo upraviť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">Správa záznamu</p>
        <p className="mt-1 text-sm text-slate-600">
          Upravuješ jeden konkrétny záznam. Zmeny sa nevzťahujú na ostatných
          lekárov alebo zariadenia.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Stav overenia
          </label>

          <select
            value={selectedVerification}
            onChange={(event) => setSelectedVerification(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {verificationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Stav údajov
          </label>

          <select
            value={selectedQuality}
            onChange={(event) => setSelectedQuality(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {qualityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <button
          type="button"
          onClick={saveStatuses}
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Save className="size-4" />
          {saving ? "Ukladá sa..." : "Uložiť stav"}
        </button>

        <button
          type="button"
          onClick={markVerifiedAndCurrent}
          disabled={saving || isHidden}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          <RefreshCcw className="size-4" />
          Overené a aktuálne
        </button>

        <button
          type="button"
          onClick={toggleHidden}
          disabled={saving}
          className={
            isHidden
              ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          }
        >
          {isHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {isHidden ? "Obnoviť" : "Skryť"}
        </button>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Poznámka</p>
        <p className="mt-1">
          Tlačidlo „Overené a aktuálne“ nastaví záznam ako overený, uloží čas
          overenia a priradí aktuálneho administrátora ako osobu, ktorá záznam
          overila.
        </p>
      </div>

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}