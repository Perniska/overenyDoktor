"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Zadaj e-mailovú adresu.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage("E-mailová adresa nemá správny formát.");
      return;
    }

    if (!password) {
      setMessage("Zadaj heslo.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    setSaving(false);

    if (error) {
      setMessage("Prihlásenie zlyhalo. Skontroluj e-mail a heslo.");
      return;
    }

    window.location.href = "/";
  };

  return (
    <form
      onSubmit={handleLogin}
      className="relative z-10 mx-auto w-full max-w-md space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-950">Prihlásenie</h2>
        <p className="text-sm text-slate-600">
          Prihlásenie používateľa do systému.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-slate-800"
        >
          E-mail
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="zadaj e-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="login-password"
          className="block text-sm font-medium text-slate-800"
        >
          Heslo
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="zadaj heslo"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="relative z-20 min-h-12 w-full cursor-pointer rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {saving ? "Prihlasuje sa..." : "Prihlásiť sa"}
      </button>

      <div className="space-y-2 text-center text-sm">
        <p className="text-slate-600">
          Zabudla si heslo?{" "}
          <Link
            href="/auth/forgot-password"
            className="font-medium text-sky-700 hover:underline"
          >
            Obnoviť heslo
          </Link>
        </p>

        <p className="text-slate-600">
          Nemáš účet?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-sky-700 hover:underline"
          >
            Zaregistruj sa
          </Link>
        </p>
      </div>

      {message ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}