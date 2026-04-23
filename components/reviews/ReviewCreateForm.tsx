"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buildReviewAnalysisPayload } from "@/lib/reviews/buildReviewAnalysisPayload";
import { guardClientWriteAction } from "@/lib/profile/clientActionGuard";

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
    description:
      "Subjektívne vnímanie technického a organizačného vybavenia.",
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
    <div className="space-y-2 rounded-2xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">{question.label}</p>
        <p className="mt-1 text-sm text-slate-600">{question.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
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
            <Star className="size-4 fill-current" />
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">Vybrané: {value}/5</p>
    </div>
  );
}

function getRatingWord(value: number) {
  if (value === 5) return "výborne";
  if (value === 4) return "dobre";
  if (value === 3) return "primerane";
  if (value === 2) return "skôr slabšie";
  return "nedostatočne";
}

function getOverallWord(average: number) {
  if (average >= 4.6) return "veľmi pozitívne";
  if (average >= 3.8) return "pozitívne";
  if (average >= 2.8) return "neutrálne";
  if (average >= 2) return "skôr negatívne";
  return "negatívne";
}

function getAverageRating(ratings: Ratings, questions: RatingQuestion[]) {
  const values = questions.map((question) => ratings[question.key]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    rounded: Math.round(average),
    exact: Number(average.toFixed(1)),
  };
}

function buildStructuredComment({
  targetType,
  ratings,
  questions,
  visitTypeLabel,
}: {
  targetType: "doctor" | "facility";
  ratings: Ratings;
  questions: RatingQuestion[];
  visitTypeLabel: string;
}) {
  const average = getAverageRating(ratings, questions).exact;
  const overall = getOverallWord(average);

  const strongAreas = questions
    .filter((question) => ratings[question.key] >= 4)
    .map((question) => question.label.toLowerCase());

  const weakerAreas = questions
    .filter((question) => ratings[question.key] <= 2)
    .map((question) => question.label.toLowerCase());

  const neutralAreas = questions
    .filter((question) => ratings[question.key] === 3)
    .map((question) => question.label.toLowerCase());

  const subject =
    targetType === "doctor"
      ? "návštevu lekára"
      : "návštevu zdravotníckeho zariadenia";

  const intro = `Používateľ hodnotil ${subject} prostredníctvom štruktúrovaného formulára. Typ skúsenosti: ${visitTypeLabel}. Celkové hodnotenie vyznieva ${overall}.`;

  const positiveSentence =
    strongAreas.length > 0
      ? `Najlepšie boli hodnotené oblasti: ${strongAreas.join(", ")}.`
      : "";

  const neutralSentence =
    neutralAreas.length > 0
      ? `Neutrálne boli hodnotené oblasti: ${neutralAreas.join(", ")}.`
      : "";

  const improvementSentence =
    weakerAreas.length > 0
      ? `Priestor na zlepšenie bol vnímaný najmä v oblastiach: ${weakerAreas.join(
          ", "
        )}.`
      : "Používateľ neoznačil žiadnu oblasť ako výrazne problematickú.";

  const detailSentence = questions
    .map(
      (question) =>
        `${question.label} bola hodnotená ${getRatingWord(
          ratings[question.key]
        )}.`
    )
    .join(" ");

  return [
    intro,
    positiveSentence,
    neutralSentence,
    improvementSentence,
    detailSentence,
  ]
    .filter(Boolean)
    .join(" ");
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

    const generatedComment = buildStructuredComment({
      targetType,
      ratings,
      questions,
      visitTypeLabel,
    });

    const analysisPayload = buildReviewAnalysisPayload(generatedComment);

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
      comment: generatedComment,
      generated_summary: {
        targetType,
        visitType,
        visitTypeLabel,
        average: average.exact,
        questions: questions.map((question) => ({
          key: question.key,
          label: question.label,
          rating: ratings[question.key],
        })),
      },
      is_anonymous: isAnonymous,
      status: analysisPayload.needs_manual_review ? "pending" : "approved",
      review_source: "structured_form",
      ...analysisPayload,
    });

    setSaving(false);

    if (error) {
      setMessage(`Recenziu sa nepodarilo uložiť: ${error.message}`);
      return;
    }

    router.push(
      targetType === "doctor" ? `/doctors/${targetId}` : `/facilities/${targetId}`
    );
    router.refresh();
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Hodnotenie
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">
          Hodnotíš
        </h2>
        <p className="mt-1 text-slate-700">{targetName}</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Typ skúsenosti
        </label>

        <select
          value={visitType}
          onChange={(event) => setVisitType(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
        >
          {visitTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="font-semibold text-slate-900">
          Priebežné celkové hodnotenie: {average.exact}/5
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Výsledná recenzia bude vytvorená automaticky zo zvolených kategórií,
          bez urážlivého alebo osobného textu.
        </p>
      </div>

      <div className="grid gap-4">
        {questions.map((question) => (
          <RatingInput
            key={question.key}
            question={question}
            value={ratings[question.key]}
            onChange={(value) => updateRating(question.key, value)}
          />
        ))}
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
        {saving ? "Ukladá sa..." : "Zverejniť hodnotenie"}
      </button>

      {message ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}