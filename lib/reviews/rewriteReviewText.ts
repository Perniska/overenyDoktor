import { analyzeReviewText } from "@/lib/reviews/analyzeReviewText";

export type ReviewRewriteResult = {
  originalText: string;
  rewrittenText: string;
  changed: boolean;
  removedSensitiveData: boolean;
  removedOffensiveLanguage: boolean;
  rewriteVersion: string;
};

const REWRITE_VERSION = "safe-rewrite-sk-v5";

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const PHONE_REGEX =
  /(?:\+421\s?\d{3}\s?\d{3}\s?\d{3})|(?:\b09\d{2}\s?\d{3}\s?\d{3}\b)/g;

const BIRTH_NUMBER_REGEX = /\b\d{6}\/?\d{3,4}\b/g;

const OFFENSIVE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bidiot(k?a|ka|ko|i|ky|iek)?\b/gi, "nevhodná osoba"],
  [/\bdebil(k?a|ka|ko|i|ky|iek)?\b/gi, "nevhodná osoba"],
  [/\bimbecil(k?a|ka|ko|i|ky)?\b/gi, "nevhodná osoba"],
  [/\bblbec\b/gi, "nevhodná osoba"],
  [/\bblb(k?a|ec|ca|eček|ecek)?\b/gi, "nevhodná osoba"],
  [/\bkrav(a|ka|ička|icka|y)?\b/gi, "nevhodná osoba"],
  [/\bsvin(a|ka|e|y)?\b/gi, "nevhodná osoba"],
  [/\bhus(a|ka|i)?\b/gi, "nevhodná osoba"],
  [/\btrub(a|ka|i)?\b/gi, "nevhodná osoba"],
  [/\bmagor(k?a|i|ka)?\b/gi, "nevhodná osoba"],
  [/\bpsych(o|opat|opatka)?\b/gi, "veľmi nevhodná osoba"],
  [/\bimpotent(ny|ná|na|ne|i)?\b/gi, "nevhodná osoba"],
  [/\bkreten(k?a|i|ka)?\b/gi, "nevhodná osoba"],
  [/\bp[ií]c(a|ka|ko|ovina|oviny|e)?\b/gi, "veľmi nevhodná osoba"],
  [/\bretard(ovany|ovaná|ovane|ovaný|i|ka)?\b/gi, "nevhodná osoba"],
  [/\bprimitiv(ny|na|ne|i)?\b/gi, "nevhodná osoba"],
  [/\bsedlak\b/gi, "nevhodná osoba"],
  [/\bhovad(o|om|a)?\b/gi, "nevhodná osoba"],
  [/\bkokot(k?o|ik|isko|i|y)?\b/gi, "veľmi nevhodná osoba"],
  [/\bkoko(s|t)?\b/gi, "veľmi nevhodná osoba"],
  [/\bp[ií]č(a|ka|ko|ovina|oviny|e)?\b/gi, "veľmi nevhodná osoba"],
  [/\bpičus(k?a|ko|i)?\b/gi, "veľmi nevhodná osoba"],
  [/\bpičovina\b/gi, "veľmi nevhodné správanie"],
  [/\bkurv(a|ami|y|ička|icka)?\b/gi, "veľmi nevhodné správanie"],
  [/\bkurvička\b/gi, "veľmi nevhodné správanie"],
  [/\bkurvenie\b/gi, "veľmi nevhodné správanie"],
  [/\bhajzel(a|ko|ik|i)?\b/gi, "veľmi nevhodná osoba"],
  [/\bzmrd(a|ik|i)?\b/gi, "veľmi nevhodná osoba"],
  [/\bchuj\b/gi, "veľmi nevhodná osoba"],
  [/\bdement(ny|na|ne|i)?\b/gi, "nevhodná osoba"],
  [/\bjebnut(y|a|e|í|á|i|ost|osť)?\b/gi, "veľmi nevhodný"],
  [/\bdojeb(an|aná|ane|any|aný)?\b/gi, "veľmi neprijateľný"],
  [/\bzjeb(an|aná|ane|any|aný)?\b/gi, "veľmi neprijateľný"],
  [/\bpojeb(an|aná|ane|any|aný)?\b/gi, "veľmi neprijateľný"],
  [/\bprijeban(y|a|e|í|á)?\b/gi, "veľmi nevhodný"],
  [/\bhnus(ny|na|ne|í|á|oba)?\b/gi, "veľmi nepríjemný"],
  [/\botrav(ny|na|ne|í|á)?\b/gi, "veľmi nepríjemný"],
  [/\bsprost(y|a|e|í|á)?\b/gi, "nevhodný"],
  [/\botras(ny|na|ne|í|á)?\b/gi, "veľmi slabý"],
  [/\bhroz(ny|na|ne|í|á)?\b/gi, "veľmi nepríjemný"],
  [/\bstr[aá]š(ny|na|ne|í|á)?\b/gi, "veľmi nepríjemný"],
  [/\bodporn(y|a|e|í|á)?\b/gi, "veľmi neprijateľný"],
  [/\bnechut(ny|na|ne|í|á)?\b/gi, "veľmi neprijateľný"],
  [/\barogant(ny|na|ne|í|á)?\b/gi, "veľmi nevhodný"],
  [/\bdrz(y|a|e|á)?\b/gi, "veľmi nevhodný"],
  [/\botrasn[aá]\b/gi, "veľmi slabá"],
  [/\bhnus[aá]\b/gi, "veľmi nepríjemná"],
];

