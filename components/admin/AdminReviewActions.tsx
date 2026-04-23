"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AdminReviewActionsProps = {
  reviewId: string;
  isHidden: boolean;
  status?: string | null;
};

export function AdminReviewActions({
  reviewId,
  isHidden,
  status,
}: AdminReviewActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function approveReview() {
    const confirmed = window.confirm(
      "Naozaj chceš túto recenziu schváliť a zverejniť?"
    );
    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("reviews")
      .update({
        status: "approved",
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    setSaving(false);

    if (error) {
      setMessage(`Recenziu sa nepodarilo schváliť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function rejectReview() {
    const confirmed = window.confirm(
      "Naozaj chceš túto recenziu zamietnuť? Zostane skrytá z verejného zobrazenia."
    );
    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("reviews")
      .update({
        status: "rejected",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    setSaving(false);

    if (error) {
      setMessage(`Recenziu sa nepodarilo zamietnuť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function hideReview() {
    const confirmed = window.confirm(
      "Naozaj chceš skryť túto recenziu z verejného zobrazenia? Recenzia sa nezmaže natrvalo, iba sa označí ako skrytá."
    );
    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("reviews")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    setSaving(false);

    if (error) {
      setMessage(`Recenziu sa nepodarilo skryť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function restoreReview() {
    const confirmed = window.confirm(
      "Naozaj chceš obnoviť túto recenziu do verejného zobrazenia?"
    );
    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("reviews")
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    setSaving(false);

    if (error) {
      setMessage(`Recenziu sa nepodarilo obnoviť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-slate-50 p-4">
      <div>
        <p className="font-semibold text-slate-900">Moderovanie recenzie</p>
        <p className="mt-1 text-sm text-slate-600">
          Schválenie mení publikačný stav recenzie. Skrytie rieši len jej
          verejnú viditeľnosť.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {status !== "approved" ? (
          <button
            type="button"
            onClick={approveReview}
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <CheckCircle2 className="size-4" />
            {saving ? "Ukladá sa..." : "Schváliť a zverejniť"}
          </button>
        ) : null}

        {status !== "rejected" ? (
          <button
            type="button"
            onClick={rejectReview}
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle className="size-4" />
            {saving ? "Ukladá sa..." : "Zamietnuť"}
          </button>
        ) : null}

        {isHidden ? (
          <button
            type="button"
            onClick={restoreReview}
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
          >
            <Eye className="size-4" />
            {saving ? "Obnovuje sa..." : "Obnoviť viditeľnosť"}
          </button>
        ) : (
          <button
            type="button"
            onClick={hideReview}
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
          >
            <EyeOff className="size-4" />
            {saving ? "Skrýva sa..." : "Skryť z verejného zobrazenia"}
          </button>
        )}
      </div>

      {message ? (
        <p className="text-sm text-red-700">{message}</p>
      ) : null}
    </div>
  );
}