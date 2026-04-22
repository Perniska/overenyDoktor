"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  isPasswordValid,
  PasswordRequirements,
} from "@/components/auth/PasswordRequirements";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [saving, setSaving] = useState(false);

  async function handleResetPassword() {
    setMessage("");
    setMessageType("info");

    if (!isPasswordValid(password)) {
      setMessageType("error");
      setMessage("Heslo nespĺňa všetky požadované pravidlá.");
      return;
    }

    if (password !== passwordAgain) {
      setMessageType("error");
      setMessage("Heslá sa nezhodujú.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setSaving(false);

    if (error) {
      setMessageType("error");
      setMessage(`Heslo sa nepodarilo zmeniť: ${error.message}`);
      return;
    }

    setPassword("");
    setPasswordAgain("");
    setMessageType("success");
    setMessage("Heslo bolo úspešne zmenené. Teraz sa môžeš prihlásiť.");
  }

  const messageClassName =
    messageType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : messageType === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-950">
          Nastavenie nového hesla
        </h1>
        <p className="text-sm text-slate-600">
          Zadaj nové heslo pre svoj účet. Požiadavky na heslo sú zobrazené
          nižšie.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="new-password"
          className="block text-sm font-medium text-slate-800"
        >
          Nové heslo
        </label>

        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="zadaj nové heslo"
          className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />

        <PasswordRequirements password={password} />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="new-password-again"
          className="block text-sm font-medium text-slate-800"
        >
          Zopakuj nové heslo
        </label>

        <input
          id="new-password-again"
          type="password"
          autoComplete="new-password"
          value={passwordAgain}
          onChange={(event) => setPasswordAgain(event.target.value)}
          placeholder="zopakuj nové heslo"
          className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />

        {passwordAgain.length > 0 && password !== passwordAgain ? (
          <p className="text-sm text-red-600">Heslá sa nezhodujú.</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleResetPassword}
        disabled={saving}
        className="min-h-12 w-full rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {saving ? "Ukladá sa..." : "Zmeniť heslo"}
      </button>

      {message ? (
        <div className={`rounded-xl border px-3 py-3 text-sm ${messageClassName}`}>
          <p>{message}</p>

          {messageType === "success" ? (
            <Link
              href="/auth/login"
              className="mt-3 inline-block font-medium text-sky-700 hover:underline"
            >
              Prejsť na prihlásenie
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}