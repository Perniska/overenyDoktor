"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

function isPasswordValid(password: string) {
  const checks = getPasswordChecks(password);
  return checks.minLength && checks.hasUppercase && checks.hasNumber;
}

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const checks = getPasswordChecks(password);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    if (!isPasswordValid(password)) {
      setMessage("Heslo nespĺňa všetky požadované pravidlá.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`Chyba: ${error.message}`);
    } else {
      setMessage("Registrácia prebehla úspešne. Skontroluj si email.");
    }
  };

  return (
    <form
      onSubmit={handleRegister}
      className="max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Registrácia</h2>
        <p className="text-sm text-slate-600">
          Vytvorenie nového používateľského účtu.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          placeholder="zadaj email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Heslo</label>
        <input
          type="password"
          placeholder="zadaj heslo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />

        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="mb-2 font-medium text-slate-700">Heslo musí spĺňať:</p>

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
          </ul>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!email || !isPasswordValid(password)}>
        Registrovať sa
      </Button>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}