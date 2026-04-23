import { supabase } from "@/lib/supabase/client";

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "";
  return "message" in error && typeof error.message === "string"
    ? error.message
    : "";
}

function isRecoverableSessionError(error: unknown) {
  const message = getErrorMessage(error);

  return (
    message.includes("Invalid Refresh Token") ||
    message.includes("was released because another request stole it") ||
    message.includes("Failed to fetch")
  );
}

export async function getSafeSession() {
  try {
    const result = await supabase.auth.getSession();

    if (result.error && isRecoverableSessionError(result.error)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

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
  } catch (error) {
    if (isRecoverableSessionError(error)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

      return {
        session: null,
        error: null,
        wasRecoveredFromInvalidToken: true,
      };
    }

    return {
      session: null,
      error,
      wasRecoveredFromInvalidToken: false,
    };
  }
}