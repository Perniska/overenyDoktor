export function getDataQualityStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    unknown: "Neoverené údaje",
    current: "Aktuálne údaje",
    outdated: "Neaktuálne údaje",
    reported: "Nahlásený problém",
  };

  return labels[status ?? ""] ?? "Neznámy stav údajov";
}

export function getVerificationStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    pending: "Čaká na overenie",
    verified: "Overené",
    rejected: "Zamietnuté",
    needs_review: "Vyžaduje kontrolu",
  };

  return labels[status ?? ""] ?? "Neznámy stav overenia";
}

export function getReviewStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    pending: "Čaká na kontrolu",
    approved: "Zverejnené",
    rejected: "Zamietnuté",
    hidden: "Skryté",
  };

  return labels[status ?? ""] ?? "Neznámy stav recenzie";
}

export function getFacilityRoleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    primary: "Hlavné pôsobisko",
    visiting: "Hosťujúci lekár",
    consultant: "Konzultant",
  };

  return labels[role ?? ""] ?? "Pôsobisko";
}

export function getReviewSourceLabel(source?: string | null) {
  const labels: Record<string, string> = {
    structured_form: "Štruktúrovaný formulár",
    free_text: "Voľný text",
    admin_import: "Administrátorský import",
  };

  return labels[source ?? ""] ?? "Neznámy zdroj";
}

export function getVisitTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    first_visit: "Prvá návšteva",
    follow_up: "Kontrolná návšteva",
    preventive: "Preventívna návšteva",
    acute_problem: "Akútny problém",
    administrative: "Administratívna záležitosť",
    other: "Iný typ návštevy",
  };

  return labels[type ?? ""] ?? "Typ návštevy neuvedený";
}