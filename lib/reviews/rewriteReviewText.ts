import { analyzeReviewText } from "@/lib/reviews/analyzeReviewText";

export type ReviewRewriteResult = {
  originalText: string;
  rewrittenText: string;
  changed: boolean;
  removedSensitiveData: boolean;
  removedOffensiveLanguage: boolean;
  rewriteVersion: string;
};

const REWRITE_VERSION = "safe-rewrite-sk-v2";

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const PHONE_REGEX =
  /(?:\+421\s?\d{3}\s?\d{3}\s?\d{3})|(?:\b09\d{2}\s?\d{3}\s?\d{3}\b)/g;

const BIRTH_NUMBER_REGEX = /\b\d{6}\/?\d{3,4}\b/g;

const SOFT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bidiotka?\b/gi, "nevhodne sa správajúca osoba"],
  [/\bdebilka?\b/gi, "nevhodne sa správajúca osoba"],
  [/\bblbec\b/gi, "nevhodne sa správajúca osoba"],
  [/\bkrava\b/gi, "nevhodne sa správajúca osoba"],
  [/\bsvina\b/gi, "nevhodne sa správajúca osoba"],
  [/\bkokot\b/gi, "veľmi nevhodná osoba"],
  [/\bp[ií]č?a\b/gi, "veľmi nevhodná osoba"],
  [/\bkurva\b/gi, "veľmi nevhodné správanie"],
  [/\bhajzel\b/gi, "veľmi nevhodná osoba"],
  [/\bsprost(y|a|e|í|á)\b/gi, "nevhodný"],
  [/\botrasn(y|a|e|á)\b/gi, "veľmi slabý"],
  [/\bhrozn(y|a|e|á)\b/gi, "veľmi nepríjemný"],
  [/\bstr[aá]šn(y|a|e|á)\b/gi, "veľmi nepríjemný"],
  [/\botravn(y|a|e|á)\b/gi, "veľmi nepríjemný"],
];

const TONE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bbol to katastrofa\b/gi, "skúsenosť bola veľmi negatívna"],
  [/\bbolo to katastrofa\b/gi, "skúsenosť bola veľmi negatívna"],
  [/\bnikdy viac\b/gi, "takúto skúsenosť by som nechcel opakovať"],
  [/\burčite neodporúčam\b/gi, "na základe mojej skúsenosti neodporúčam"],
  [/\bneodporúčam\b/gi, "na základe mojej skúsenosti neodporúčam"],
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function ensureSentenceEnding(text: string) {
  if (!text) return text;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function rewriteReviewText(text: string): ReviewRewriteResult {
  let rewritten = text;
  let changed = false;
  let removedSensitiveData = false;
  let removedOffensiveLanguage = false;

  const before = analyzeReviewText(text);

  if (EMAIL_REGEX.test(rewritten)) {
    rewritten = rewritten.replace(EMAIL_REGEX, "[odstránený e-mail]");
    changed = true;
    removedSensitiveData = true;
  }

  if (PHONE_REGEX.test(rewritten)) {
    rewritten = rewritten.replace(PHONE_REGEX, "[odstránené telefónne číslo]");
    changed = true;
    removedSensitiveData = true;
  }

  if (BIRTH_NUMBER_REGEX.test(rewritten)) {
    rewritten = rewritten.replace(
      BIRTH_NUMBER_REGEX,
      "[odstránený osobný údaj]"
    );
    changed = true;
    removedSensitiveData = true;
  }

  for (const [pattern, replacement] of SOFT_REPLACEMENTS) {
    if (pattern.test(rewritten)) {
      rewritten = rewritten.replace(pattern, replacement);
      changed = true;
      removedOffensiveLanguage = true;
    }
  }

  for (const [pattern, replacement] of TONE_REPLACEMENTS) {
    if (pattern.test(rewritten)) {
      rewritten = rewritten.replace(pattern, replacement);
      changed = true;
    }
  }

  rewritten = normalizeWhitespace(rewritten);
  rewritten = ensureSentenceEnding(rewritten);

  const after = analyzeReviewText(rewritten);

  if (
    !changed &&
    !before.containsSensitiveData &&
    !before.containsOffensiveLanguage
  ) {
    return {
      originalText: text,
      rewrittenText: text,
      changed: false,
      removedSensitiveData: false,
      removedOffensiveLanguage: false,
      rewriteVersion: REWRITE_VERSION,
    };
  }

  if (
    !changed &&
    (after.containsSensitiveData || after.containsOffensiveLanguage)
  ) {
    rewritten =
      "Recenzia bola automaticky upravená do vecnejšej a bezpečnejšej podoby.";
    changed = true;
  }

  return {
    originalText: text,
    rewrittenText: rewritten,
    changed,
    removedSensitiveData,
    removedOffensiveLanguage,
    rewriteVersion: REWRITE_VERSION,
  };
}