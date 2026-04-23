import { redirect } from "next/navigation";
import { Bell, CalendarDays, CheckCircle2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotificationsActions } from "@/components/notifications/NotificationsActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type NotificationsPageProps = {
  searchParams: Promise<{
    filter?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getNotificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    review_approved: "Recenzia schválená",
    review_rejected: "Recenzia zamietnutá",
    comment_reply: "Odpoveď vo fóre",
    report_resolved: "Nahlásenie vyriešené",
    system: "Systémová notifikácia",
  };

  return labels[type] ?? "Notifikácia";
}

function getNotificationMessage(content: any) {
  if (!content) return "Bez detailu.";
  if (typeof content === "string") return content;
  if (content.message) return content.message;
  if (content.title && content.description) {
    return `${content.title} — ${content.description}`;
  }
  if (content.title) return content.title;
  return JSON.stringify(content);
}

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const filter = getSingleParam(params.filter) ?? "all";

  let query = supabase
    .from("notifications")
    .select("id, created_at, type, content, is_read, read_at")
    .eq("id_user", user.id);

  if (filter === "unread") query = query.eq("is_read", false);
  if (filter === "read") query = query.eq("is_read", true);

  const { data, error } = await query.order("created_at", { ascending: false });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Používateľské centrum
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Notifikácie
        </h1>

        <p className="mt-2 text-slate-600">
          Tu nájdeš systémové upozornenia, výsledky moderovania a dôležité udalosti.
        </p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-sky-50 p-3">
            <Bell className="size-5 text-sky-700" />
          </div>

          <div>
            <p className="text-sm text-slate-500">Neprečítané notifikácie</p>
            <p className="text-2xl font-bold text-slate-950">{unreadCount}</p>
          </div>
        </div>

        <NotificationsActions variant="bulk" />
      </section>

      <section className="flex flex-wrap gap-2 text-sm">
        <a href="/notifications" className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200">
          Všetky
        </a>
        <a href="/notifications?filter=unread" className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200">
          Len neprečítané
        </a>
        <a href="/notifications?filter=read" className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200">
          Len prečítané
        </a>
      </section>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Notifikácie sa nepodarilo načítať: {error.message}
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            Zatiaľ tu nemáš žiadne notifikácie.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={!notification.is_read ? "border-sky-200 bg-sky-50/30" : ""}
            >
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Bell className="size-5" />
                      {getNotificationTypeLabel(notification.type)}
                    </CardTitle>

                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                      <CalendarDays className="size-4" />
                      {new Date(notification.created_at).toLocaleString("sk-SK")}
                    </p>
                  </div>

                  <span
                    className={
                      notification.is_read
                        ? "inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                        : "inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700"
                    }
                  >
                    {notification.is_read ? (
                      <>
                        <CheckCircle2 className="size-4" />
                        Prečítaná
                      </>
                    ) : (
                      "Neprečítaná"
                    )}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-xl bg-white p-4 text-sm text-slate-700">
                  {getNotificationMessage(notification.content)}
                </div>

                <NotificationsActions
                  variant="single"
                  notificationId={notification.id}
                  isRead={notification.is_read}
                />
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}