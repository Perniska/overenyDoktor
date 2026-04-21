"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getVisitTypeLabel } from "@/lib/labels";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type MyReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  visit_type: string | null;
  review_source: string | null;
  targetType: "doctor" | "facility";
  targetName: string;
  targetHref: string;
};

type MyReviewCardProps = {
  review: MyReviewItem;
};

export function MyReviewCard({ review }: MyReviewCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Naozaj chceš odstrániť túto recenziu? Recenzia sa skryje z verejného profilu."
    );

    if (!confirmed) return;

    setMessage("");
    setDeleting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setDeleting(false);
      setMessage("Na odstránenie recenzie sa musíš prihlásiť.");
      return;
    }

    const { error } = await supabase
      .from("reviews")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", review.id)
      .eq("id_user", user.id);

    setDeleting(false);

    if (error) {
      setMessage(`Recenziu sa nepodarilo odstrániť: ${error.message}`);
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
              {review.targetType === "doctor" ? "Lekár" : "Zariadenie"}
            </p>

            <Link
              href={review.targetHref}
              className="mt-1 inline-flex items-center gap-1.5 text-lg font-semibold text-slate-950 hover:underline"
            >
              {review.targetName}
              <ExternalLink className="size-4" />
            </Link>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Star className="size-4" />
                {review.rating}/5
              </span>

              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" />
                {new Date(review.created_at).toLocaleDateString("sk-SK")}
              </span>

              <span>{getVisitTypeLabel(review.visit_type)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reviews/${review.id}/edit`}>
                <Pencil className="size-4" />
                Upraviť
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-700 hover:text-red-800"
            >
              <Trash2 className="size-4" />
              {deleting ? "Maže sa..." : "Odstrániť"}
            </Button>
          </div>
        </div>

        {review.comment ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {review.comment}
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Recenzia nemá textový komentár.
          </p>
        )}

        {message ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}