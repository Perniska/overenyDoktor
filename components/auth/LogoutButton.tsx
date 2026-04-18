"use client";

import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      Odhlásiť sa
    </Button>
  );
}