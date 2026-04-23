import { preprocessReviewText } from "@/lib/reviews/textPreprocess";

export type TfIdfVector = Record<string, number>;

export function buildTermFrequency(tokens: string[]) {
  const tf: Record<string, number> = {};
  const total = Math.max(tokens.length, 1);

  for (const token of tokens) {
    tf[token] = (tf[token] ?? 0) + 1;
  }

  for (const key of Object.keys(tf)) {
    tf[key] = tf[key] / total;
  }

  return tf;
}

export function buildInverseDocumentFrequency(docs: string[][]) {
  const docCount = docs.length;
  const df: Record<string, number> = {};

  for (const tokens of docs) {
    const seen = new Set(tokens);
    for (const token of seen) {
      df[token] = (df[token] ?? 0) + 1;
    }
  }

  const idf: Record<string, number> = {};

  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log((docCount + 1) / (count + 1)) + 1;
  }

  return idf;
}

export function buildTfIdfVector(tokens: string[], idf: Record<string, number>): TfIdfVector {
  const tf = buildTermFrequency(tokens);
  const vector: TfIdfVector = {};

  for (const [term, tfValue] of Object.entries(tf)) {
    vector[term] = tfValue * (idf[term] ?? 0);
  }

  return vector;
}

export function cosineSimilarity(a: TfIdfVector, b: TfIdfVector) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const key of keys) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function preprocessForTfIdf(text: string) {
  return preprocessReviewText(text).tokens;
}

export function getTopWeightedTerms(vector: TfIdfVector, limit = 8) {
  return Object.entries(vector)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}