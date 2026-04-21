"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LogoutButton from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

type UserInfo = {
  email?: string;
} | null;

type NavLink = {
  href: string;
  label: string;
};

export default function Navbar() {
  const [user, setUser] = useState<UserInfo>(null);
  const pathname = usePathname();
  const mobileDetailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ? { email: user.email ?? undefined } : null);
    };

    getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? undefined } : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  const publicLinks: NavLink[] = [
    { href: "/", label: "Domov" },
    { href: "/doctors", label: "Lekári" },
    { href: "/facilities", label: "Zariadenia" },
    { href: "/forum", label: "Fórum" },
    { href: "/analytics", label: "Analytika" },
  ];

  const privateLinks: NavLink[] = [
    { href: "/reviews/mine", label: "Moje recenzie" },
    { href: "/profile", label: "Profil" },
  ];

  const links = user ? [...publicLinks, ...privateLinks] : publicLinks;

  function closeMobileMenu() {
    if (mobileDetailsRef.current) {
      mobileDetailsRef.current.open = false;
    }
  }

  function getLinkClassName(href: string) {
    return cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      pathname === href
        ? "bg-sky-100 text-sky-700"
        : "text-slate-700 hover:bg-slate-100 hover:text-sky-600"
    );
  }

  function getMobileLinkClassName(href: string) {
    return cn(
      "block rounded-xl px-4 py-3 text-base font-medium transition-colors",
      pathname === href
        ? "bg-sky-100 text-sky-700"
        : "text-slate-700 hover:bg-slate-100 hover:text-sky-600"
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-slate-950">
          OverenýDoktor
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={getLinkClassName(link.href)}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="max-w-55 truncate text-sm text-slate-600">
                {user.email}
              </span>
              <LogoutButton />
            </>
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
              {links.map((link) => (
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

            <div className="mt-4 border-t pt-4">
              {user ? (
                <div className="space-y-3">
                  <p className="truncate rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {user.email}
                  </p>
                  <LogoutButton />
                </div>
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