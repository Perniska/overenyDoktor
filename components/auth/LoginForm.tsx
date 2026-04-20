"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !saving;

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

    setMessage("Prihlásenie prebehlo úspešne.");
    window.location.href = "/";
  };

  return (
    <form
      onSubmit={handleLogin}
      className="max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Prihlásenie</h2>
        <p className="text-sm text-slate-600">
          Prihlásenie používateľa do systému.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">E-mail</label>
        <input
          type="email"
          placeholder="zadaj e-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {saving ? "Prihlasuje sa..." : "Prihlásiť sa"}
      </Button>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}