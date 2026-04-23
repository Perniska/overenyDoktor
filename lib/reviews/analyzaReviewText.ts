import { preprocessReviewText } from "@/lib/reviews/textPreprocess";
import {
  hasNegativeWord,
  hasOffensiveWord,
  hasPositiveWord,
  isIntensifier,
  isNegation,
} from "@/lib/reviews/sentimentLexicon";
import {
  REVIEW_ASPECTS,
  getDetectedAspectCategories,
} from "@/lib/reviews/aspectLexicon";

export type ReviewAnalysisResult = {
  sentimentScore: number;
  sentimentLabel: "positive" | "neutral" | "negative";
  sentimentConfidence: number;
  detectedCategories: string[];
  aspectScores: Record<string, number>;
  containsSensitiveData: boolean;
  containsOffensiveLanguage: boolean;
  needsManualReview: boolean;
  analysisVersion: string;
};

type SentimentCounters = {
  positiveHits: number;
  negativeHits: number;
  relevantHits: number;
};

const ANALYSIS_VERSION = "lexicon-sk-v1";

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX =
  /(?:\+421\s?\d{3}\s?\d{3}\s?\d{3})|(?:\b09\d{2}\s?\d{3}\s?\d{3}\b)/;
const BIRTH_NUMBER_REGEX = /\b\d{6}\/?\d{3,4}\b/;

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function detectSensitiveData(text: string) {
  return (
    EMAIL_REGEX.test(text) ||
    PHONE_REGEX.test(text) ||
    BIRTH_NUMBER_REGEX.test(text)
  );
}

function calculateSentimentFromTokens(tokens: string[]): SentimentCounters {
  let positiveHits = 0;
  let negativeHits = 0;
  let relevantHits = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    const previous2 = tokens[index - 2];

    const negated =
      (previous && isNegation(previous)) ||
      (previous2 && isNegation(previous2));

    const intensified =
      (previous && isIntensifier(previous)) ||
      (previous2 && isIntensifier(previous2));

    const weight = intensified ? 2 : 1;

    if (hasPositiveWord(token)) {
      relevantHits += 1;
      if (negated) {
        negativeHits += weight;
      } else {
        positiveHits += weight;
      }
    }

    if (hasNegativeWord(token)) {
      relevantHits += 1;
      if (negated) {
        positiveHits += weight;
      } else {
        negativeHits += weight;
      }
    }
  }

  return {
    positiveHits,
    negativeHits,
    relevantHits,
  };
}

function calculateAspectScores(tokens: string[]) {
  const aspectScores: Record<string, number> = {};

  for (const [aspectKey, aspectTerms] of Object.entries(REVIEW_ASPECTS)) {
    const matchingIndexes: number[] = [];

    tokens.forEach((token, index) => {
      if (aspectTerms.includes(token)) {
        matchingIndexes.push(index);
      }
    });

    if (matchingIndexes.length === 0) continue;

    let positiveHits = 0;
    let negativeHits = 0;

    for (const index of matchingIndexes) {
      const windowStart = Math.max(0, index - 3);
      const windowEnd = Math.min(tokens.length - 1, index + 3);

      for (let i = windowStart; i <= windowEnd; i += 1) {
        const token = tokens[i];
        const previous = tokens[i - 1];
        const previous2 = tokens[i - 2];

        const negated =
          (previous && isNegation(previous)) ||
          (previous2 && isNegation(previous2));

        const intensified =
          (previous && isIntensifier(previous)) ||
          (previous2 && isIntensifier(previous2));

        const weight = intensified ? 2 : 1;

        if (hasPositiveWord(token)) {
          if (negated) {
            negativeHits += weight;
          } else {
            positiveHits += weight;
          }
        }

        if (hasNegativeWord(token)) {
          if (negated) {
            positiveHits += weight;
          } else {
            negativeHits += weight;
          }
        }
      }
    }

    const denominator = Math.max(1, positiveHits + negativeHits);
    aspectScores[aspectKey] = roundToTwo(
      clamp((positiveHits - negativeHits) / denominator, -1, 1)
    );
  }

  return aspectScores;
}

function calculateConfidence(relevantHits: number) {
  const threshold = 6;
  return roundToTwo(clamp(relevantHits / threshold, 0, 1));
}

function getSentimentScore(positiveHits: number, negativeHits: number) {
  const denominator = Math.max(1, positiveHits + negativeHits);
  return roundToTwo(clamp((positiveHits - negativeHits) / denominator, -1, 1));
}

function getSentimentLabel(
  score: number
): "positive" | "neutral" | "negative" {
  if (score > 0.2) return "positive";
  if (score < -0.2) return "negative";
  return "neutral";
}

function detectOffensiveLanguage(tokens: string[]) {
  return tokens.some((token) => hasOffensiveWord(token));
}

function decideNeedsManualReview(input: {
  containsSensitiveData: boolean;
  containsOffensiveLanguage: boolean;
  sentimentScore: number;
}) {
  return (
    input.containsSensitiveData ||
    input.containsOffensiveLanguage ||
    input.sentimentScore <= -0.8
  );
}

export function analyzeReviewText(text: string): ReviewAnalysisResult {
  const preprocessed = preprocessReviewText(text);

  const { positiveHits, negativeHits, relevantHits } =
    calculateSentimentFromTokens(preprocessed.tokens);

  const sentimentScore = getSentimentScore(positiveHits, negativeHits);
  const sentimentLabel = getSentimentLabel(sentimentScore);
  const sentimentConfidence = calculateConfidence(relevantHits);
  const detectedCategories = getDetectedAspectCategories(preprocessed.tokens);
  const aspectScores = calculateAspectScores(preprocessed.tokens);
  const containsSensitiveData = detectSensitiveData(preprocessed.original);
  const containsOffensiveLanguage = detectOffensiveLanguage(preprocessed.tokens);
  const needsManualReview = decideNeedsManualReview({
    containsSensitiveData,
    containsOffensiveLanguage,
    sentimentScore,
  });

  return {
    sentimentScore,
    sentimentLabel,
    sentimentConfidence,
    detectedCategories,
    aspectScores,
    containsSensitiveData,
    containsOffensiveLanguage,
    needsManualReview,
    analysisVersion: ANALYSIS_VERSION,
  };
}