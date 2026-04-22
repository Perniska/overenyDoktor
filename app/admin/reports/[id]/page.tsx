import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  EyeOff,
  MessageSquare,
  ShieldCheck,
  Star,
  Stethoscope,
  UserCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { getSingleRelation } from "@/lib/relations";
import { AdminReportActions } from "@/components/admin/AdminReportActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminReportDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Neuvedené";
  return new Date(value).toLocaleString("sk-SK");
}

function getDoctorName(doctor: any) {
  return [doctor?.title, doctor?.first_name, doctor?.last_name]
    .filter(Boolean)
    .join(" ");
}

function getTargetTypeLabel(type: string) {
  const labels: Record<string, string> = {
    review: "Recenzia",
    forum_topic: "Téma vo fóre",
    forum_comment: "Komentár vo fóre",
  };

  return labels[type] ?? "Iný obsah";
}

function getResolutionActionLabel(action?: string | null) {
  const labels: Record<string, string> = {
    no_action: "Bez zásahu do obsahu",
    content_hidden: "Obsah bol skrytý",
    content_removed: "Obsah bol odstránený",
    duplicate: "Duplicitné nahlásenie",
    invalid_report: "Neopodstatnené nahlásenie",
  };

  return labels[action ?? ""] ?? "Neuvedené";
}

