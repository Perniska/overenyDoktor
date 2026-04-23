"use client";

import { FormEvent, useMemo, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

function isPasswordValid(password: string) {
  const checks = getPasswordChecks(password);
  return Object.values(checks).every(Boolean);
}

export default function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const checks = useMemo(() => getPasswordChecks(password), [password]);

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setMessage("");
    setMessageType("info");

    if (!isPasswordValid(password)) {
      setMessageType("error");
      setMessage(
        "Heslo musí mať aspoň 8 znakov a obsahovať malé písmeno, veľké písmeno a číslo."
      );
      return;
    }

    if (password !== passwordConfirm) {
      setMessageType("error");
      setMessage("Heslá sa nezhodujú.");
      return;
    }

    setSaving(true);

    try {
      // počas recovery flow necháme auth session “ustáliť”
      await new Promise((resolve) => setTimeout(resolve, 250));

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setMessageType("success");
      setMessage("Heslo bolo úspešne zmenené. Teraz sa môžeš prihlásiť.");

      setTimeout(() => {
        router.replace("/auth/login");
      }, 1200);
    } catch (error: any) {
      const text =
        typeof error?.message === "string"
          ? error.message
          : "Heslo sa nepodarilo zmeniť.";

      setMessageType("error");
      setMessage(text);
    } finally {
      setSaving(false);
    }
  }

  const messageClassName =
    messageType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : messageType === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <form onSubmit={handleResetPassword} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nové heslo
        </label>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 pr-11 text-sm"
            placeholder="Zadaj nové heslo"
          />

          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Potvrdenie hesla
        </label>

        <div className="relative">
          <input
            type={showPasswordConfirm ? "text" : "password"}
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            autoComplete="new-password"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 pr-11 text-sm"
            placeholder="Zopakuj nové heslo"
          />

          <button
            type="button"
            onClick={() => setShowPasswordConfirm((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label={
              showPasswordConfirm ? "Skryť potvrdenie hesla" : "Zobraziť potvrdenie hesla"
            }
          >
            {showPasswordConfirm ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-slate-50 p-4 text-sm">
        <p className="mb-2 flex items-center gap-2 font-medium text-slate-800">
          <LockKeyhole className="size-4" />
          Požiadavky na heslo
        </p>

        <ul className="space-y-1 text-slate-600">
          <li className={checks.minLength ? "text-emerald-700" : ""}>
            Aspoň 8 znakov
          </li>
          <li className={checks.hasLower ? "text-emerald-700" : ""}>
            Aspoň 1 malé písmeno
          </li>
          <li className={checks.hasUpper ? "text-emerald-700" : ""}>
            Aspoň 1 veľké písmeno
          </li>
          <li className={checks.hasNumber ? "text-emerald-700" : ""}>
            Aspoň 1 číslo
          </li>
        </ul>
      </div>

      {message ? (
        <p className={`rounded-xl border px-3 py-3 text-sm ${messageClassName}`}>
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {saving ? "Ukladá sa..." : "Zmeniť heslo"}
      </button>
    </form>
  );
}