export const POSITIVE_WORDS = [
  "vyborny",
  "vyborna",
  "vyborne",
  "skvely",
  "skvela",
  "skvele",
  "perfektny",
  "perfektna",
  "perfektne",
  "prijemny",
  "prijemna",
  "prijemne",
  "mily",
  "mila",
  "mile",
  "ochotny",
  "ochotna",
  "ochotne",
  "profesionalny",
  "profesionalna",
  "profesionalne",
  "odborny",
  "odborna",
  "odborne",
  "empaticky",
  "empaticka",
  "empaticke",
  "ustretovy",
  "ustretova",
  "ustretove",
  "rychly",
  "rychla",
  "rychle",
  "cisty",
  "cista",
  "ciste",
  "spokojny",
  "spokojna",
  "spokojne",
  "odporucam",
  "dopporucam",
  "super",
  "kvalitny",
  "kvalitna",
  "kvalitne",
];

export const NEGATIVE_WORDS = [
  "zly",
  "zla",
  "zle",
  "hrozny",
  "hrozna",
  "hrozne",
  "strasny",
  "strasna",
  "strasne",
  "arogantny",
  "arogantna",
  "arogantne",
  "neprijemny",
  "neprijemna",
  "neprijemne",
  "neochotny",
  "neochotna",
  "neochotne",
  "chaos",
  "dlho",
  "meskanie",
  "spinavy",
  "spinava",
  "spinave",
  "nekompetentny",
  "nekompetentna",
  "nekompetentne",
  "nespokojny",
  "nespokojna",
  "nespokojne",
  "otrasny",
  "otresna",
  "otrasne",
  "katastrofa",
  "problem",
  "problemy",
  "slaby",
  "slaba",
  "slabe",
  "zanedbany",
  "zanedbana",
  "zanedbane",
  "nevhodny",
  "nevhodna",
  "nevhodne",
];

export const INTENSIFIERS = [
  "velmi",
  "mimoriadne",
  "extremne",
  "naozaj",
  "fakt",
  "prilis",
  "moc",
  "dost",
];

export const NEGATIONS = [
  "nie",
  "nikdy",
  "ziadny",
  "ziadna",
  "ziadne",
  "ani",
];

export const OFFENSIVE_WORDS = [
  "idiot",
  "idiotka",
  "debil",
  "debilka",
  "blbec",
  "krava",
  "svina",
  "kokot",
  "pica",
  "kurva",
  "hajzel",
  "sprosty",
  "sprosta",
  "sproste",
];

export function hasPositiveWord(token: string) {
  return POSITIVE_WORDS.includes(token);
}

export function hasNegativeWord(token: string) {
  return NEGATIVE_WORDS.includes(token);
}

export function isIntensifier(token: string) {
  return INTENSIFIERS.includes(token);
}

export function isNegation(token: string) {
  return NEGATIONS.includes(token);
}

export function hasOffensiveWord(token: string) {
  return OFFENSIVE_WORDS.includes(token);
}