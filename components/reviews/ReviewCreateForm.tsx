// components/reviews/ReviewCreateForm.tsx

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { buildReviewAnalysisPayload } from "@/lib/reviews/buildReviewAnalysisPayload";
import { buildStructuredReviewComment } from "@/lib/reviews/buildStructuredReviewComment";
import { RewriteSuggestionBox } from "@/components/reviews/RewriteSuggestionBox";
import { guardClientWriteAction } from "@/lib/profile/clientActionGuard";

import type { ReviewRewriteResult } from "@/lib/reviews/rewriteReviewText";

type ReviewCreateFormProps = {
  targetType: "doctor" | "facility";
  targetId: string;
  targetName: string;
};

type RatingKey =
  | "communication"
  | "explanation"
  | "waitingTime"
  | "organization"
  | "approach"
  | "professionalism"
  | "cleanliness"
  | "environment"
  | "equipment"
  | "accessibility"
  | "privacy"
  | "recommendation";

type Ratings = Record<RatingKey, number>;

type RatingQuestion = {
  key: RatingKey;
  label: string;
  description: string;
};

const doctorQuestions: RatingQuestion[] = [
  {
    key: "communication",
    label: "Komunikácia lekára",
    description: "Zrozumiteľnosť, ochota počúvať a spôsob komunikácie.",
  },
  {
    key: "explanation",
    label: "Vysvetlenie postupu",
    description: "Či bol postup vyšetrenia alebo liečby vysvetlený jasne.",
  },
  {
    key: "approach",
    label: "Prístup k pacientovi",
    description: "Empatia, rešpekt a celkový ľudský prístup.",
  },
  {
    key: "professionalism",
    label: "Odbornosť a dôveryhodnosť",
    description: "Subjektívne vnímanie odborného a profesionálneho prístupu.",
  },
  {
    key: "waitingTime",
    label: "Čakanie na vyšetrenie",
    description: "Primeranosť čakacej doby a dodržanie termínu.",
  },
  {
    key: "organization",
    label: "Organizácia návštevy",
    description: "Objednanie, priebeh návštevy a informovanosť pacienta.",
  },
  {
    key: "privacy",
    label: "Súkromie pacienta",
    description: "Pocit diskrétnosti a ochrany súkromia počas návštevy.",
  },
  {
    key: "recommendation",
    label: "Odporúčanie ostatným",
    description: "Či by používateľ lekára odporučil iným pacientom.",
  },
];

const facilityQuestions: RatingQuestion[] = [
  {
    key: "communication",
    label: "Komunikácia personálu",
    description: "Ochota, zrozumiteľnosť informácií a prístup personálu.",
  },
  {
    key: "organization",
    label: "Organizácia zariadenia",
    description: "Objednávanie, orientácia, administratíva a priebeh návštevy.",
  },
  {
    key: "waitingTime",
    label: "Čakanie a vybavenie",
    description: "Primeranosť čakacej doby a plynulosť vybavenia.",
  },
  {
    key: "accessibility",
    label: "Dostupnosť zariadenia",
    description: "Dostupnosť lokality, vstupu, kontaktu a informácií.",
  },
  {
    key: "environment",
    label: "Prostredie",
    description: "Celkový dojem z priestorov zariadenia.",
  },
  {
    key: "cleanliness",
    label: "Čistota",
    description: "Vnímanie čistoty čakárne, ambulancie alebo priestorov.",
  },
  {
    key: "equipment",
    label: "Vybavenie",
    description: "Subjektívne vnímanie technického a organizačného vybavenia.",
  },
  {
    key: "privacy",
    label: "Súkromie pacienta",
    description: "Pocit diskrétnosti a ochrany súkromia v zariadení.",
  },
  {
    key: "recommendation",
    label: "Odporúčanie ostatným",
    description: "Či by používateľ zariadenie odporučil iným pacientom.",
  },
];

const visitTypes = [
  { value: "first_visit", label: "Prvá návšteva" },
  { value: "follow_up", label: "Kontrolná návšteva" },
  { value: "preventive", label: "Preventívna návšteva" },
  { value: "acute_problem", label: "Akútny problém" },
  { value: "administrative", label: "Administratívna záležitosť" },
  { value: "other", label: "Iný typ návštevy" },
];

