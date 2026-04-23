export const TFIDF_CATEGORY_CORPUS: Record<string, string[]> = {
  komunikacia: [
    "komunikacia lekara komunikacia personalu pristup vysvetlenie ochota empaticky mily neprijemny arogantny pocuval nepocuval",
    "zrozumitelne vysvetlenie problemu komunikacia s pacientom ludsky pristup respekt",
  ],
  odbornost: [
    "odbornost profesionalita kompetentnost diagnoza liecba vysetrenie skusenosti doveryhodnost odborny nekompetentny",
    "lekarske znalosti odborny pristup spravna diagnoza odborny postup",
  ],
  cakacia_doba: [
    "cakacia doba cakanie meskanie termin objednanie dlho rychlo vybavenie",
    "dlhe cakanie kratke cakanie objednany termin meskanie ambulancia",
  ],
  organizacia: [
    "organizacia navstevy objednavanie registracia administrativa poriadok chaos sestricka recepcia",
    "organizacia ambulancie priebeh navstevy objednanie informovanost administrativny proces",
  ],
  prostredie: [
    "prostredie cistota cakaren ambulancia prijemne neprijemne spinave ciste",
    "priestory zdravotnickeho zariadenia cista cakaren prostredie ambulancie",
  ],
  dostupnost: [
    "dostupnost lokalita kontakt telefon termin objednat vstup pristupnost",
    "telefonicka dostupnost kontaktovanie objednanie dostupne terminy",
  ],
  personal: [
    "personal sestricka sestra recepcia ochota neochota spravanie personalu",
    "pristup personalu komunikacia personalu prijem neochotny personal",
  ],
  vybavenie: [
    "vybavenie pristroje technika moderne zastarale vybavenost ambulancie",
    "technicke vybavenie pristrojove vybavenie moderna ambulancia",
  ],
  sukromie: [
    "sukromie diskretnost intimita ochrana sukromia citlive udaje diskrétny",
    "sukromne prostredie diskretne spracovanie sukromia pacienta",
  ],
  odporucanie: [
    "odporucanie odporucam neodporucam vratil by som sa nevratil by som sa spokojnost nespokojnost",
    "odporucil by som ostatnym neodporucil by som ostatnym celkova spokojnost",
  ],
};

export const TFIDF_CATEGORY_LABELS: Record<string, string> = {
  komunikacia: "Komunikácia",
  odbornost: "Odbornosť",
  cakacia_doba: "Čakacia doba",
  organizacia: "Organizácia",
  prostredie: "Prostredie",
  dostupnost: "Dostupnosť",
  personal: "Personál",
  vybavenie: "Vybavenie",
  sukromie: "Súkromie",
  odporucanie: "Odporúčanie",
};