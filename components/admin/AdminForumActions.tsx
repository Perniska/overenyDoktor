"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Pin, PinOff, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AdminForumTopicActionsProps = {
  topicId: string;
  isHidden: boolean;
  isLocked: boolean;
  isPinned: boolean;
};

type AdminForumCommentActionsProps = {
  commentId: string;
  isHidden: boolean;
};

export function AdminForumTopicActions({
  topicId,
  isHidden,
  isLocked,
  isPinned,
}: AdminForumTopicActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function updateTopic(payload: Record<string, unknown>) {
    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("forum_topics")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", topicId);

    setSaving(false);

    if (error) {
      setMessage(`Tému sa nepodarilo upraviť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function toggleHidden() {
    const confirmed = window.confirm(
      isHidden
        ? "Naozaj chceš obnoviť túto tému do verejného zobrazenia?"
        : "Naozaj chceš skryť túto tému z verejného zobrazenia?"
    );

    if (!confirmed) return;

    await updateTopic({
      deleted_at: isHidden ? null : new Date().toISOString(),
    });
  }

  async function toggleLocked() {
    await updateTopic({
      is_locked: !isLocked,
    });
  }

  async function togglePinned() {
    await updateTopic({
      is_pinned: !isPinned,
    });
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">Moderovanie témy</p>
        <p className="mt-1 text-sm text-slate-600">
          Tému môžeš skryť, ak porušuje pravidlá. Uzamknutie použiješ vtedy,
          keď chceš ponechať tému viditeľnú, ale zastaviť ďalšie komentáre.
          Pripnutie použi iba pri dôležitých organizačných témach.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
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
          {isHidden ? "Obnoviť tému" : "Skryť tému"}
        </button>

        <button
          type="button"
          onClick={toggleLocked}
          disabled={saving || isHidden}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {isLocked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
          {isLocked ? "Odomknúť" : "Uzamknúť"}
        </button>

        <button
          type="button"
          onClick={togglePinned}
          disabled={saving || isHidden}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          {isPinned ? "Odopnúť" : "Pripnúť"}
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      {saving ? (
        <p className="text-sm text-slate-500">Ukladá sa zmena...</p>
      ) : null}
    </div>
  );
}

export function AdminForumCommentActions({
  commentId,
  isHidden,
}: AdminForumCommentActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleHidden() {
    const confirmed = window.confirm(
      isHidden
        ? "Naozaj chceš obnoviť tento komentár do verejného zobrazenia?"
        : "Naozaj chceš skryť tento komentár z verejného zobrazenia?"
    );

    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("forum_comments")
      .update({
        deleted_at: isHidden ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    setSaving(false);

    if (error) {
      setMessage(`Komentár sa nepodarilo upraviť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">Moderovanie komentára</p>
        <p className="mt-1 text-sm text-slate-600">
          Komentár skry, ak obsahuje osobné alebo zdravotné údaje, urážky, spam
          alebo obsah mimo pravidiel.
        </p>
      </div>

      <button
        type="button"
        onClick={toggleHidden}
        disabled={saving}
        className={
          isHidden
            ? "inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            : "inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        }
      >
        {isHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        {saving
          ? "Ukladá sa..."
          : isHidden
            ? "Obnoviť komentár"
            : "Skryť komentár"}
      </button>

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}