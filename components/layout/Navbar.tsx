"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Shield, UserCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LogoutButton from "@/components/auth/LogoutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getSafeSession } from "@/lib/supabase/getSafeSession";
import { cn } from "@/lib/utils";

type UserInfo = {
  id: string;
  email?: string;
  isStaff: boolean;
} | null;

type NavLink = {
  href: string;
  label: string;
};

function NotificationMenuBadge({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/auth")) {
      setCount(0);
      return;
    }

    let cancelled = false;

    async function loadCount() {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("id_user", userId)
        .eq("is_read", false);

      if (!cancelled && !error) {
        setCount(count ?? 0);
      }
    }

    loadCount();

    return () => {
      cancelled = true;
    };
  }, [pathname, userId]);

  if (count <= 0) return null;

  return (
    <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<UserInfo>(null);
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");

  const mobileDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const accountDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const mobileAccountDetailsRef = useRef<HTMLDetailsElement | null>(null);

  const roleRequestIdRef = useRef(0);
  const roleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);

  const publicLinks: NavLink[] = [
    { href: "/", label: "Domov" },
    { href: "/doctors", label: "Lekári" },
    { href: "/facilities", label: "Zariadenia" },
    { href: "/forum", label: "Fórum" },
    { href: "/analytics", label: "Analytika" },
  ];

  function closeMobileMenu() {
    if (mobileDetailsRef.current) {
      mobileDetailsRef.current.open = false;
    }
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  function getLinkClassName(href: string) {
    return cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive(href)
        ? "bg-sky-100 text-sky-700"
        : "text-slate-700 hover:bg-slate-100 hover:text-sky-600"
    );
  }

  function getMobileLinkClassName(href: string) {
    return cn(
      "block rounded-xl px-4 py-3 text-base font-medium transition-colors",
      isActive(href)
        ? "bg-sky-100 text-sky-700"
        : "text-slate-700 hover:bg-slate-100 hover:text-sky-600"
    );
  }

  function handleSessionChange(session: any) {
    roleRequestIdRef.current += 1;
    const requestId = roleRequestIdRef.current;

    if (roleTimerRef.current) {
      clearTimeout(roleTimerRef.current);
      roleTimerRef.current = null;
    }

    if (!session?.user) {
      setUser(null);
      return;
    }

    const email = session.user.email ?? undefined;
    const id = session.user.id;

    setUser({
      id,
      email,
      isStaff: false,
    });

    if (isAuthRoute) {
      return;
    }

    roleTimerRef.current = setTimeout(async () => {
      try {
        const { data: isStaff, error } = await supabase.rpc(
          "current_user_has_role",
          {
            p_allowed_slugs: ["admin", "moderator"],
          }
        );

        if (!isMountedRef.current || roleRequestIdRef.current !== requestId) {
          return;
        }

        setUser({
          id,
          email,
          isStaff: !error && Boolean(isStaff),
        });
      } catch {
        if (!isMountedRef.current || roleRequestIdRef.current !== requestId) {
          return;
        }

        setUser({
          id,
          email,
          isStaff: false,
        });
      }
    }, 0);
  }

  useEffect(() => {
    isMountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionChange(session);
    });

    getSafeSession().then(({ session }) => {
      if (isMountedRef.current) {
        handleSessionChange(session);
      }
    });

    return () => {
      isMountedRef.current = false;

      if (roleTimerRef.current) {
        clearTimeout(roleTimerRef.current);
        roleTimerRef.current = null;
      }

      subscription.unsubscribe();
    };
  }, [isAuthRoute]);

  useEffect(() => {
    closeMobileMenu();

    if (accountDetailsRef.current) {
      accountDetailsRef.current.open = false;
    }

    if (mobileAccountDetailsRef.current) {
      mobileAccountDetailsRef.current.open = false;
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-slate-950">
          OverenyDoktor
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={getLinkClassName(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user?.isStaff ? (
            <Link
              href="/admin"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
                isActive("/admin")
                  ? "bg-slate-950 text-white"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              <Shield className="size-4" />
              Správa
            </Link>
          ) : null}

          {user ? <NotificationBell userId={user.id} /> : null}

          {user ? (
            <details ref={accountDetailsRef} className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                <UserCircle className="size-4" />
                Môj účet
                <ChevronDown className="size-4" />
              </summary>

              <div className="absolute right-0 mt-3 w-72 rounded-2xl border bg-white p-3 shadow-xl">
                <p className="truncate rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {user.email}
                </p>

                <div className="mt-3 space-y-1">
                  <Link
                    href="/reviews/mine"
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Moje recenzie
                  </Link>

                  <Link
                    href="/profile"
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Profil
                  </Link>

                  <Link
                    href="/notifications"
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <span>Notifikácie</span>
                    <NotificationMenuBadge userId={user.id} />
                  </Link>

                  <Link
                    href="/gdpr"
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    GDPR a údaje
                  </Link>
                </div>

                <div className="mt-3 border-t pt-3">
                  <LogoutButton />
                </div>
              </div>
            </details>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                Prihlásiť sa
              </Link>

              <Link
                href="/auth/register"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Registrovať sa
              </Link>
            </>
          )}
        </div>

        <details ref={mobileDetailsRef} className="relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-xl border px-3 py-2 text-slate-800">
            <Menu className="size-5 in-[[open]]:hidden" />
            <X className="hidden size-5 in-[[open]]:block" />
            <span className="sr-only">Otvoriť menu</span>
          </summary>

          <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border bg-white p-4 shadow-xl">
            <div className="space-y-1">
              {publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={getMobileLinkClassName(link.href)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {user?.isStaff ? (
              <Link
                href="/admin"
                onClick={closeMobileMenu}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                <Shield className="size-4" />
                Správa systému
              </Link>
            ) : null}

            <div className="mt-4 border-t pt-4">
              {user ? (
                <details ref={mobileAccountDetailsRef}>
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-base font-semibold text-slate-800">
                    <span className="truncate">Môj účet</span>
                    <ChevronDown className="size-4" />
                  </summary>

                  <div className="mt-3 space-y-2">
                    <p className="truncate rounded-xl border px-4 py-3 text-sm text-slate-600">
                      {user.email}
                    </p>

                    <Link
                      href="/reviews/mine"
                      onClick={closeMobileMenu}
                      className={getMobileLinkClassName("/reviews/mine")}
                    >
                      Moje recenzie
                    </Link>

                    <Link
                      href="/profile"
                      onClick={closeMobileMenu}
                      className={getMobileLinkClassName("/profile")}
                    >
                      Profil
                    </Link>

                    <Link
                      href="/notifications"
                      onClick={closeMobileMenu}
                      className={cn(
                        getMobileLinkClassName("/notifications"),
                        "flex items-center justify-between"
                      )}
                    >
                      <span>Notifikácie</span>
                      <NotificationMenuBadge userId={user.id} />
                    </Link>

                    <Link
                      href="/gdpr"
                      onClick={closeMobileMenu}
                      className={getMobileLinkClassName("/gdpr")}
                    >
                      GDPR a údaje
                    </Link>

                    <LogoutButton />
                  </div>
                </details>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/auth/login"
                    onClick={closeMobileMenu}
                    className="block w-full rounded-xl bg-sky-600 px-4 py-3 text-center text-base font-semibold text-white shadow-sm hover:bg-sky-700"
                  >
                    Prihlásiť sa
                  </Link>

                  <Link
                    href="/auth/register"
                    onClick={closeMobileMenu}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-base font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Registrovať sa
                  </Link>
                </div>
              )}
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}