import Link from "next/link";
import { redirect } from "next/navigation";
import { Filter, Shield, User, UserX } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { NumberedPagination } from "@/components/common/NumberedPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminUsersPageProps = {
  searchParams: Promise<{
    role?: string | string[];
    status?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

type RoleOption = {
  id: number;
  name: string;
  slug: string;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getProfileStatusLabel(profile: any) {
  if (profile.deleted_at) return "Odstránený účet";
  if (profile.anonymized_at) return "Anonymizovaný účet";
  if (profile.is_banned) return "Zablokovaný";
  return "Aktívny";
}

function createUsersHref(filters: {
  role?: string;
  status?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (filters.role && filters.role !== "all") {
    params.set("role", filters.role);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const auth = await requireAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/admin");
  }

  const params = await searchParams;

  const role = getSingleParam(params.role) ?? "all";
  const status = getSingleParam(params.status) ?? "all";
  const q = getSingleParam(params.q)?.trim() ?? "";

  const pageParam = Number(getSingleParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  const { data: rolesData, error: rolesError } = await supabase
    .from("roles")
    .select("id, name, slug")
    .order("id", { ascending: true });

  const roles = (rolesData ?? []) as RoleOption[];
  const selectedRole = roles.find((item) => item.slug === role);

  let profilesQuery = supabase
    .from("profiles")
    .select(
      `
      id,
      username,
      is_banned,
      created_at,
      role_id,
      deleted_at,
      anonymized_at,
      avatar_key,
      role:roles!profiles_role_id_fkey (
        id,
        name,
        slug
      )
    `,
      { count: "exact" }
    );

  if (q) {
    profilesQuery = profilesQuery.ilike("username", `%${q}%`);
  }

  if (selectedRole) {
    profilesQuery = profilesQuery.eq("role_id", selectedRole.id);
  }

  if (status === "active") {
    profilesQuery = profilesQuery
      .eq("is_banned", false)
      .is("deleted_at", null)
      .is("anonymized_at", null);
  }

  if (status === "banned") {
    profilesQuery = profilesQuery.eq("is_banned", true);
  }

  if (status === "deleted") {
    profilesQuery = profilesQuery.not("deleted_at", "is", null);
  }

  if (status === "anonymized") {
    profilesQuery = profilesQuery.not("anonymized_at", "is", null);
  }

  const { data, error, count } = await profilesQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  const profiles = data ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const activeOnPage = profiles.filter(
    (profile: any) =>
      !profile.is_banned && !profile.deleted_at && !profile.anonymized_at
  ).length;

  const bannedOnPage = profiles.filter(
    (profile: any) => profile.is_banned
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Správa používateľov
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Používatelia a roly
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Prehľad slúži na vyhľadanie používateľa. Zmena roly alebo blokovanie
          sa robí až na detailnej stránke konkrétneho používateľa.
        </p>
      </section>

      <section className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Rozdelenie rolí</p>
        <p className="mt-1">
          Bežný používateľ môže používať recenzie a fórum. Moderátor rieši
          obsah a nahlásenia. Administrátor má navyše správu používateľov,
          audit, GDPR a referenčné údaje.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Celkový počet podľa filtra</p>
            <p className="mt-2 text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Aktívni na tejto strane</p>
            <p className="mt-2 text-2xl font-bold">{activeOnPage}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Blokovaní na tejto strane</p>
            <p className="mt-2 text-2xl font-bold">{bannedOnPage}</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filtre</h2>
        </div>

        <form
          action="/admin/users"
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Rola
            </label>

            <select
              name="role"
              defaultValue={role}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetky roly</option>
              {roles.map((roleItem) => (
                <option key={roleItem.id} value={roleItem.slug}>
                  {roleItem.name} ({roleItem.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Stav účtu
            </label>

            <select
              name="status"
              defaultValue={status}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Všetky stavy</option>
              <option value="active">Aktívni</option>
              <option value="banned">Blokovaní</option>
              <option value="deleted">Odstránení</option>
              <option value="anonymized">Anonymizovaní</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vyhľadávanie
            </label>

            <input
              name="q"
              defaultValue={q}
              placeholder="používateľské meno..."
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Filtrovať
            </button>

            <Link
              href="/admin/users"
              className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zrušiť
            </Link>
          </div>
        </form>
      </section>

      {rolesError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Roly sa nepodarilo načítať: {rolesError.message}
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Používateľov sa nepodarilo načítať: {error.message}
          </CardContent>
        </Card>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            Pre zadané filtre sa nenašli žiadni používatelia.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {profiles.map((profile: any) => {
            const profileRole = getSingleRelation(profile.role);

            return (
              <Card
                key={profile.id}
                className={
                  profile.is_banned
                    ? "border-red-200 bg-red-50/30"
                    : profile.deleted_at || profile.anonymized_at
                      ? "opacity-75"
                      : ""
                }
              >
                <CardHeader>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {profile.is_banned ? (
                          <UserX className="size-5 text-red-600" />
                        ) : (
                          <User className="size-5" />
                        )}
                        {profile.username}
                      </CardTitle>

                      <p className="mt-1 text-sm text-slate-500">
                        Vytvorený:{" "}
                        {new Date(profile.created_at).toLocaleDateString(
                          "sk-SK"
                        )}
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

                <CardContent>
                  <Link
                    href={`/admin/users/${profile.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Spravovať používateľa
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <NumberedPagination
        currentPage={page}
        totalPages={totalPages}
        createHref={(pageNumber) =>
          createUsersHref({
            role,
            status,
            q,
            page: pageNumber,
          })
        }
      />
    </main>
  );
}