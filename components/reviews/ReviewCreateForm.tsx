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
    <div className="rounded-2xl border bg-white p-4">
      <div>
        <p className="font-medium text-slate-900">{question.label}</p>
        <p className="mt-1 text-sm text-slate-500">{question.description}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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

        <span className="text-sm text-slate-600">Vybrané: {value}/5</span>
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
  const [messageType, setMessageType] = useState<"error" | "success" | "info">(
    "info"
  );
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

  async function handleSubmit() {
    setMessage("");
    setMessageType("info");
    setSaving(true);

    const guard = await guardClientWriteAction();

    if (!guard.allowed || !guard.userId) {
      setSaving(false);
      setMessageType("error");
      setMessage(guard.message ?? "Pre pridanie recenzie sa musíš prihlásiť.");
      return;
    }

    const targetPayload =
      targetType === "doctor"
        ? { id_doctor: targetId, id_facility: null }
        : { id_doctor: null, id_facility: targetId };

    const analysisPayload = buildReviewAnalysisPayload(finalComment);
    const requiresModeration = analysisPayload.needs_manual_review;

    const { data: insertedReview, error } = await supabase
      .from("reviews")
      .insert({
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
          moderation: {
            requiresModeration,
            reason: requiresModeration
              ? "Text recenzie bol automatickou analýzou označený na manuálnu kontrolu."
              : "Text recenzie nevyžaduje manuálnu kontrolu.",
          },
          questions: questions.map((question) => ({
            key: question.key,
            label: question.label,
            rating: ratings[question.key],
          })),
        },
        is_anonymous: isAnonymous,
        review_source: manualComment.trim() ? "free_text" : "structured_form",
        status: requiresModeration ? "pending" : "approved",
        ai_rewrite_suggested: rewriteMeta?.suggestedText ?? null,
        ai_rewrite_applied: rewriteMeta?.applied ?? false,
        ai_rewrite_generated_at: rewriteMeta?.applied
          ? new Date().toISOString()
          : null,
        ai_rewrite_version: rewriteMeta?.version ?? null,
        ...analysisPayload,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      setMessageType("error");
      setMessage(`Recenziu sa nepodarilo uložiť: ${error.message}`);
      return;
    }

    if (requiresModeration && insertedReview?.id) {
      const { error: notificationError } = await supabase.rpc(
        "notify_role_group",
        {
          p_role_slugs: ["admin", "moderator"],
          p_type: "system",
          p_content: {
            title: "Nová recenzia čaká na kontrolu",
            message:
              "Automatická analýza označila novú recenziu na manuálne posúdenie.",
            href: `/admin/reviews/${insertedReview.id}`,
            entity_type: "review",
            entity_id: insertedReview.id,
            target_type: targetType,
            target_id: targetId,
            target_name: targetName,
            priority: "high",
          },
        }
      );

      if (notificationError) {
        console.error("Nepodarilo sa odoslať staff notifikáciu:", notificationError);
      }
    }

    setSaving(false);

    if (requiresModeration) {
      setMessageType("success");
      setMessage(
        "Ďakujeme za odoslanie recenzie. Text komentára bol automaticky označený na manuálnu kontrolu, preto sa recenzia zatiaľ nezobrazí verejne. Skontroluje ju moderátor alebo administrátor."
      );
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
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Hodnotenie
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Hodnotíš
        </h2>

        <p className="mt-1 text-slate-600">{targetName}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <label
              htmlFor="visit-type"
              className="text-sm font-medium text-slate-700"
            >
              Typ skúsenosti
            </label>

            <select
              id="visit-type"
              value={visitType}
              onChange={(event) => setVisitType(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
            >
              {visitTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="mt-3 text-sm text-slate-600">
              Priebežné celkové hodnotenie: {average.exact}/5
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Hodnotenie sa vytvorí zo štruktúrovaných odpovedí. Voliteľne môžeš
              doplniť aj vlastný komentár k skúsenosti.
            </p>
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

          <div className="space-y-3 rounded-2xl border bg-white p-4">
            <div>
              <p className="font-medium text-slate-900">Voliteľný komentár</p>
              <p className="mt-1 text-sm text-slate-500">
                Sem môžeš doplniť vlastnú skúsenosť vlastnými slovami. Odporúča
                sa nepísať osobné údaje ani urážlivé výrazy.
              </p>
            </div>

            <textarea
              value={manualComment}
              onChange={(event) => setManualComment(event.target.value)}
              placeholder="Napíš komentár k návšteve..."
              className="min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            />

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
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="space-y-3 rounded-2xl border bg-white p-4">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Náhľad výslednej recenzie
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Toto je text, ktorý sa uloží a následne automaticky skontroluje.
              </p>
            </div>

            <textarea
              value={finalComment}
              readOnly
              className="min-h-40 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            />
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Recenzia sa pred zverejnením automaticky skontroluje. Ak systém
            nájde citlivé údaje, nevhodný jazyk alebo iný rizikový obsah,
            recenzia sa najskôr odošle moderátorovi alebo administrátorovi na
            kontrolu a verejne sa zobrazí až po schválení.
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
              className="size-4"
            />
            Zverejniť anonymne
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Kontroluje sa a ukladá..." : "Odoslať hodnotenie"}
          </button>

          {message ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                messageType === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {message}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}