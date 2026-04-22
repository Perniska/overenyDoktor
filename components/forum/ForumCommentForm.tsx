"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ForumCommentFormProps = {
  topicId: string;
  isLocked: boolean;
};

export function ForumCommentForm({ topicId, isLocked }: ForumCommentFormProps) {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCreateComment() {
    setMessage("");

    if (isLocked) {
      setMessage("Táto téma je uzamknutá a nie je možné pridať komentár.");
      return;
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length < 2) {
      setMessage("Komentár musí mať aspoň 2 znaky.");
      return;
    }

    if (trimmedContent.length > 3000) {
      setMessage("Komentár môže mať najviac 3000 znakov.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Pre pridanie komentára sa musíš prihlásiť.");
      return;
    }

    const { error } = await supabase.from("forum_comments").insert({
      id_topic: topicId,
      id_user: user.id,
      content: trimmedContent,
      is_edited: false,
    });

    setSaving(false);

    if (error) {
      setMessage(`Komentár sa nepodarilo pridať: ${error.message}`);
      return;
    }

    setContent("");
    router.refresh();
  }

  if (isLocked) {
    return (
      <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">
        Táto téma je uzamknutá. Nové komentáre nie je možné pridávať.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Pridať komentár
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Komentuj vecne a bez uvádzania citlivých osobných alebo zdravotných
          údajov.
        </p>
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={5}
        maxLength={3000}
        placeholder="Napíš komentár..."
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-500">{content.length}/3000</p>

        <button
          type="button"
          onClick={handleCreateComment}
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Send className="size-4" />
          {saving ? "Odosiela sa..." : "Pridať komentár"}
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}