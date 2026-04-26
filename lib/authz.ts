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
      isAdmin: false,
      isModerator: false,
    };
  }

  const { data: isAdmin } = await supabase.rpc("current_user_has_role", {
    p_allowed_slugs: ["admin"],
  });

  const { data: isModerator } = await supabase.rpc("current_user_has_role", {
    p_allowed_slugs: ["moderator"],
  });

  const allowed = Boolean(isAdmin) || Boolean(isModerator);

  return {
    allowed,
    user,
    roleAllowed: allowed,
    isAdmin: Boolean(isAdmin),
    isModerator: Boolean(isModerator),
  };
}
export async function getCurrentUserRole() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isAdmin: false,
      isModerator: false,
    };
  }

  const { data: isAdmin } = await supabase.rpc("current_user_has_role", {
    p_allowed_slugs: ["admin"],
  });

  const { data: isModerator } = await supabase.rpc("current_user_has_role", {
    p_allowed_slugs: ["moderator"],
  });

  return {
    user,
    isAdmin: Boolean(isAdmin),
    isModerator: Boolean(isModerator),
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