export const metadata = {
  title: "Používanie cookies | OverenýDoktor",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Informácie o cookies
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Používanie cookies a session údajov
        </h1>

        <p className="mt-2 text-slate-600">
          Táto stránka predstavuje pracovnú verziu vysvetlenia používania cookies
          a autentifikačných session údajov v aplikácii OverenýDoktor.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">1. Technické cookies</h2>
          <p className="mt-2 text-slate-700">
            Aplikácia používa technické autentifikačné údaje a session mechanizmy,
            ktoré sú potrebné na prihlásenie, udržanie relácie a bezpečné fungovanie účtu.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">2. Na čo sa používajú</h2>
          <p className="mt-2 text-slate-700">
            Session údaje sa používajú najmä na identifikáciu prihláseného používateľa,
            správu prístupových práv a ochranu používateľských operácií.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">3. Marketingové cookies</h2>
          <p className="mt-2 text-slate-700">
            Prototyp aplikácie nepoužíva reklamné ani marketingové cookies.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">4. Analytické cookies</h2>
          <p className="mt-2 text-slate-700">
            Ak budú v budúcnosti doplnené externé analytické nástroje, táto stránka
            bude rozšírená o ich presný popis.
          </p>
        </div>
      </section>
    </main>
  );
}