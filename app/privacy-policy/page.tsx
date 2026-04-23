import Link from "next/link";

export const metadata = {
  title: "Zásady ochrany osobných údajov | OverenýDoktor",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Ochrana osobných údajov
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Zásady ochrany osobných údajov
        </h1>

        <p className="mt-2 text-slate-600">
          Táto stránka predstavuje pracovnú verziu zásad ochrany osobných údajov
          pre prototyp systému OverenýDoktor.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">1. Aké údaje spracúvame</h2>
          <p className="mt-2 text-slate-700">
            Spracúvajú sa údaje potrebné na registráciu, prihlásenie, správu profilu,
            vytváranie recenzií, príspevkov vo fóre, nahlásení obsahu a GDPR žiadostí.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">2. Účel spracúvania</h2>
          <p className="mt-2 text-slate-700">
            Údaje sa používajú na prevádzku používateľského účtu, zobrazovanie a
            správu recenzií, moderovanie obsahu, bezpečnostný audit a vybavenie
            práv používateľov súvisiacich s osobnými údajmi.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">3. Analýza recenzií</h2>
          <p className="mt-2 text-slate-700">
            Text recenzií môže byť automatizovane analyzovaný na účely detekcie
            sentimentu, kategorizácie spätnej väzby, identifikácie nevhodného
            obsahu a ochrany pred zverejnením osobných alebo citlivých údajov.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">4. Uchovávanie údajov</h2>
          <p className="mt-2 text-slate-700">
            Údaje sa uchovávajú po dobu nevyhnutnú na prevádzku systému,
            bezpečnostné účely a audit. Pri žiadosti o výmaz sa profil a väzby
            používateľa anonymizujú v rozsahu implementovanom v aplikácii.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">5. Práva používateľa</h2>
          <p className="mt-2 text-slate-700">
            Používateľ môže požiadať o export údajov, výmaz alebo anonymizáciu
            účtu prostredníctvom GDPR sekcie v aplikácii.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">6. Kontakt</h2>
          <p className="mt-2 text-slate-700">
            Pre otázky súvisiace s ochranou údajov môže používateľ použiť kontaktnú stránku.
          </p>
        </div>
      </section>

      <Link
        href="/gdpr"
        className="inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Prejsť na GDPR stránku
      </Link>
    </main>
  );
}