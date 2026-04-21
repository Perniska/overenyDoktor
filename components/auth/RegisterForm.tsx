"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  isPasswordValid,
  PasswordRequirements,
} from "@/components/auth/PasswordRequirements";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
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

    if (!isPasswordValid(password)) {
      setMessage("Heslo nespĺňa všetky požadované pravidlá.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    setSaving(false);

    if (error) {
      const lowerMessage = error.message.toLowerCase();

      if (
        lowerMessage.includes("already") ||
        lowerMessage.includes("registered") ||
        lowerMessage.includes("exists")
      ) {
        setMessage(
          "Účet s týmto e-mailom už môže existovať. Skús sa prihlásiť alebo použi obnovenie hesla."
        );
      } else {
        setMessage(`Chyba: ${error.message}`);
      }

      return;
    }

    setMessage(
      "Ak je možné účet vytvoriť, na zadaný e-mail bude odoslaný potvrdzovací odkaz. Ak už účet existuje, skús sa prihlásiť."
    );

    setEmail("");
    setPassword("");
  };

  return (
    <form
      onSubmit={handleRegister}
      className="relative z-10 mx-auto w-full max-w-md space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-950">Registrácia</h2>
        <p className="text-sm text-slate-600">
          Vytvorenie nového používateľského účtu.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="register-email"
          className="block text-sm font-medium text-slate-800"
        >
          E-mail
        </label>
        <input
          id="register-email"
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
          htmlFor="register-password"
          className="block text-sm font-medium text-slate-800"
        >
          Heslo
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder="zadaj heslo"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />

        <PasswordRequirements password={password} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="relative z-20 min-h-12 w-full cursor-pointer rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {saving ? "Registruje sa..." : "Registrovať sa"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Už máš účet?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-sky-700 hover:underline"
        >
          Prihlás sa
        </Link>
      </p>

      {message ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}