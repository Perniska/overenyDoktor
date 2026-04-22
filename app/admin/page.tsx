import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Database,
  FileText,
  MessageSquare,
  Shield,
  UserCog,
} from "lucide-react";
import { requireModeratorOrAdmin } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AdminCard = {
  href: string;
  title: string;
  description: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled?: boolean;
};

const cards: AdminCard[] = [
  {
    href: "/admin/reports",
    title: "Nahlásenia obsahu",
    description: "Riešenie nahlásených recenzií a podnetov od používateľov.",
    helper:
      "Použi vtedy, keď používateľ nahlási recenziu ako nevhodnú, nepravdivú alebo obsahujúcu osobné údaje.",
    icon: AlertTriangle,
    enabled: true,
  },
  {
    href: "/admin/reviews",
    title: "Moderovanie recenzií",
    description: "Prehľad recenzií, ich stavov a moderátorských zásahov.",
    helper:
      "Použi na kontrolu zverejnených, skrytých alebo sporných recenzií.",
    icon: ClipboardList,
    enabled: true,
  },
  {
    href: "/admin/forum",
    title: "Moderovanie fóra",
    description: "Kontrola tém, komentárov a nahláseného komunitného obsahu.",
    helper:
      "Použi pri diskusných témach alebo komentároch, ktoré porušujú pravidlá platformy.",
    icon: MessageSquare,
    enabled: false,
  },
  {
    href: "/admin/users",
    title: "Používatelia a roly",
    description: "Správa používateľov, moderátorov a administrátorov.",
    helper:
      "Použi len pri zmene oprávnení alebo riešení problémového účtu.",
    icon: UserCog,
    enabled: true,
  },
  {
    href: "/admin/gdpr",
    title: "GDPR žiadosti",
    description: "Export údajov, žiadosti o výmaz a anonymizácia účtu.",
    helper:
      "Použi pri žiadosti používateľa o prístup, export, opravu alebo výmaz údajov.",
    icon: FileText,
    enabled: false,
  },
  {
    href: "/admin/audit",
    title: "Audit logy",
    description: "Dohľadateľnosť citlivých zmien a moderátorských rozhodnutí.",
    helper:
      "Použi pri spätnej kontrole zásahov do recenzií, nahlásení alebo používateľských údajov.",
    icon: Shield,
    enabled: true,
  },
  {
    href: "/admin/data",
    title: "Referenčné údaje",
    description: "Správa lekárov, zariadení, špecializácií a typov zariadení.",
    helper:
      "Použi pri úprave alebo kontrole importovaných údajov z EVÚC.",
    icon: Database,
    enabled: false,
  },
  {
    href: "/analytics",
    title: "Analytika",
    description: "Súhrnné štatistiky, vývoj hodnotení a prehľady systému.",
    helper:
      "Použi na vizualizáciu výsledkov spätnej väzby a dát pre praktickú časť práce.",
    icon: BarChart3,
    enabled: true,
  },
];

export default async function AdminPage() {
  const auth = await requireModeratorOrAdmin();

  if (!auth.user) {
    redirect("/auth/login");
  }

  if (!auth.allowed) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Správa systému
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Admin a moderátorský panel
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Táto časť slúži na riešenie nahláseného obsahu, kontrolu recenzií,
          správu používateľov, auditných záznamov a GDPR požiadaviek. Bežný
          používateľ túto časť nevidí.
        </p>
      </section>

      <section className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Ako používať správu systému</p>
        <p className="mt-1">
          Moderátor rieši hlavne obsah: nahlásenia, recenzie a fórum.
          Administrátor má navyše prístup k rolám, auditným záznamom,
          referenčným údajom a GDPR procesom.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          const content = (
            <Card
              className={
                card.enabled
                  ? "h-full transition hover:-translate-y-0.5 hover:shadow-md"
                  : "h-full opacity-70"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="size-5" />
                  {card.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <p className="text-slate-700">{card.description}</p>

                <div className="rounded-xl bg-slate-50 p-3 text-slate-600">
                  <p className="font-medium text-slate-800">Kedy použiť</p>
                  <p className="mt-1">{card.helper}</p>
                </div>

                {!card.enabled ? (
                  <p className="text-xs font-medium text-amber-700">
                    Pripravované v ďalšej fáze implementácie.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );

          if (!card.enabled) {
            return <div key={card.href}>{content}</div>;
          }

          return (
            <Link key={card.href} href={card.href}>
              {content}
            </Link>
          );
        })}
      </section>
    </main>
  );
}