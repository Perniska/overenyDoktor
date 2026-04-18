"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsAuthenticated(!!user);
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-slate-600">Načítava sa overenie používateľa...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Prístup len pre prihlásených</h2>
        <p className="text-slate-600">
          Táto časť systému je dostupná iba pre autentifikovaných používateľov.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Prejsť na prihlásenie
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}