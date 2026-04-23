import { supabase } from "@/lib/supabase/client";

export type ClientActionGuardResult = {
  allowed: boolean;
  userId: string | null;
  message: string | null;
};

function mapReasonToMessage(reason?: string | null) {
  switch (reason) {
    case "not_authenticated":
      return "Pre túto akciu sa musíš prihlásiť.";
    case "profile_missing":
      return "Používateľský profil sa nepodarilo načítať.";
    case "anonymized":
      return "Tvoj účet bol anonymizovaný. Táto akcia už nie je dostupná.";
    case "deleted":
      return "Tvoj účet je označený ako odstránený. Táto akcia už nie je dostupná.";
    case "banned":
      return "Tvoj účet je zablokovaný. Táto akcia nie je dostupná.";
    default:
      return "Táto akcia momentálne nie je dostupná.";
  }
}

export async function guardClientWriteAction(): Promise<ClientActionGuardResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id ?? null;

  if (!userId) {
    return {
      allowed: false,
      userId: null,
      message: "Pre túto akciu sa musíš prihlásiť.",
    };
  }

  const { data, error } = await supabase.rpc("current_user_profile_state");

  if (error) {
    return {
      allowed: false,
      userId,
      message: `Nepodarilo sa overiť stav účtu: ${error.message}`,
    };
  }

  const allowed = Boolean(data?.allowed);

  return {
    allowed,
    userId,
    message: allowed ? null : mapReasonToMessage(data?.reason),
  };
}