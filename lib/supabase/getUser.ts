import { supabase } from "./client";

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}