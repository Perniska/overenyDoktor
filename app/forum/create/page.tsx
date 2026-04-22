import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ForumCreateTopicForm } from "@/components/forum/ForumCreateTopicForm";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ForumCreatePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: categories, error } = await supabase
    .from("forum_categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link
        href="/forum"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700"
      >
        <ArrowLeft className="size-4" />
        Späť na fórum
      </Link>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Kategórie sa nepodarilo načítať: {error.message}
          </CardContent>
        </Card>
      ) : (categories ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-600">
            Fórum zatiaľ nemá aktívne kategórie.
          </CardContent>
        </Card>
      ) : (
        <ForumCreateTopicForm categories={categories ?? []} />
      )}
    </main>
  );
}