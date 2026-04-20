"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { AVATARS, getAvatarByKey } from "@/lib/constants/avatars";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditableProfile = {
  id: string;
  username: string;
  bio: string | null;
  avatar_key: string | null;
};

const BIO_MAX_LENGTH = 300;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;

function validateUsername(username: string) {
  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return "Používateľské meno musí mať aspoň 3 znaky.";
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return "Používateľské meno môže mať maximálne 30 znakov.";
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return "Používateľské meno môže obsahovať iba písmená, čísla, bodku, pomlčku a podčiarkovník.";
  }

  return null;
}

export default function ProfileEditForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarKey, setAvatarKey] = useState("avatar-1");
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
        .select("id, username, bio, avatar_key")
        .eq("id", user.id)
        .single();

      if (error) {
        setMessage(`Chyba pri načítaní profilu: ${error.message}`);
        setLoading(false);
        return;
      }

      setProfile(data);
      setUsername(data.username ?? "");
      setBio(data.bio ?? "");
      setAvatarKey(data.avatar_key ?? "avatar-1");
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!profile) {
      setMessage("Profil nie je načítaný.");
      return;
    }

    const usernameError = validateUsername(username);

    if (usernameError) {
      setMessage(usernameError);
      return;
    }

    if (bio.length > BIO_MAX_LENGTH) {
      setMessage(`Bio môže mať maximálne ${BIO_MAX_LENGTH} znakov.`);
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        bio: bio.trim() || null,
        avatar_key: avatarKey,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setMessage("Toto používateľské meno už existuje. Vyber si iné.");
      } else {
        setMessage(`Chyba pri ukladaní profilu: ${error.message}`);
      }

      return;
    }

    setMessage("Profil bol úspešne aktualizovaný.");
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-slate-600">Načítavajú sa nastavenia profilu...</p>
      </div>
    );
  }

  const selectedAvatar = getAvatarByKey(avatarKey);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-2xl font-semibold">Úprava profilu</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tu môžeš upraviť používateľské meno, krátky popis a profilový avatar.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Používateľské meno</label>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={USERNAME_MIN_LENGTH}
          maxLength={USERNAME_MAX_LENGTH}
          className="w-full rounded-lg border px-3 py-2"
          required
        />
        <p className="text-xs text-slate-500">
          3–30 znakov, povolené sú písmená, čísla, bodka, pomlčka a podčiarkovník.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Bio</label>
        <Textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={BIO_MAX_LENGTH}
          placeholder="Napíš krátky popis profilu..."
          className="min-h-28 resize-none"
        />
        <div className="flex justify-between gap-4 text-xs text-slate-500">
          <span>Bio sa zobrazuje ako obyčajný text bez HTML formátovania.</span>
          <span>
            {bio.length}/{BIO_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Profilový avatar</label>

          <div className="mt-3 flex items-center gap-3 rounded-xl border bg-slate-50 p-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border bg-white">
              <Image
                src={selectedAvatar.src}
                alt={selectedAvatar.label}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">Aktuálny výber</p>
              <p className="text-sm text-slate-500">{selectedAvatar.label}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7 md:grid-cols-10">
          {AVATARS.map((avatar) => {
            const isSelected = avatar.key === avatarKey;

            return (
              <button
                key={avatar.key}
                type="button"
                onClick={() => setAvatarKey(avatar.key)}
                className={cn(
                  "relative h-14 w-14 overflow-hidden rounded-full border bg-slate-100 transition",
                  isSelected
                    ? "border-sky-500 ring-2 ring-sky-300"
                    : "border-slate-200 hover:border-sky-300"
                )}
                aria-label={`Vybrať ${avatar.label}`}
              >
                <Image
                  src={avatar.src}
                  alt={avatar.label}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Ukladá sa..." : "Uložiť zmeny"}
      </Button>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}