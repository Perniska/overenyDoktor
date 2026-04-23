"use client";

import { useState } from "react";
import { Check, CheckCheck } from "lucide-react";
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

  if (props.variant === "single") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={markOne}
          disabled={saving || props.isRead}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Check className="size-4" />
          {props.isRead ? "Prečítaná" : "Označiť ako prečítanú"}
        </button>

        {message ? <p className="text-sm text-red-700">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={markAll}
        disabled={saving}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <CheckCheck className="size-4" />
        {saving ? "Ukladá sa..." : "Označiť všetky ako prečítané"}
      </button>

      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </div>
  );
}