"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  userId: string;
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const mountedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingRef = useRef(false);

  async function loadUnreadCount() {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("id_user", userId)
        .eq("is_read", false);

      if (!mountedRef.current) return;

      if (!error) {
        setUnreadCount(count ?? 0);
      }
    } finally {
      loadingRef.current = false;
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    if (pathname.startsWith("/auth")) {
      setUnreadCount(0);

      return () => {
        mountedRef.current = false;
      };
    }

    loadUnreadCount();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadUnreadCount();
      }
    }

    function handleWindowFocus() {
      loadUnreadCount();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    intervalRef.current = setInterval(() => {
      loadUnreadCount();
    }, 15000);

    return () => {
      mountedRef.current = false;

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pathname, userId]);

  if (pathname.startsWith("/auth")) {
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