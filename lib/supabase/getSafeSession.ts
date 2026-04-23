import { supabase } from "@/lib/supabase/client";

function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  return message.includes("Invalid Refresh Token");
}

export async function getSafeSession() {
  const result = await supabase.auth.getSession();

  if (result.error && isInvalidRefreshTokenError(result.error)) {
    await supabase.auth.signOut({ scope: "local" });

    return {
      session: null,
      error: null,
      wasRecoveredFromInvalidToken: true,
    };
  }

  return {
    session: result.data.session,
    error: result.error,
    wasRecoveredFromInvalidToken: false,
  };
}