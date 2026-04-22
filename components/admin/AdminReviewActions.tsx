"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AdminReviewActionsProps = {
  reviewId: string;
  isHidden: boolean;
};

export function AdminReviewActions({
  reviewId,
  isHidden,
}: AdminReviewActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">Moderovanie recenzie</p>
        <p className="mt-1 text-sm text-slate-600">
          Skrytie použi pri obsahu, ktorý je nevhodný, obsahuje osobné údaje,
          citlivé zdravotné údaje alebo porušuje pravidlá platformy.
        </p>
      </div>

      {isHidden ? (
        <button
          type="button"
          onClick={restoreReview}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
        >
          <Eye className="size-4" />
          {saving ? "Obnovuje sa..." : "Obnoviť recenziu"}
        </button>
      ) : (
        <button
          type="button"
          onClick={hideReview}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          <EyeOff className="size-4" />
          {saving ? "Skrýva sa..." : "Skryť recenziu"}
        </button>
      )}

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}