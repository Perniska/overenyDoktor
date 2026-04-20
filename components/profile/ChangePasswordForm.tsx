"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };
}

function isPasswordValid(password: string) {
  const checks = getPasswordChecks(password);

  return (
    checks.minLength &&
    checks.hasUppercase &&
    checks.hasNumber &&
    checks.hasSpecialChar
  );
}

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const checks = getPasswordChecks(password);
  const passwordsMatch = password.length > 0 && password === passwordRepeat;
  const canSubmit = isPasswordValid(password) && passwordsMatch && !saving;

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!isPasswordValid(password)) {
      setMessage("Nové heslo nespĺňa všetky bezpečnostné pravidlá.");
      return;
    }

    if (!passwordsMatch) {
      setMessage("Heslá sa nezhodujú.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setSaving(false);

    if (error) {
      setMessage(`Chyba pri zmene hesla: ${error.message}`);
      return;
    }

    setPassword("");
    setPasswordRepeat("");
    setMessage("Heslo bolo úspešne zmenené.");
  };

  return (
    <form
      onSubmit={handleChangePassword}
      className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-2xl font-semibold">Zmena hesla</h2>
        <p className="mt-1 text-sm text-slate-600">
          Zadaj nové heslo pre svoj používateľský účet.
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

        {password.length > 0 && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="mb-2 font-medium text-slate-700">
              Heslo musí spĺňať:
            </p>

            <ul className="space-y-1">
              <li className={checks.minLength ? "text-green-600" : "text-red-600"}>
                {checks.minLength ? "✓" : "✗"} aspoň 8 znakov
              </li>
              <li className={checks.hasUppercase ? "text-green-600" : "text-red-600"}>
                {checks.hasUppercase ? "✓" : "✗"} aspoň jedno veľké písmeno
              </li>
              <li className={checks.hasNumber ? "text-green-600" : "text-red-600"}>
                {checks.hasNumber ? "✓" : "✗"} aspoň jedno číslo
              </li>
              <li className={checks.hasSpecialChar ? "text-green-600" : "text-red-600"}>
                {checks.hasSpecialChar ? "✓" : "✗"} aspoň jeden špeciálny znak
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Zopakuj nové heslo</label>
        <input
          type="password"
          value={passwordRepeat}
          onChange={(event) => setPasswordRepeat(event.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />

        {passwordRepeat.length > 0 && (
          <p className={passwordsMatch ? "text-sm text-green-600" : "text-sm text-red-600"}>
            {passwordsMatch ? "Heslá sa zhodujú." : "Heslá sa nezhodujú."}
          </p>
        )}
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {saving ? "Ukladá sa..." : "Zmeniť heslo"}
      </Button>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}