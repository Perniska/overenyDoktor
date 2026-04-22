import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Shield,
  User,
  UserX,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { AdminUserActions } from "@/components/admin/AdminUserActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminUserDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RoleOption = {
  id: number;
  name: string;
  slug: string;
};

function getProfileStatusLabel(profile: any) {
  if (profile.deleted_at) return "Odstránený účet";
  if (profile.anonymized_at) return "Anonymizovaný účet";
  if (profile.is_banned) return "Zablokovaný";
  return "Aktívny";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Neuvedené";
  return new Date(value).toLocaleString("sk-SK");
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const auth = await requireAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/admin");
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: rolesData, error: rolesError } = await supabase
    .from("roles")
    .select("id, name, slug")
    .order("id", { ascending: true });

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      username,
      bio,
      avatar_key,
      is_banned,
      created_at,
      role_id,
      deleted_at,
      anonymized_at,
      email_changed_at,
      password_changed_at,
      role:roles!profiles_role_id_fkey (
        id,
        name,
        slug
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data || rolesError) {
    notFound();
  }

  const profile = data as any;
  const roles = (rolesData ?? []) as RoleOption[];
  const profileRole = getSingleRelation(profile.role);

  const isDeleted = Boolean(profile.deleted_at);
  const isAnonymized = Boolean(profile.anonymized_at);
  const isSelf = profile.id === auth.user.id;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
      >
        <ArrowLeft className="size-4" />
        Späť na používateľov
      </Link>

      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Správa používateľa
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {profile.username}
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Na tejto stránke upravuješ iba jeden konkrétny používateľský účet.
          Zmeny roly a blokovania sú auditované.
        </p>
      </section>

      <Card
        className={
          profile.is_banned
            ? "border-red-200 bg-red-50/30"
            : isDeleted || isAnonymized
              ? "opacity-75"
              : ""
        }
      >
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {profile.is_banned ? (
                  <UserX className="size-6 text-red-600" />
                ) : (
                  <User className="size-6" />
                )}
                {profile.username}
              </CardTitle>

              <p className="mt-1 text-sm text-slate-500">
                ID používateľa: {profile.id}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                <Shield className="size-4" />
                {profileRole?.name ?? "Neznáma rola"}
              </span>

              <span
                className={
                  profile.is_banned
                    ? "rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                    : "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
                }
              >
                {getProfileStatusLabel(profile)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Vytvorený účet</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <CalendarDays className="size-4" />
                {formatDateTime(profile.created_at)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Rola</p>
              <p className="mt-1 font-semibold">
                {profileRole?.name ?? "Neznáma rola"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Stav účtu</p>
              <p className="mt-1 font-semibold">
                {getProfileStatusLabel(profile)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Avatar</p>
              <p className="mt-1 font-semibold">
                {profile.avatar_key ?? "Neuvedené"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Zmena hesla</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(profile.password_changed_at)}
              </p>
            </div>
          </div>

          {profile.bio ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Bio</p>
              <p className="mt-1">{profile.bio}</p>
            </div>
          ) : null}

          {isSelf ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Toto je tvoj vlastný účet. Z bezpečnostných dôvodov nie je možné
              meniť vlastnú rolu ani zablokovať vlastný účet.
            </div>
          ) : null}

          {isDeleted || isAnonymized ? (
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
              Účet je odstránený alebo anonymizovaný. Administrátorské zásahy sú
              preto obmedzené.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AdminUserActions
        profileId={profile.id}
        currentUserId={auth.user.id}
        username={profile.username}
        currentRoleId={profile.role_id}
        currentRoleSlug={profileRole?.slug ?? "unknown"}
        isBanned={profile.is_banned}
        isDeleted={isDeleted}
        isAnonymized={isAnonymized}
        roles={roles}
      />
    </main>
  );
}