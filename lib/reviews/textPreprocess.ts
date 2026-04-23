export type PreprocessedText = {
  original: string;
  normalized: string;
  cleaned: string;
  tokens: string[];
};

const DIACRITICS_MAP: Record<string, string> = {
  á: "a",
  ä: "a",
  č: "c",
  ď: "d",
  é: "e",
  í: "i",
  ľ: "l",
  ĺ: "l",
  ň: "n",
  ó: "o",
  ô: "o",
  ŕ: "r",
  š: "s",
  ť: "t",
  ú: "u",
  ý: "y",
  ž: "z",
};

export function removeSlovakDiacritics(text: string) {
  return text.replace(
    /[áäčďéíľĺňóôŕšťúýž]/g,
    (char) => DIACRITICS_MAP[char] ?? char
  );
}

export function normalizeReviewText(text: string) {
  return removeSlovakDiacritics(text.toLowerCase()).trim();
}

export function cleanReviewText(text: string) {
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[.,!?;:()"“”„'`/\\[\]{}<>|_*+=~^-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeReviewText(text: string) {
  if (!text.trim()) return [];

  return text
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function preprocessReviewText(text: string): PreprocessedText {
  const normalized = normalizeReviewText(text);
  const cleaned = cleanReviewText(normalized);
  const tokens = tokenizeReviewText(cleaned);

  return {
    original: text,
    normalized,
    cleaned,
    tokens,
  };
}