"use client";

import { useState } from "react";
import { Shield, ShieldOff, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type RoleOption = {
  id: number;
  name: string;
  slug: string;
};

type AdminUserActionsProps = {
  profileId: string;
  currentUserId: string;
  username: string;
  currentRoleId: number;
  currentRoleSlug: string;
  isBanned: boolean;
  isDeleted: boolean;
  isAnonymized: boolean;
  roles: RoleOption[];
};

export function AdminUserActions({
  profileId,
  currentUserId,
  username,
  currentRoleId,
  currentRoleSlug,
  isBanned,
  isDeleted,
  isAnonymized,
  roles,
}: AdminUserActionsProps) {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState(String(currentRoleId));
  const [savingRole, setSavingRole] = useState(false);
  const [savingBan, setSavingBan] = useState(false);
  const [message, setMessage] = useState("");

  const isSelf = profileId === currentUserId;
  const isDisabled = isDeleted || isAnonymized;

  async function handleRoleChange() {
    if (isSelf) {
      setMessage("Svoju vlastnú rolu nie je možné meniť cez toto rozhranie.");
      return;
    }

    if (isDisabled) {
      setMessage("Rolu nemožno meniť pri odstránenom alebo anonymizovanom účte.");
      return;
    }

    setMessage("");
    setSavingRole(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        role_id: Number(selectedRoleId),
      })
      .eq("id", profileId);

    setSavingRole(false);

    if (error) {
      setMessage(`Rolu sa nepodarilo zmeniť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  async function handleBanToggle() {
    if (isSelf) {
      setMessage("Svoj vlastný účet nie je možné zablokovať cez toto rozhranie.");
      return;
    }

    if (isDisabled) {
      setMessage("Stav nemožno meniť pri odstránenom alebo anonymizovanom účte.");
      return;
    }

    const confirmed = window.confirm(
      isBanned
        ? `Naozaj chceš odblokovať používateľa ${username}?`
        : `Naozaj chceš zablokovať používateľa ${username}?`
    );

    if (!confirmed) return;

    setMessage("");
    setSavingBan(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        is_banned: !isBanned,
      })
      .eq("id", profileId);

    setSavingBan(false);

    if (error) {
      setMessage(`Stav používateľa sa nepodarilo zmeniť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-900">Správa používateľa</p>
        <p className="mt-1 text-sm text-slate-600">
          Zmenu roly používaj iba pri poverení moderátora alebo administrátora.
          Blokovanie používateľa použi pri opakovanom porušovaní pravidiel.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rola používateľa
          </label>

          <select
            value={selectedRoleId}
            onChange={(event) => setSelectedRoleId(event.target.value)}
            disabled={isSelf || isDisabled || savingRole}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} ({role.slug})
              </option>
            ))}
          </select>

          <p className="mt-1 text-xs text-slate-500">
            Aktuálna rola: {currentRoleSlug}
          </p>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleRoleChange}
            disabled={isSelf || isDisabled || savingRole}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserCog className="size-4" />
            {savingRole ? "Ukladá sa..." : "Uložiť rolu"}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Kedy použiť blokovanie</p>
        <p className="mt-1">
          Blokovanie obmedzí používateľa pri ďalšom používaní systému. Použi ho
          najmä pri spamovaní, opakovanom zneužívaní recenzií alebo porušovaní
          pravidiel diskusie.
        </p>
      </div>

      <button
        type="button"
        onClick={handleBanToggle}
        disabled={isSelf || isDisabled || savingBan}
        className={
          isBanned
            ? "inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isBanned ? <Shield className="size-4" /> : <ShieldOff className="size-4" />}
        {savingBan
          ? "Ukladá sa..."
          : isBanned
            ? "Odblokovať používateľa"
            : "Zablokovať používateľa"}
      </button>

      {isSelf ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ide o tvoj vlastný účet. Z bezpečnostných dôvodov tu nemôžeš meniť
          svoju rolu ani blokovať vlastný účet.
        </p>
      ) : null}

      {isDisabled ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Účet je odstránený alebo anonymizovaný, preto sú administrátorské
          zásahy obmedzené.
        </p>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}