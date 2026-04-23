import { analyzeReviewText } from "@/lib/reviews/analyzaReviewText";

export type ReviewAnalysisDbPayload = {
  sentiment_score: number;
  sentiment_label: "positive" | "neutral" | "negative";
  sentiment_confidence: number;
  detected_categories: string[];
  aspect_scores: Record<string, number>;
  contains_sensitive_data: boolean;
  contains_offensive_language: boolean;
  needs_manual_review: boolean;
  analysis_version: string;
};

export function buildReviewAnalysisPayload(
  comment?: string | null
): ReviewAnalysisDbPayload {
  const text = (comment ?? "").trim();

  if (!text) {
    return {
      sentiment_score: 0,
      sentiment_label: "neutral",
      sentiment_confidence: 0,
      detected_categories: [],
      aspect_scores: {},
      contains_sensitive_data: false,
      contains_offensive_language: false,
      needs_manual_review: false,
      analysis_version: "lexicon-sk-v1",
    };
  }

  const analysis = analyzeReviewText(text);

  return {
    sentiment_score: analysis.sentimentScore,
    sentiment_label: analysis.sentimentLabel,
    sentiment_confidence: analysis.sentimentConfidence,
    detected_categories: analysis.detectedCategories,
    aspect_scores: analysis.aspectScores,
    contains_sensitive_data: analysis.containsSensitiveData,
    contains_offensive_language: analysis.containsOffensiveLanguage,
    needs_manual_review: analysis.needsManualReview,
    analysis_version: analysis.analysisVersion,
  };
}