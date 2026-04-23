"use client";

import { useState } from "react";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type NotificationsActionsProps = {
  notificationId?: string;
  isRead?: boolean;
  variant: "single" | "bulk";
};

export function NotificationsActions(props: NotificationsActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function markOne() {
    if (!props.notificationId || props.isRead) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: props.notificationId,
    });

    setSaving(false);

    if (error) {
      setMessage(`Notifikáciu sa nepodarilo označiť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function markAll() {
    setMessage("");
    setSaving(true);

    const { error } = await supabase.rpc("mark_all_notifications_read");

    setSaving(false);

    if (error) {
      setMessage(`Notifikácie sa nepodarilo označiť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function deleteOne() {
    if (!props.notificationId) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase.rpc("delete_notification", {
      p_notification_id: props.notificationId,
    });

    setSaving(false);

    if (error) {
      setMessage(`Notifikáciu sa nepodarilo zmazať: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function deleteAllRead() {
    setMessage("");
    setSaving(true);

    const { error } = await supabase.rpc("delete_all_read_notifications");

    setSaving(false);

    if (error) {
      setMessage(`Prečítané notifikácie sa nepodarilo zmazať: ${error.message}`);
      return;
    }

    router.refresh();
  }

  if (props.variant === "single") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={markOne}
          disabled={saving || props.isRead}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Check className="size-4" />
          {props.isRead ? "Prečítaná" : "Označiť ako prečítanú"}
        </button>

        <button
          type="button"
          onClick={deleteOne}
          disabled={saving}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="size-4" />
          Zmazať
        </button>

        {message ? (
          <p className="w-full text-sm text-red-700">{message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={markAll}
        disabled={saving}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <CheckCheck className="size-4" />
        {saving ? "Ukladá sa..." : "Označiť všetky ako prečítané"}
      </button>

      <button
        type="button"
        onClick={deleteAllRead}
        disabled={saving}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="size-4" />
        Zmazať prečítané
      </button>

      {message ? <p className="w-full text-sm text-red-700">{message}</p> : null}
    </div>
  );
}