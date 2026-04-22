"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type ReportReasonValue =
  | "offensive_content"
  | "personal_data"
  | "health_data"
  | "false_or_misleading"
  | "spam_or_manipulation"
  | "other";

type ReportReviewButtonProps = {
  reviewId: string;
};

const reportReasons: { value: ReportReasonValue; label: string }[] = [
  {
    value: "offensive_content",
    label: "Nevhodný alebo urážlivý obsah",
  },
  {
    value: "personal_data",
    label: "Obsahuje osobné údaje",
  },
  {
    value: "health_data",
    label: "Obsahuje zdravotné alebo citlivé údaje",
  },
  {
    value: "false_or_misleading",
    label: "Nepravdivé alebo zavádzajúce tvrdenie",
  },
  {
    value: "spam_or_manipulation",
    label: "Spam alebo manipulované hodnotenie",
  },
  {
    value: "other",
    label: "Iný dôvod",
  },
];

function getReasonLabel(value: string) {
  return (
    reportReasons.find((reason) => reason.value === value)?.label ??
    "Iný dôvod"
  );
}

export function ReportReviewButton({ reviewId }: ReportReviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] =
    useState<ReportReasonValue>("offensive_content");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setMessageType("info");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessageType("error");
      setMessage("Pre nahlásenie recenzie sa musíš prihlásiť.");
      return;
    }

    const reasonLabel = getReasonLabel(reason);
    const finalReason = details.trim()
      ? `${reasonLabel}: ${details.trim()}`
      : reasonLabel;

    const { error } = await supabase.from("reports").insert({
      id_reporter: user.id,
      id_target: reviewId,
      target_type: "review",
      reason: finalReason,
      is_resolved: false,
    });

    setSaving(false);

    if (error) {
      setMessageType("error");
      setMessage(`Nahlásenie sa nepodarilo odoslať: ${error.message}`);
      return;
    }

    setMessageType("success");
    setMessage(
      "Ďakujeme. Nahlásenie bolo odoslané a bude posúdené moderátorom."
    );
    setDetails("");
  }

  const messageClassName =
    messageType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : messageType === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-slate-500 hover:text-red-700"
      >
        <AlertTriangle className="size-4" />
        Nahlásiť recenziu
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-amber-950">Nahlásenie recenzie</p>
          <p className="mt-1 text-sm text-amber-900">
            Nahlásenie slúži na upozornenie moderátora na obsah, ktorý môže byť
            nevhodný, nepravdivý alebo môže obsahovať osobné údaje.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setMessage("");
          }}
          className="rounded-lg p-1 text-amber-900 hover:bg-amber-100"
          aria-label="Zavrieť nahlásenie"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor={`report-reason-${reviewId}`}
            className="mb-1 block text-sm font-medium text-amber-950"
          >
            Dôvod nahlásenia
          </label>

          <select
            id={`report-reason-${reviewId}`}
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as ReportReasonValue)
            }
            className="min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {reportReasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`report-details-${reviewId}`}
            className="mb-1 block text-sm font-medium text-amber-950"
          >
            Doplňujúce informácie
          </label>

          <textarea
            id={`report-details-${reviewId}`}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Voliteľne doplň stručné vysvetlenie..."
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={saving}>
            {saving ? "Odosiela sa..." : "Odoslať nahlásenie"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setMessage("");
            }}
          >
            Zrušiť
          </Button>
        </div>

        {message ? (
          <p className={`rounded-xl border px-3 py-2 text-sm ${messageClassName}`}>
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}