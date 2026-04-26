"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getAvatarByKey } from "@/lib/constants/avatars";
import type {
  Profile,
  ProfileComment,
  ProfileReview,
  ProfileTopic,
} from "@/types/user";

export default function ProfileDetails() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topics, setTopics] = useState<ProfileTopic[]>([]);
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
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

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          username,
          created_at,
          role_id,
          bio,
          avatar_key,
          roles:roles!profiles_role_id_fkey (
            name,
            slug
          )
          `
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        setMessage(`Chyba pri načítaní profilu: ${profileError.message}`);
        setLoading(false);
        return;
      }

      const [topicsResult, commentsResult, reviewsResult] = await Promise.all([
        supabase
          .from("forum_topics")
          .select("id, title, description, created_at")
          .eq("id_creator", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(2),

        supabase
          .from("forum_comments")
          .select("id, content, created_at, id_topic")
          .eq("id_user", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(2),

        supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("id_user", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(2),
      ]);

      setProfile(profileData as Profile);
      setTopics((topicsResult.data ?? []) as ProfileTopic[]);
      setComments((commentsResult.data ?? []) as ProfileComment[]);
      setReviews((reviewsResult.data ?? []) as ProfileReview[]);
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
              <span className="font-medium text-slate-700">
                ID používateľa:
              </span>{" "}
              <span className="break-all text-slate-600">{profile.id}</span>
            </div>

            <div>
              <span className="font-medium text-slate-700">
                Používateľské meno:
              </span>{" "}
              <span className="text-slate-600">{profile.username}</span>
            </div>

            <div>
              <span className="font-medium text-slate-700">Rola:</span>{" "}
              <span className="text-slate-600">
                {profile.roles?.[0]?.name ?? "nezadané"}
              </span>
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
          </div>

          <div className="mt-8 space-y-6">
            <section>
              <h3 className="text-lg font-semibold">Aktuálne témy vo fóre</h3>
              <div className="mt-3 space-y-3">
                {topics.length > 0 ? (
                  topics.map((topic) => (
                    <div key={topic.id} className="rounded-xl border p-4">
                      <p className="font-medium text-slate-800">{topic.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {topic.created_at
                          ? new Date(topic.created_at).toLocaleString("sk-SK")
                          : "bez dátumu"}
                      </p>
                      {topic.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {topic.description}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Zatiaľ nemáš žiadne témy vo fóre.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold">Aktuálne komentáre vo fóre</h3>
              <div className="mt-3 space-y-3">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="rounded-xl border p-4">
                      <p className="line-clamp-3 text-sm text-slate-600">
                        {comment.content}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {comment.created_at
                          ? new Date(comment.created_at).toLocaleString("sk-SK")
                          : "bez dátumu"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Zatiaľ nemáš žiadne komentáre vo fóre.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold">Posledné hodnotenia</h3>
              <div className="mt-3 space-y-3">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-xl border p-4">
                      <p className="font-medium text-slate-800">
                        Hodnotenie: {review.rating}/5
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {review.created_at
                          ? new Date(review.created_at).toLocaleString("sk-SK")
                          : "bez dátumu"}
                      </p>
                      {review.comment ? (
                        <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                          {review.comment}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Zatiaľ nemáš žiadne hodnotenia.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}