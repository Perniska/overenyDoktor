"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getAvatarByKey } from "@/lib/constants/avatars";
import type { Profile } from "@/types/user";

export default function ProfileDetails() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Nepodarilo sa načítať prihláseného používateľa.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, is_banned, created_at, role_id, deleted_at, anonymized_at, bio, avatar_key"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        setMessage(`Chyba pri načítaní profilu: ${error.message}`);
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-slate-600">Načítava sa profil...</p>
      </div>
    );
  }

  if (message) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-red-600">{message}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-slate-600">Profil sa nenašiel.</p>
      </div>
    );
  }

  const avatar = getAvatarByKey(profile.avatar_key);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border bg-slate-100">
            <Image
              src={avatar.src}
              alt={avatar.label}
              fill
              className="object-cover"
            />
          </div>
          <span className="text-xs text-slate-500">{avatar.label}</span>
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Môj profil</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <span className="font-medium text-slate-700">ID používateľa:</span>{" "}
              <span className="break-all text-slate-600">{profile.id}</span>
            </div>

            <div>
              <span className="font-medium text-slate-700">Používateľské meno:</span>{" "}
              <span className="text-slate-600">{profile.username}</span>
            </div>

            <div>
              <span className="font-medium text-slate-700">Rola:</span>{" "}
              <span className="text-slate-600">{profile.role_id}</span>
            </div>

            <div>
              <span className="font-medium text-slate-700">Zablokovaný používateľ:</span>{" "}
              <span className="text-slate-600">{profile.is_banned ? "áno" : "nie"}</span>
            </div>

            <div>
              <span className="font-medium text-slate-700">Bio:</span>{" "}
              <span className="text-slate-600">
                {profile.bio ? profile.bio : "nezadané"}
              </span>
            </div>

            <div>
              <span className="font-medium text-slate-700">Vytvorený:</span>{" "}
              <span className="text-slate-600">
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleString("sk-SK")
                  : "nezadané"}
              </span>
            </div>

            <div>
              <span className="font-medium text-slate-700">Deleted at:</span>{" "}
              <span className="text-slate-600">
                {profile.deleted_at
                  ? new Date(profile.deleted_at).toLocaleString("sk-SK")
                  : "nie"}
              </span>
            </div>

            <div>
              <span className="font-medium text-slate-700">Anonymized at:</span>{" "}
              <span className="text-slate-600">
                {profile.anonymized_at
                  ? new Date(profile.anonymized_at).toLocaleString("sk-SK")
                  : "nie"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}