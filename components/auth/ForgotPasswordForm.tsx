"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Zadaj e-mailovú adresu.");
      return;
    }

    setSaving(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    setSaving(false);

    if (error) {
      setMessage(`Chyba: ${error.message}`);
      return;
    }

    setMessage(
      "Ak účet existuje, na e-mail bude odoslaný odkaz na obnovenie hesla."
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold">Obnovenie hesla</h2>
        <p className="mt-1 text-sm text-slate-600">
          Zadaj e-mail, na ktorý pošleme odkaz na nastavenie nového hesla.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Odosiela sa..." : "Odoslať odkaz"}
      </Button>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}