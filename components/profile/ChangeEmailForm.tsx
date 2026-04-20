"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ChangeEmailForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Zadaj novú e-mailovú adresu.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage("E-mailová adresa nemá správny formát.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      email: trimmedEmail,
    });

    setSaving(false);

    if (error) {
      setMessage(`Chyba pri zmene e-mailu: ${error.message}`);
      return;
    }

    setEmail("");
    setMessage(
      "Na novú e-mailovú adresu bol odoslaný potvrdzovací odkaz. Zmena sa dokončí po potvrdení."
    );
  };

  return (
    <form
      onSubmit={handleChangeEmail}
      className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-2xl font-semibold">Zmena e-mailu</h2>
        <p className="mt-1 text-sm text-slate-600">
          Zadaj novú e-mailovú adresu používateľského účtu.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nový e-mail</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="napr. meno@example.com"
          required
        />
      </div>

      <Button type="submit" disabled={saving || !email}>
        {saving ? "Odosiela sa..." : "Zmeniť e-mail"}
      </Button>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}