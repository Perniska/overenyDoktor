"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  isPasswordValid,
  PasswordRequirements,
} from "@/components/auth/PasswordRequirements";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit =
    isPasswordValid(password) && password === passwordAgain && !saving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!isPasswordValid(password)) {
      setMessage("Heslo nespĺňa všetky požadované pravidlá.");
      return;
    }

    if (password !== passwordAgain) {
      setMessage("Heslá sa nezhodujú.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setSaving(false);

    if (error) {
      setMessage(`Chyba: ${error.message}`);
      return;
    }

    setMessage("Heslo bolo zmenené. Môžeš sa prihlásiť.");
    setPassword("");
    setPasswordAgain("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold">Nastavenie nového hesla</h2>
        <p className="mt-1 text-sm text-slate-600">
          Zadaj nové heslo. Požiadavky sú zobrazené stále.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nové heslo</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />

        <PasswordRequirements password={password} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Zopakuj nové heslo</label>
        <input
          type="password"
          value={passwordAgain}
          onChange={(event) => setPasswordAgain(event.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />

        {passwordAgain.length > 0 && password !== passwordAgain ? (
          <p className="text-sm text-red-600">Heslá sa nezhodujú.</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {saving ? "Ukladá sa..." : "Zmeniť heslo"}
      </Button>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}