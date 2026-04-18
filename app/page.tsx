import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border bg-card p-10 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Digitálny ekosystém pre hodnotenie zdravotnej starostlivosti
          </p>

          <h1 className="text-4xl font-bold tracking-tight">OverenyDoktor</h1>

          <p className="text-lg leading-8 text-muted-foreground">
            Webová platforma zameraná na hodnotenie lekárov, zdieľanie skúseností
            pacientov a podporu transparentnosti v zdravotníctve.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Button size="lg" asChild>
              <Link href="/doctors">Prejsť na lekárov</Link>
            </Button>

            <Button variant="outline" size="lg" asChild>
              <Link href="/forum">Otvoriť fórum</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Hodnotenie lekárov</CardTitle>
            <CardDescription>
              Modul pre recenzie, rating a spätnú väzbu pacientov.
            </CardDescription>
          </CardHeader>
          <CardContent>
            Používatelia môžu vytvárať recenzie a prideľovať hodnotenia.
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Komunitné fórum</CardTitle>
            <CardDescription>
              Diskusná vrstva pre otázky, skúsenosti a odporúčania.
            </CardDescription>
          </CardHeader>
          <CardContent>
            Fórum rozširuje systém o komunitnú komunikáciu mimo recenzií.
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>GDPR a audit</CardTitle>
            <CardDescription>
              Ochrana osobných údajov a dohľadateľnosť citlivých operácií.
            </CardDescription>
          </CardHeader>
          <CardContent>
            Platforma podporuje export dát, anonymizáciu a auditovanie zmien.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}