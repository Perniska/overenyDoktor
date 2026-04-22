"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ForumCategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type ForumCreateTopicFormProps = {
  categories: ForumCategoryOption[];
};

export function ForumCreateTopicForm({ categories }: ForumCreateTopicFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCreateTopic() {
    setMessage("");

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 5) {
      setMessage("Názov témy musí mať aspoň 5 znakov.");
      return;
    }

    if (trimmedTitle.length > 300) {
      setMessage("Názov témy môže mať najviac 300 znakov.");
      return;
    }

    if (!categoryId) {
      setMessage("Vyber kategóriu témy.");
      return;
    }

    if (trimmedDescription.length > 2000) {
      setMessage("Popis témy môže mať najviac 2000 znakov.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Pre vytvorenie témy sa musíš prihlásiť.");
      return;
    }

    const { data, error } = await supabase
      .from("forum_topics")
      .insert({
        id_creator: user.id,
        id_category: categoryId,
        title: trimmedTitle,
        description: trimmedDescription || null,
        is_pinned: false,
        is_locked: false,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      setMessage(`Tému sa nepodarilo vytvoriť: ${error.message}`);
      return;
    }

    router.push(`/forum/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
          <MessageSquarePlus className="size-5" />
          Nová téma vo fóre
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Tému formuluj vecne a bez uvádzania citlivých osobných alebo
          zdravotných údajov.
        </p>
      </div>

      <div>
        <label
          htmlFor="forum-category"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Kategória
        </label>

        <select
          id="forum-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="forum-title"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Názov témy
        </label>

        <input
          id="forum-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={300}
          placeholder="Napríklad: Ako funguje hodnotenie zariadení?"
          className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />

        <p className="mt-1 text-xs text-slate-500">{title.length}/300</p>
      </div>

      <div>
        <label
          htmlFor="forum-description"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Popis témy
        </label>

        <textarea
          id="forum-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Voliteľne doplň kontext témy..."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />

        <p className="mt-1 text-xs text-slate-500">{description.length}/2000</p>
      </div>

      <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
        <p className="font-semibold">Pravidlo súkromia</p>
        <p className="mt-1">
          Neuvádzaj rodné čísla, adresy, diagnózy, výsledky vyšetrení ani iné
          citlivé údaje. Fórum má slúžiť na všeobecnú diskusiu a technické
          otázky k systému.
        </p>
      </div>

      <button
        type="button"
        onClick={handleCreateTopic}
        disabled={saving}
        className="min-h-12 w-full rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {saving ? "Vytvára sa..." : "Vytvoriť tému"}
      </button>

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}