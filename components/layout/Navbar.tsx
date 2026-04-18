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

      setUser(user ? { email: user.email } : null);
    };

    getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email } : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (mobileDetailsRef.current) {
      mobileDetailsRef.current.open = false;
    }
  }, [pathname]);

  const publicLinks: NavLink[] = [
    { href: "/", label: "Domov" },
    { href: "/doctors", label: "Lekári" },
    { href: "/forum", label: "Fórum" },
    { href: "/analytics", label: "Analytika" },
  ];

  const privateLinks: NavLink[] = [
    { href: "/reviews/mine", label: "Moje recenzie" },
    { href: "/profile", label: "Profil" },
  ];

  const links = user ? [...publicLinks, ...privateLinks] : publicLinks;

  const getLinkClassName = (href: string) =>
    cn(
      "rounded-lg px-2 py-1 text-sm font-medium transition-colors",
      pathname === href
        ? "bg-sky-100 text-sky-700"
        : "text-slate-700 hover:bg-slate-100 hover:text-sky-600"
    );

  const closeMobileMenu = () => {
    if (mobileDetailsRef.current) {
      mobileDetailsRef.current.open = false;
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
          OverenýDoktor
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <div className="flex flex-wrap items-center gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={getLinkClassName(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 border-l pl-4">
            {user ? (
              <>
                <span className="max-w-[180px] truncate text-sm text-slate-600">
                  {user.email}
                </span>
                <LogoutButton />
              </>
            ) : (
              <Link href="/auth/login" className={getLinkClassName("/auth/login")}>
                Prihlásiť sa
              </Link>
            )}
          </div>
        </nav>

        <details ref={mobileDetailsRef} className="group relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              <Menu size={20} />
            </span>
            <span className="hidden group-open:inline">
              <X size={20} />
            </span>
          </summary>

          <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-2xl border bg-white p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-sky-100 text-sky-700"
                      : "text-slate-700 hover:bg-slate-100 hover:text-sky-600"
                  )}
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-2 border-t pt-3">
                {user ? (
                  <div className="space-y-3">
                    <p className="break-all text-sm text-slate-600">{user.email}</p>
                    <LogoutButton />
                  </div>
                ) : (
                  <Link
                    href="/auth/login"
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname === "/auth/login"
                        ? "bg-sky-100 text-sky-700"
                        : "text-slate-700 hover:bg-slate-100 hover:text-sky-600"
                    )}
                    onClick={closeMobileMenu}
                  >
                    Prihlásiť sa
                  </Link>
                )}
              </div>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}