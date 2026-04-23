"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie, Shield, X } from "lucide-react";

const STORAGE_KEY = "overenydoktor-privacy-banner-accepted";

export default function PrivacyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;

    if (!accepted) {
      setVisible(true);
    }
  }, []);

  function handleClose() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }

    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-60 mx-auto w-[calc(100%-1rem)] max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-xl bg-sky-50 p-2 text-sky-700">
            <Cookie className="size-5" />
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <Shield className="size-4" />
              Informácie o súkromí a cookies
            </p>

            <p className="text-sm leading-6 text-slate-600">
              Aplikácia používa nevyhnutné cookies a session údaje na
              prihlásenie, bezpečnosť účtu a základné fungovanie systému.
              Texty recenzií môžu byť spracované aj na účely moderácie,
              detekcie nevhodného obsahu a analytického vyhodnotenia.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/privacy-policy"
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ochrana osobných údajov
              </Link>

              <Link
                href="/cookies"
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cookies a session
              </Link>

              <button
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="self-start rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Zavrieť banner"
          title="Zavrieť banner"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}