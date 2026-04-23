import { TFIDF_CATEGORY_CORPUS } from "@/lib/reviews/tfidfCategoryCorpus";
import {
  buildInverseDocumentFrequency,
  buildTfIdfVector,
  cosineSimilarity,
  getTopWeightedTerms,
  preprocessForTfIdf,
} from "@/lib/reviews/tfidf";

export type TfIdfClassificationResult = {
  categories: string[];
  scores: Record<string, number>;
  topTerms: string[];
  version: string;
};

const TFIDF_VERSION = "tfidf-sk-v1";

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function classifyReviewWithTfIdf(text: string): TfIdfClassificationResult {
  const reviewTokens = preprocessForTfIdf(text);

  const corpusDocs: string[][] = [];
  const categoryDocs: Record<string, string[][]> = {};

  for (const [category, docs] of Object.entries(TFIDF_CATEGORY_CORPUS)) {
    categoryDocs[category] = docs.map((doc) => preprocessForTfIdf(doc));
    corpusDocs.push(...categoryDocs[category]);
  }

  corpusDocs.push(reviewTokens);

  const idf = buildInverseDocumentFrequency(corpusDocs);
  const reviewVector = buildTfIdfVector(reviewTokens, idf);

  const scores: Record<string, number> = {};

  for (const [category, docs] of Object.entries(categoryDocs)) {
    let bestScore = 0;

    for (const docTokens of docs) {
      const categoryVector = buildTfIdfVector(docTokens, idf);
      const similarity = cosineSimilarity(reviewVector, categoryVector);

      if (similarity > bestScore) {
        bestScore = similarity;
      }
    }

    scores[category] = round(bestScore);
  }

  const categories = Object.entries(scores)
    .filter(([, score]) => score >= 0.08)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([category]) => category);

  const topTerms = getTopWeightedTerms(reviewVector, 8);

  return {
    categories,
    scores,
    topTerms,
    version: TFIDF_VERSION,
  };
}