import { analyzeReviewText } from "@/lib/reviews/analyzeReviewText";
import { classifyReviewWithTfIdf } from "@/lib/reviews/classifyReviewWithTfIdf";

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
  tfidf_categories: string[];
  tfidf_scores: Record<string, number>;
  tfidf_top_terms: string[];
  tfidf_version: string;
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
      tfidf_categories: [],
      tfidf_scores: {},
      tfidf_top_terms: [],
      tfidf_version: "tfidf-sk-v1",
    };
  }

  const analysis = analyzeReviewText(text);
  const tfidf = classifyReviewWithTfIdf(text);

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
    tfidf_categories: tfidf.categories,
    tfidf_scores: tfidf.scores,
    tfidf_top_terms: tfidf.topTerms,
    tfidf_version: tfidf.version,
  };
}