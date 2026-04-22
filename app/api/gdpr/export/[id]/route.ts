import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExportRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: ExportRouteProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Na stiahnutie exportu sa musíš prihlásiť." },
      { status: 401 }
    );
  }

  const { data: isAdmin } = await supabase.rpc("current_user_has_role", {
    p_allowed_slugs: ["admin"],
  });

  const { data: payload, error } = await supabase
    .from("gdpr_export_payloads")
    .select("request_id, id_user, export_data, expires_at")
    .eq("request_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `Export sa nepodarilo načítať: ${error.message}` },
      { status: 500 }
    );
  }

  if (!payload) {
    return NextResponse.json(
      { error: "Export neexistuje alebo ešte nebol pripravený." },
      { status: 404 }
    );
  }

  if (payload.id_user !== user.id && !isAdmin) {
    return NextResponse.json(
      { error: "Na tento export nemáš oprávnenie." },
      { status: 403 }
    );
  }

  if (new Date(payload.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Export expiroval. Vytvor novú žiadosť o export údajov." },
      { status: 410 }
    );
  }

  const body = JSON.stringify(payload.export_data, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gdpr-export-${payload.request_id}.json"`,
    },
  });
}