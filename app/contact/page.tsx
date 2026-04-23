import { Mail, Shield, UserCircle } from "lucide-react";
import { siteConfig } from "@/lib/site";

export const metadata = {
  title: "Kontakt | OverenýDoktor",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Kontakt
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Kontaktné informácie
        </h1>

        <p className="mt-2 text-slate-600">
          Na tejto stránke sú uvedené kontaktné údaje pre otázky k prevádzke
          prototypu, správe obsahu a ochrane osobných údajov.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <UserCircle className="size-5" />
            Administrátor systému
          </p>

          <p className="mt-3 text-sm text-slate-700">{siteConfig.adminName}</p>

          <a
            href={`mailto:${siteConfig.adminEmail}`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
          >
            <Mail className="size-4" />
            {siteConfig.adminEmail}
          </a>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <Shield className="size-5" />
            GDPR kontakt
          </p>

          <p className="mt-3 text-sm text-slate-700">
            Otázky k exportu údajov, anonymizácii a ochrane súkromia.
          </p>

          <a
            href={`mailto:${siteConfig.gdprEmail}`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
          >
            <Mail className="size-4" />
            {siteConfig.gdprEmail}
          </a>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <Mail className="size-5" />
            Všeobecný kontakt
          </p>

          <p className="mt-3 text-sm text-slate-700">
            Otázky k funkčnosti systému, účtu alebo obsahu.
          </p>

          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
          >
            <Mail className="size-4" />
            {siteConfig.supportEmail}
          </a>
        </div>
      </section>

      <section className="rounded-2xl border bg-slate-50 p-5 text-sm text-slate-600">
        Pred odovzdaním práce si uprav kontaktné údaje tak, aby zodpovedali
        finálnej verzii prototypu alebo kontaktným údajom, ktoré chceš v práci uvádzať.
      </section>
    </main>
  );
}