function RatingInput({
  question,
  value,
  onChange,
}: {
  question: RatingQuestion;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">
          {question.label}
        </p>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          {question.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onChange(number)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
              value >= number
                ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
            aria-label={`${number} z 5`}
          >
            <Star
              className={`h-5 w-5 ${
                value >= number ? "fill-yellow-400" : "fill-transparent"
              }`}
            />
          </button>
        ))}

        <span className="ml-1 text-sm font-medium text-slate-600">
          {value}/5
        </span>
      </div>
    </div>
  );
}

function getAverageRating(ratings: Ratings, questions: RatingQuestion[]) {
  const values = questions.map((question) => ratings[question.key]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    rounded: Math.round(average),
    exact: Number(average.toFixed(1)),
  };
}

function buildFinalComment(structuredComment: string, manualComment: string) {
  const trimmedManual = manualComment.trim();

  if (!trimmedManual) {
    return structuredComment;
  }

  return [structuredComment, trimmedManual].join("\n\n---\n\n");
}

function formatReviewPreview(text: string) {
  return text
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ReviewCreateForm({
  targetType,
  targetId,
  targetName,
}: ReviewCreateFormProps) {
  const router = useRouter();

  const [ratings, setRatings] = useState<Ratings>({
    communication: 5,
    explanation: 5,
    waitingTime: 5,
    organization: 5,
    approach: 5,
    professionalism: 5,
    cleanliness: 5,
    environment: 5,
    equipment: 5,
    accessibility: 5,
    privacy: 5,
    recommendation: 5,
  });

  const [visitType, setVisitType] = useState("first_visit");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [manualComment, setManualComment] = useState("");
  const [rewriteMeta, setRewriteMeta] = useState<{
    suggestedText: string | null;
    applied: boolean;
    version: string | null;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const questions = targetType === "doctor" ? doctorQuestions : facilityQuestions;
  const average = getAverageRating(ratings, questions);

  const visitTypeLabel =
    visitTypes.find((item) => item.value === visitType)?.label ?? "Neuvedené";

  function updateRating(key: RatingKey, value: number) {
    setRatings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const structuredComment = useMemo(
    () =>
      buildStructuredReviewComment({
        targetType,
        ratings,
        questions,
        visitTypeLabel,
      }),
    [targetType, ratings, questions, visitTypeLabel]
  );

  const finalComment = useMemo(
    () => buildFinalComment(structuredComment, manualComment),
    [structuredComment, manualComment]
  );

  const structuredPreviewParts = useMemo(
    () => formatReviewPreview(structuredComment),
    [structuredComment]
  );

  async function handleSubmit() {
    setMessage("");
    setSaving(true);

    const guard = await guardClientWriteAction();

    if (!guard.allowed || !guard.userId) {
      setSaving(false);
      setMessage(guard.message ?? "Pre pridanie recenzie sa musíš prihlásiť.");
      return;
    }

    const targetPayload =
      targetType === "doctor"
        ? { id_doctor: targetId, id_facility: null }
        : { id_doctor: null, id_facility: targetId };

    const analysisPayload = buildReviewAnalysisPayload(finalComment);

    const { error } = await supabase.from("reviews").insert({
      ...targetPayload,
      id_user: guard.userId,
      rating: average.rounded,
      rating_communication: ratings.communication,
      rating_explanation: ratings.explanation,
      rating_waiting_time: ratings.waitingTime,
      rating_organization: ratings.organization,
      rating_approach: ratings.approach,
      rating_professionalism: ratings.professionalism,
      rating_cleanliness: ratings.cleanliness,
      rating_environment: ratings.environment,
      rating_equipment: ratings.equipment,
      rating_accessibility: ratings.accessibility,
      rating_privacy: ratings.privacy,
      rating_recommendation: ratings.recommendation,
      visit_type: visitType,
      comment: finalComment,
      generated_summary: {
        targetType,
        visitType,
        visitTypeLabel,
        average: average.exact,
        structuredComment,
        manualComment: manualComment.trim() || null,
        questions: questions.map((question) => ({
          key: question.key,
          label: question.label,
          rating: ratings[question.key],
        })),
      },
      is_anonymous: isAnonymous,
      review_source: manualComment.trim() ? "manual" : "structured_form",
      status: analysisPayload.needs_manual_review ? "pending" : "approved",
      ai_rewrite_suggested: rewriteMeta?.suggestedText ?? null,
      ai_rewrite_applied: rewriteMeta?.applied ?? false,
      ai_rewrite_generated_at: rewriteMeta?.applied
        ? new Date().toISOString()
        : null,
      ai_rewrite_version: rewriteMeta?.version ?? null,
      ...analysisPayload,
    });

    setSaving(false);

    if (error) {
      setMessage(`Recenziu sa nepodarilo uložiť: ${error.message}`);
      return;
    }

    router.push(
      targetType === "doctor"
        ? `/doctors/${targetId}`
        : `/facilities/${targetId}`
    );
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
              Nové hodnotenie
            </p>

            <h2 className="mt-1 max-w-3xl text-2xl font-bold leading-tight text-slate-950">
              {targetName}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Hodnotenie môžeš vytvoriť dvoma spôsobmi: cez číselné hodnotenie
              jednotlivých oblastí a cez vlastný komentár. Komentár je
              voliteľný.
            </p>
          </div>

          <div className="w-full rounded-2xl bg-sky-50 px-4 py-3 text-center sm:w-auto sm:min-w-32">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
              Celkové hodnotenie
            </p>
            <p className="mt-1 text-3xl font-bold text-sky-900">
              {average.exact}/5
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Spôsob hodnotenia 1
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-950">
                Štruktúrované hodnotenie
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Vyber typ skúsenosti a ohodnoť jednotlivé oblasti. Z odpovedí sa
                automaticky vytvorí stručná recenzia.
              </p>
            </div>

            <div className="mb-5">
              <label
                htmlFor="visit-type"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Typ skúsenosti
              </label>

              <select
                id="visit-type"
                value={visitType}
                onChange={(event) => setVisitType(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
              >
                {visitTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {questions.map((question) => (
                <RatingInput
                  key={question.key}
                  question={question}
                  value={ratings[question.key]}
                  onChange={(value) => updateRating(question.key, value)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Spôsob hodnotenia 2
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-950">
                Vlastný komentár
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Tu môžeš doplniť vlastnú skúsenosť vlastnými slovami. Nepíš
                osobné údaje, diagnózy iných osôb ani urážlivé výrazy.
              </p>
            </div>

            <textarea
              value={manualComment}
              onChange={(event) => setManualComment(event.target.value)}
              placeholder="Napíš komentár k návšteve..."
              className="min-h-36 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />

            <div className="mt-4">
              <RewriteSuggestionBox
                value={manualComment}
                onApply={(result: ReviewRewriteResult) => {
                  setManualComment(result.rewrittenText);
                  setRewriteMeta({
                    suggestedText: result.rewrittenText,
                    applied: true,
                    version: result.rewriteVersion,
                  });
                }}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-950">
                Náhľad recenzie
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Takto bude recenzia uložená a následne vyhodnotená systémom.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">
                    Súhrn z hodnotenia
                  </p>

                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                    {average.exact}/5
                  </span>
                </div>

                <div className="space-y-3">
                  {structuredPreviewParts.map((part, index) => (
                    <p key={index} className="text-sm leading-6 text-slate-700">
                      {part}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">
                  Komentár
                </p>

                {manualComment.trim() ? (
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                    {manualComment.trim()}
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Komentár zatiaľ nie je vyplnený. Recenziu môžeš odoslať aj
                    bez neho.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
                className="mt-1 size-4 rounded border-slate-300"
              />

              <span>
                <span className="block font-medium text-slate-900">
                  Zverejniť anonymne
                </span>

                <span className="mt-1 block text-slate-500">
                  Tvoje meno sa pri recenzii verejne nezobrazí.
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Ukladá sa..." : "Zverejniť hodnotenie"}
            </button>

            {message ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}