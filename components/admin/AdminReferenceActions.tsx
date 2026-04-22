"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ReferenceTableName = "specialization" | "facility_type";

type AdminReferenceActionsProps = {
  tableName: ReferenceTableName;
  recordId: string;
  initialName: string;
  initialSlug: string | null;
  initialCategory?: string | null;
  initialInfo?: string | null;
};

export function AdminReferenceActions({
  tableName,
  recordId,
  initialName,
  initialSlug,
  initialCategory,
  initialInfo,
}: AdminReferenceActionsProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [info, setInfo] = useState(initialInfo ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveReference() {
    setMessage("");

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (trimmedName.length < 2) {
      setMessage("Názov musí mať aspoň 2 znaky.");
      return;
    }

    if (tableName === "specialization" && trimmedSlug.length < 2) {
      setMessage("Slug špecializácie musí mať aspoň 2 znaky.");
      return;
    }

    setSaving(true);

    const payload =
      tableName === "specialization"
        ? {
            name: trimmedName,
            slug: trimmedSlug,
            category: category.trim() || null,
          }
        : {
            name: trimmedName,
            slug: trimmedSlug || null,
            info: info.trim() || null,
          };

    const { error } = await supabase
      .from(tableName)
      .update(payload)
      .eq("id", recordId);

    setSaving(false);

    if (error) {
      setMessage(`Záznam sa nepodarilo uložiť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">Úprava číselníka</p>
        <p className="mt-1 text-sm text-slate-600">
          Upravuješ iba tento konkrétny číselníkový záznam.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Názov
          </label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Slug
          </label>

          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {tableName === "specialization" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Kategória
          </label>

          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Popis
          </label>

          <textarea
            value={info}
            onChange={(event) => setInfo(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <button
        type="button"
        onClick={saveReference}
        disabled={saving}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        <Save className="size-4" />
        {saving ? "Ukladá sa..." : "Uložiť zmeny"}
      </button>

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}