// Rýchla heuristická lematizácia pre potreby prototypu.
// Nie je to plnohodnotný morfologický analyzátor pre slovenčinu.
// Cieľom je zjednotiť najčastejšie tvary slov do stabilnejšej podoby.

const LEMMA_OVERRIDES: Record<string, string> = {
  // zdravotnícke a doménové slová
  "lekara": "lekar",
  "lekarovi": "lekar",
  "lekarom": "lekar",
  "lekari": "lekar",

  "doktorovi": "doktor",
  "doktorom": "doktor",
  "doktora": "doktor",
  "doktori": "doktor",

  "sestricky": "sestricka",
  "sestricke": "sestricka",
  "sestricka": "sestricka",
  "sestrickou": "sestricka",

  "sestry": "sestra",
  "sestre": "sestra",
  "sestrou": "sestra",

  "ambulancie": "ambulancia",
  "ambulancii": "ambulancia",
  "ambulanciu": "ambulancia",

  "ordinacie": "ordinacia",
  "ordinacii": "ordinacia",
  "ordinaciu": "ordinacia",

  "cakarni": "cakaren",
  "cakarne": "cakaren",

  "komunikacii": "komunikacia",
  "komunikaciu": "komunikacia",

  "diagnozu": "diagnoza",
  "diagnozy": "diagnoza",

  "liecbu": "liecba",
  "liecby": "liecba",

  "organizacii": "organizacia",
  "organizaciu": "organizacia",

  "dostupnosti": "dostupnost",
  "dostupnostou": "dostupnost",

  "diskretnosti": "diskretnost",
  "sukromia": "sukromie",

  "vysetrenia": "vysetrenie",
  "vysetrenim": "vysetrenie",
  "vysetreniu": "vysetrenie",

  "pristupu": "pristup",
  "pristupom": "pristup",

  // slovesá časté v recenziách
  "vysvetlila": "vysvetlit",
  "vysvetlil": "vysvetlit",
  "vysvetlili": "vysvetlit",

  "komunikovala": "komunikovat",
  "komunikoval": "komunikovat",
  "komunikovali": "komunikovat",

  "pocuvala": "pocuvat",
  "pocuval": "pocuvat",
  "pocuvali": "pocuvat",

  "vysetrila": "vysetrit",
  "vysetril": "vysetrit",
  "vysetrili": "vysetrit",

  "odporucila": "odporucat",
  "odporucil": "odporucat",
  "odporucili": "odporucat",

  "neodporucila": "neodporucat",
  "neodporucil": "neodporucat",
  "neodporucili": "neodporucat",
};

// Kmene prídavných mien a hodnotiacich výrazov.
// Ak token zodpovedá jednému z týchto kmeňov,
// prevedie sa na základný mužský tvar s koncovkou -y.
const ADJECTIVE_STEMS = [
  "vyborn",
  "skvel",
  "perfektn",
  "prijemn",
  "mil",
  "ochotn",
  "neochotn",
  "profesionaln",
  "odborn",
  "empatick",
  "ustretov",
  "rychl",
  "cist",
  "spinav",
  "spokojn",
  "nespokojn",
  "kvalitn",
  "pozitivn",
  "negativn",
  "dobr",
  "slab",
  "arogantn",
  "neprijemn",
  "nekompetentn",
  "otrasn",
  "zanedban",
  "nevhodn",
  "nedostatocn",
  "problemov",
  "dostupn",
  "nedostupn",
  "sukromn",
  "diskretn",
];

const ADJECTIVE_ENDINGS = [
  "ymi",
  "ami",
  "ich",
  "ych",
  "emu",
  "eho",
  "ej",
  "ou",
  "om",
  "ym",
  "mi",
  "ho",
  "mu",
  "a",
  "e",
  "i",
];

function normalizeAdjectiveLikeToken(token: string) {
  for (const stem of ADJECTIVE_STEMS) {
    if (token === `${stem}y`) return token;

    for (const ending of ADJECTIVE_ENDINGS) {
      if (token === `${stem}${ending}`) {
        return `${stem}y`;
      }
    }
  }

  return token;
}

// Jemné pravidlá pre časté podstatné mená.
// Sú opatrné, aby príliš nerozbíjali slová.
function applySimpleNounRules(token: string) {
  if (token.endsWith("acie")) return token.slice(0, -4) + "acia";
  if (token.endsWith("acii")) return token.slice(0, -4) + "acia";
  if (token.endsWith("aciu")) return token.slice(0, -4) + "acia";

  if (token.endsWith("osti")) return token.slice(0, -4) + "ost";
  if (token.endsWith("ostou")) return token.slice(0, -5) + "ost";

  if (token.endsWith("enia")) return token.slice(0, -4) + "enie";
  if (token.endsWith("eniu")) return token.slice(0, -4) + "enie";
  if (token.endsWith("enim")) return token.slice(0, -4) + "enie";

  return token;
}

export function lemmatizeToken(token: string) {
  if (!token) return token;

  if (LEMMA_OVERRIDES[token]) {
    return LEMMA_OVERRIDES[token];
  }

  const adjectiveLike = normalizeAdjectiveLikeToken(token);
  if (adjectiveLike !== token) {
    return adjectiveLike;
  }

  return applySimpleNounRules(token);
}

export function lemmatizeTokens(tokens: string[]) {
  return tokens.map(lemmatizeToken);
}