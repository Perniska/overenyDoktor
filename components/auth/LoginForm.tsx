"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Chyba: ${error.message}`);
    } else {
      setMessage("Prihlásenie prebehlo úspešne.");
      window.location.href = "/";
    }
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
      </div>

      <Button type="submit" className="w-full" disabled={!email || !password}>
        Prihlásiť sa
      </Button>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}