const TONE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bbol to katastrofa\b/gi, "skúsenosť bola veľmi negatívna"],
  [/\bbolo to katastrofa\b/gi, "skúsenosť bola veľmi negatívna"],
  [/\bčistá katastrofa\b/gi, "skúsenosť bola veľmi negatívna"],
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

function uppercaseFirst(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function stripDiacritics(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokenize(text: string) {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function detectSummaryIntent(tokens: string[]) {
  const hasNegative =
    tokens.some((t) =>
      [
        "neprijemna",
        "neprijemny",
        "otravna",
        "otravny",
        "hnusna",
        "hnusny",
        "arogantna",
        "arogantny",
        "drza",
        "drzy",
        "sprosta",
        "sprosty",
        "otrasna",
        "otrasny",
        "hrozna",
        "hrozny",
        "strasna",
        "strasny",
        "jebnuta",
        "jebnuty",
        "pica",
        "picu",
        "piča",
        "kokot",
        "magor",
        "truba",
        "husa",
        "debil",
        "idiot",
        "krava",
        "svina",
      ].includes(t)
    ) || false;

  const hasStaffHint = tokens.some((t) =>
    [
      "doktor",
      "lekar",
      "lekarka",
      "sestra",
      "sestricka",
      "personal",
      "recepcia",
      "ambulancia",
      "pani",
      "pan",
    ].includes(t)
  );

  return {
    hasNegative,
    hasStaffHint,
  };
}

function buildNaturalSummary(text: string) {
  const tokens = tokenize(text);
  const { hasNegative, hasStaffHint } = detectSummaryIntent(tokens);

  if (!hasNegative) {
    return null;
  }

  if (hasStaffHint) {
    return "Správanie personálu bolo veľmi nepríjemné a nevhodné.";
  }

  return "Skúsenosť bola formulovaná nevhodným spôsobom a bola upravená do vecnejšej podoby.";
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

  for (const [pattern, replacement] of OFFENSIVE_REPLACEMENTS) {
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

  const naturalSummary = buildNaturalSummary(text);

  if (removedOffensiveLanguage && naturalSummary) {
    rewritten = naturalSummary;
    changed = true;
  }

  if (changed) {
    rewritten = normalizeWhitespace(rewritten);
    rewritten = uppercaseFirst(rewritten);
    rewritten = ensureSentenceEnding(rewritten);
  }

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

  if (!changed) {
    rewritten =
      "Text recenzie bol upravený do vecnejšej a bezpečnejšej formulácie.";
    changed = true;
  }

  if (after.containsOffensiveLanguage) {
    rewritten = naturalSummary
      ? naturalSummary
      : "Správanie bolo opísané nevhodným spôsobom a text bol upravený do vecnejšej podoby.";
  }

  rewritten = normalizeWhitespace(rewritten);
  rewritten = uppercaseFirst(rewritten);
  rewritten = ensureSentenceEnding(rewritten);

  return {
    originalText: text,
    rewrittenText: rewritten,
    changed,
    removedSensitiveData,
    removedOffensiveLanguage,
    rewriteVersion: REWRITE_VERSION,
  };
}