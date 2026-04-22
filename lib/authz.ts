import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireModeratorOrAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      user: null,
      roleAllowed: false,
    };
  }

  const { data: roleAllowed } = await supabase.rpc("current_user_has_role", {
    p_allowed_slugs: ["admin", "moderator"],
  });

  return {
    allowed: Boolean(roleAllowed),
    user,
    roleAllowed: Boolean(roleAllowed),
  };
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      user: null,
      roleAllowed: false,
    };
  }

  const { data: roleAllowed } = await supabase.rpc("current_user_has_role", {
    p_allowed_slugs: ["admin"],
  });

  return {
    allowed: Boolean(roleAllowed),
    user,
    roleAllowed: Boolean(roleAllowed),
  };
}