"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ForumCommentActionsProps = {
  commentId: string;
  initialContent: string;
  canManage: boolean;
};

export function ForumCommentActions({
  commentId,
  initialContent,
  canManage,
}: ForumCommentActionsProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!canManage) {
    return null;
  }

  async function handleSave() {
    setMessage("");

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

    const { error } = await supabase
      .from("forum_comments")
      .update({
        content: trimmedContent,
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    setSaving(false);

    if (error) {
      setMessage(`Komentár sa nepodarilo upraviť: ${error.message}`);
      return;
    }

    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Naozaj chceš odstrániť tento komentár? Komentár sa skryje z verejného zobrazenia."
    );

    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("forum_comments")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    setSaving(false);

    if (error) {
      setMessage(`Komentár sa nepodarilo odstrániť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-3">
      {isEditing ? (
        <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            maxLength={3000}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
            >
              {saving ? "Ukladá sa..." : "Uložiť zmeny"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setContent(initialContent);
                setMessage("");
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="size-4" />
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="size-4" />
            Upraviť
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="size-4" />
            {saving ? "Odstraňuje sa..." : "Odstrániť"}
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