export default async function AdminReportDetailPage({
  params,
}: AdminReportDetailPageProps) {
  const auth = await requireModeratorOrAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/");
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: reportData, error: reportError } = await supabase
    .from("reports")
    .select(
      `
      id,
      id_reporter,
      id_target,
      target_type,
      reason,
      is_resolved,
      resolved_by,
      resolved_at,
      resolution_action,
      resolution_note,
      created_at,
      updated_at,
      reporter:profiles!reports_id_reporter_fkey (
        id,
        username,
        deleted_at,
        anonymized_at
      ),
      resolver:profiles!reports_resolved_by_fkey (
        id,
        username
      )
    `
    )
    .eq("id", id)
    .single();

  if (reportError || !reportData) {
    notFound();
  }

  const report = reportData as any;
  const reporter = getSingleRelation(report.reporter);
  const resolver = getSingleRelation(report.resolver);

  let targetContent: React.ReactNode = null;
  let targetTitle = "Nahlásený obsah";
  let targetDescription = "Obsah sa nepodarilo načítať.";
  let targetHref: string | null = null;
  let targetAdminHref: string | null = null;
  let isTargetHidden = false;

  if (report.target_type === "review") {
    const { data: reviewData } = await supabase
      .from("reviews")
      .select(
        `
        id,
        id_user,
        id_doctor,
        id_facility,
        rating,
        comment,
        status,
        created_at,
        updated_at,
        deleted_at,
        is_anonymous,
        visit_type,
        review_source,
        doctor:doctors!reviews_id_doctor_fkey (
          id,
          title,
          first_name,
          last_name
        ),
        facility:facilities!reviews_id_facility_fkey (
          id,
          name
        ),
        author:profiles!reviews_id_user_fkey (
          id,
          username,
          deleted_at,
          anonymized_at
        )
      `
      )
      .eq("id", report.id_target)
      .maybeSingle();

    if (reviewData) {
      const review = reviewData as any;
      const doctor = getSingleRelation(review.doctor);
      const facility = getSingleRelation(review.facility);
      const author = getSingleRelation(review.author);

      isTargetHidden = Boolean(review.deleted_at);

      if (doctor) {
        targetTitle = getDoctorName(doctor) || "Lekár";
        targetDescription = "Nahlásená recenzia lekára";
        targetHref = `/doctors/${doctor.id}`;
      } else if (facility) {
        targetTitle = facility.name ?? "Zdravotnícke zariadenie";
        targetDescription = "Nahlásená recenzia zariadenia";
        targetHref = `/facilities/${facility.id}`;
      } else {
        targetTitle = "Recenzia bez priradeného cieľa";
        targetDescription = "Recenzia nemá priradeného lekára ani zariadenie.";
      }

      targetAdminHref = `/admin/reviews/${review.id}`;

      targetContent = (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Hodnotenie</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <Star className="size-4" />
                {review.rating}/5
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Autor</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <UserCircle className="size-4" />
                {review.is_anonymous
                  ? "Anonymná recenzia"
                  : author?.username ?? "Neznámy používateľ"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Vytvorená</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(review.created_at)}
              </p>
            </div>
          </div>

          {review.comment ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Text recenzie</p>
              <p className="mt-2 whitespace-pre-wrap">{review.comment}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Recenzia neobsahuje textový komentár.
            </div>
          )}
        </div>
      );
    }
  }

  if (report.target_type === "forum_topic") {
    const { data: topicData } = await supabase
      .from("forum_topics")
      .select(
        `
        id,
        title,
        description,
        created_at,
        updated_at,
        deleted_at,
        is_locked,
        is_pinned,
        category:forum_categories!forum_topics_id_category_fkey (
          id,
          name,
          slug
        ),
        creator:profiles!forum_topics_id_creator_fkey (
          id,
          username,
          deleted_at,
          anonymized_at
        )
      `
      )
      .eq("id", report.id_target)
      .maybeSingle();

    if (topicData) {
      const topic = topicData as any;
      const category = getSingleRelation(topic.category);
      const creator = getSingleRelation(topic.creator);

      targetTitle = topic.title ?? "Téma vo fóre";
      targetDescription = "Nahlásená téma vo fóre";
      targetHref = `/forum/${topic.id}`;
      targetAdminHref = `/admin/forum/topics/${topic.id}`;
      isTargetHidden = Boolean(topic.deleted_at);

      targetContent = (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Kategória</p>
              <p className="mt-1 font-semibold">
                {category?.name ?? "Bez kategórie"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Autor</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <UserCircle className="size-4" />
                {creator?.username ?? "Anonymný používateľ"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Vytvorená</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(topic.created_at)}
              </p>
            </div>
          </div>

          {topic.description ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Popis témy</p>
              <p className="mt-2 whitespace-pre-wrap">{topic.description}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Téma nemá textový popis.
            </div>
          )}
        </div>
      );
    }
  }

  if (report.target_type === "forum_comment") {
    const { data: commentData } = await supabase
      .from("forum_comments")
      .select(
        `
        id,
        id_user,
        id_topic,
        content,
        created_at,
        updated_at,
        edited_at,
        deleted_at,
        is_edited,
        author:profiles!forum_comments_id_user_fkey (
          id,
          username,
          deleted_at,
          anonymized_at
        ),
        topic:forum_topics!forum_comments_id_topic_fkey (
          id,
          title,
          deleted_at,
          is_locked
        )
      `
      )
      .eq("id", report.id_target)
      .maybeSingle();

    if (commentData) {
      const comment = commentData as any;
      const author = getSingleRelation(comment.author);
      const topic = getSingleRelation(comment.topic);

      targetTitle = topic?.title ?? "Komentár vo fóre";
      targetDescription = "Nahlásený komentár vo fóre";
      targetHref = topic?.id ? `/forum/${topic.id}` : null;
      targetAdminHref = `/admin/forum/comments/${comment.id}`;
      isTargetHidden = Boolean(comment.deleted_at);

      targetContent = (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Téma</p>
              <p className="mt-1 font-semibold">
                {topic?.title ?? "Téma sa nepodarila načítať"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Autor</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <UserCircle className="size-4" />
                {author?.username ?? "Anonymný používateľ"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Vytvorený</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(comment.created_at)}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Text komentára</p>
            <p className="mt-2 whitespace-pre-wrap">{comment.content}</p>
          </div>
        </div>
      );
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/admin/reports"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
      >
        <ArrowLeft className="size-4" />
        Späť na nahlásenia
      </Link>

      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Správa nahlásenia
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {getTargetTypeLabel(report.target_type)}
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Na tejto stránke riešiš jedno konkrétne nahlásenie. Rozhodnutie
          moderátora sa uloží do databázy a ostáva dohľadateľné.
        </p>
      </section>

      <Card
        className={
          report.is_resolved
            ? "border-emerald-100 bg-emerald-50/30"
            : "border-amber-200"
        }
      >
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <AlertTriangle className="size-6 text-amber-600" />
                Nahlásenie obsahu
              </CardTitle>

              <p className="mt-1 text-sm text-slate-500">
                Vytvorené: {formatDateTime(report.created_at)}
              </p>
            </div>

            <span
              className={
                report.is_resolved
                  ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800"
                  : "rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800"
              }
            >
              {report.is_resolved ? "Vyriešené" : "Nevyriešené"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Typ obsahu</p>
              <p className="mt-1 font-semibold">
                {getTargetTypeLabel(report.target_type)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">Nahlásil</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <UserCircle className="size-4" />
                {reporter?.username ?? "Anonymný alebo neznámy používateľ"}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <p className="text-sm text-slate-500">ID cieľa</p>
              <p className="mt-1 break-all font-mono text-xs">
                {report.id_target}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm font-medium text-slate-500">
              Dôvod nahlásenia
            </p>
            <p className="mt-2 whitespace-pre-wrap text-slate-800">
              {report.reason}
            </p>
          </div>

          {report.is_resolved ? (
            <div className="rounded-xl border bg-white p-4">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="size-5 text-emerald-700" />
                Výsledok moderovania
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-500">Akcia</p>
                  <p className="mt-1 font-semibold">
                    {getResolutionActionLabel(report.resolution_action)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Vyriešil</p>
                  <p className="mt-1 font-semibold">
                    {resolver?.username ?? "Neuvedené"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Vyriešené</p>
                  <p className="mt-1 font-semibold">
                    {formatDateTime(report.resolved_at)}
                  </p>
                </div>
              </div>

              {report.resolution_note ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  {report.resolution_note}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className={isTargetHidden ? "border-red-200 bg-red-50/30" : ""}>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {report.target_type === "review" ? (
                  <Stethoscope className="size-6" />
                ) : report.target_type === "forum_topic" ? (
                  <MessageSquare className="size-6" />
                ) : report.target_type === "forum_comment" ? (
                  <MessageSquare className="size-6" />
                ) : (
                  <Building2 className="size-6" />
                )}
                {targetTitle}
              </CardTitle>

              <p className="mt-1 text-sm text-slate-500">
                {targetDescription}
              </p>
            </div>

            {isTargetHidden ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                <EyeOff className="size-4" />
                Obsah je skrytý
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                Obsah je viditeľný
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {targetContent ?? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Nahlásený obsah sa nepodarilo načítať. Môže byť odstránený alebo
              už nedostupný.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {targetHref ? (
              <Link
                href={targetHref}
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Otvoriť verejný obsah
              </Link>
            ) : null}

            {targetAdminHref ? (
              <Link
                href={targetAdminHref}
                className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Otvoriť správu obsahu
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AdminReportActions
        reportId={report.id}
        targetType={report.target_type}
        targetId={report.id_target}
        isResolved={report.is_resolved}
      />
    </main>
  );
}