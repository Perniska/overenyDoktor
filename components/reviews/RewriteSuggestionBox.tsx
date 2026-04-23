"use client";

import { useMemo, useState } from "react";
import { Sparkles, RefreshCcw, Check } from "lucide-react";
import {
  rewriteReviewText,
  type ReviewRewriteResult,
} from "@/lib/reviews/rewriteReviewText";

type RewriteSuggestionBoxProps = {
  value: string;
  onApply: (result: ReviewRewriteResult) => void;
};

export function RewriteSuggestionBox({
  value,
  onApply,
}: RewriteSuggestionBoxProps) {
  const [hasGenerated, setHasGenerated] = useState(false);
  const [result, setResult] = useState<ReviewRewriteResult | null>(null);
  const [message, setMessage] = useState("");

  const canGenerate = useMemo(() => value.trim().length > 0, [value]);

  function handleGenerate() {
    setMessage("");

    if (!canGenerate) {
      setMessage("Najprv zadaj text recenzie.");
      return;
    }

    const rewriteResult = rewriteReviewText(value);

    setResult(rewriteResult);
    setHasGenerated(true);

    if (!rewriteResult.changed) {
      setMessage("Text nevyžadoval výraznejšiu úpravu.");
      return;
    }

    if (
      rewriteResult.removedSensitiveData &&
      rewriteResult.removedOffensiveLanguage
    ) {
      setMessage("Návrh odstránil osobné údaje aj nevhodné výrazy.");
      return;
    }

    if (rewriteResult.removedSensitiveData) {
      setMessage("Návrh odstránil možné osobné údaje.");
      return;
    }

    if (rewriteResult.removedOffensiveLanguage) {
      setMessage("Návrh zmiernil nevhodné alebo urážlivé výrazy.");
      return;
    }

    setMessage("Návrh upravil text do vecnejšej a zrozumiteľnejšej formy.");
  }

  function handleApply() {
    if (!result) return;
    onApply(result);
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-slate-50 p-4">
      <div>
        <p className="flex items-center gap-2 font-semibold text-slate-900">
          <Sparkles className="size-4" />
          Návrh bezpečnejšej verzie recenzie
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Systém vie navrhnúť vecnejšiu a kultivovanejšiu formuláciu, odstrániť
          zjavné osobné údaje a zmierniť nevhodné výrazy.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          <RefreshCcw className="size-4" />
          Navrhnúť upravenú verziu
        </button>

        {hasGenerated ? (
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Check className="size-4" />
            Použiť navrhnutú verziu
          </button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      {hasGenerated && result ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Navrhnutá verzia
          </label>
          <textarea
            value={result.rewrittenText}
            readOnly
            className="min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          />
        </div>
      ) : null}
    </div>
  );
}