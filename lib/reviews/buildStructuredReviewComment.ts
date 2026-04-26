type TargetType = "doctor" | "facility";

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

function getAverageRating(ratings: Ratings, questions: RatingQuestion[]) {
  const values = questions.map((question) => ratings[question.key]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    rounded: Math.round(average),
    exact: Number(average.toFixed(1)),
  };
}

function getOverallSentence(average: number, targetType: TargetType) {
  const subject =
    targetType === "doctor" ? "návštevy lekára" : "návštevy zariadenia";

  if (average >= 4.6) return `Celkový dojem z ${subject} bol veľmi pozitívny.`;
  if (average >= 3.8) return `Celkový dojem z ${subject} bol pozitívny.`;
  if (average >= 2.8) return `Celkový dojem z ${subject} bol skôr neutrálny.`;
  if (average >= 2) return `Celkový dojem z ${subject} bol skôr negatívny.`;

  return `Celkový dojem z ${subject} bol výrazne negatívny.`;
}

function formatAreaList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} a ${items[1]}`;

  return `${items.slice(0, -1).join(", ")} a ${items[items.length - 1]}`;
}

function getReadableLabel(label: string) {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function buildStructuredReviewComment({
  targetType,
  ratings,
  questions,
  visitTypeLabel,
}: {
  targetType: TargetType;
  ratings: Ratings;
  questions: RatingQuestion[];
  visitTypeLabel: string;
}) {
  const average = getAverageRating(ratings, questions).exact;

  const strongAreas = questions
    .filter((question) => ratings[question.key] >= 4)
    .map((question) => getReadableLabel(question.label));

  const neutralAreas = questions
    .filter((question) => ratings[question.key] === 3)
    .map((question) => getReadableLabel(question.label));

  const weakAreas = questions
    .filter((question) => ratings[question.key] <= 2)
    .map((question) => getReadableLabel(question.label));

  const visitInfo = `Typ návštevy: ${visitTypeLabel}.`;
  const overall = getOverallSentence(average, targetType);

  const strengths =
    strongAreas.length > 0
      ? `Najlepšie boli hodnotené oblasti: ${formatAreaList(strongAreas)}.`
      : "";

  const weaknesses =
    weakAreas.length > 0
      ? `Najväčší priestor na zlepšenie bol v oblastiach: ${formatAreaList(
          weakAreas
        )}.`
      : "Používateľ neoznačil žiadnu oblasť ako výrazne problematickú.";

  const neutral =
    neutralAreas.length > 0
      ? `Priemerne boli hodnotené oblasti: ${formatAreaList(neutralAreas)}.`
      : "";

  return [visitInfo, overall, strengths, weaknesses, neutral]
    .filter((part) => part !== "")
    .join("\n\n");
}