"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getSafeSession } from "@/lib/supabase/getSafeSession";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasSession, setHasSession] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pathname = usePathname();

  async function loadUnreadCount(userId?: string | null) {
    let currentUserId = userId ?? null;

    if (!currentUserId) {
      const { session } = await getSafeSession();
      currentUserId = session?.user?.id ?? null;
    }

    if (!currentUserId) {
      setHasSession(false);
      setUnreadCount(0);
      return;
    }

    setHasSession(true);

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("id_user", currentUserId)
      .eq("is_read", false);

    if (!error) {
      setUnreadCount(count ?? 0);
    }
  }

  async function subscribeToNotifications() {
    const { session } = await getSafeSession();
    const userId = session?.user?.id ?? null;

    if (!userId) {
      setHasSession(false);
      setUnreadCount(0);
      return;
    }

    setHasSession(true);
    await loadUnreadCount(userId);

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `id_user=eq.${userId}`,
        },
        async () => {
          await loadUnreadCount(userId);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }

  useEffect(() => {
    if (
      pathname.startsWith("/auth") ||
      pathname.startsWith("/notifications") ||
      pathname.startsWith("/gdpr")
    ) {
      setHasSession(false);
      setUnreadCount(0);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      return;
    }

    subscribeToNotifications();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await subscribeToNotifications();
    });

    return () => {
      subscription.unsubscribe();

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [pathname]);

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/gdpr")
  ) {
    return null;
  }

  if (!hasSession) {
    return null;
  }

  return (
    <Link
      href="/notifications"
      className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border text-slate-700 hover:bg-slate-50"
      aria-label="Notifikácie"
      title="Notifikácie"
    >
      <Bell className="size-4" />

      {unreadCount > 0 ? (
        <span
          className={cn(
            "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white",
            unreadCount > 99 ? "min-w-6" : ""
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}