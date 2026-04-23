import Link from "next/link";
import { Mail, Shield, FileText, PhoneCall } from "lucide-react";
import { siteConfig } from "@/lib/site";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-950">{siteConfig.name}</h2>
          <p className="text-sm leading-6 text-slate-600">
            {siteConfig.description}
          </p>

          <p className="text-sm text-slate-500">
            Prototyp vytvorený v rámci diplomovej práce.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
            Navigácia
          </h3>

          <nav className="mt-3 space-y-2 text-sm">
            <Link href="/" className="block text-slate-600 hover:text-sky-700">
              Domov
            </Link>
            <Link
              href="/doctors"
              className="block text-slate-600 hover:text-sky-700"
            >
              Lekári
            </Link>
            <Link
              href="/facilities"
              className="block text-slate-600 hover:text-sky-700"
            >
              Zariadenia
            </Link>
            <Link
              href="/forum"
              className="block text-slate-600 hover:text-sky-700"
            >
              Fórum
            </Link>
            <Link
              href="/analytics"
              className="block text-slate-600 hover:text-sky-700"
            >
              Analytika
            </Link>
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
            Právne a údaje
          </h3>

          <div className="mt-3 space-y-2 text-sm">
            <Link
              href="/privacy-policy"
              className="flex items-center gap-2 text-slate-600 hover:text-sky-700"
            >
              <Shield className="size-4" />
              Ochrana osobných údajov
            </Link>

            <Link
              href="/cookies"
              className="flex items-center gap-2 text-slate-600 hover:text-sky-700"
            >
              <FileText className="size-4" />
              Cookies a session
            </Link>

            <Link
              href="/gdpr"
              className="flex items-center gap-2 text-slate-600 hover:text-sky-700"
            >
              <Shield className="size-4" />
              GDPR žiadosti
            </Link>

            <Link
              href="/contact"
              className="flex items-center gap-2 text-slate-600 hover:text-sky-700"
            >
              <PhoneCall className="size-4" />
              Kontakt
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
            Kontakt na správu systému
          </h3>

          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-800">{siteConfig.adminName}</p>
              <a
                href={`mailto:${siteConfig.adminEmail}`}
                className="mt-1 flex items-center gap-2 hover:text-sky-700"
              >
                <Mail className="size-4" />
                {siteConfig.adminEmail}
              </a>
            </div>

            <div>
              <p className="font-medium text-slate-800">GDPR kontakt</p>
              <a
                href={`mailto:${siteConfig.gdprEmail}`}
                className="mt-1 flex items-center gap-2 hover:text-sky-700"
              >
                <Mail className="size-4" />
                {siteConfig.gdprEmail}
              </a>
            </div>

            <div>
              <p className="font-medium text-slate-800">Všeobecný kontakt</p>
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="mt-1 flex items-center gap-2 hover:text-sky-700"
              >
                <Mail className="size-4" />
                {siteConfig.supportEmail}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {year} {siteConfig.name}. Všetky práva vyhradené.</p>
          <p>Prototyp informačného systému pre diplomovú prácu.</p>
        </div>
      </div>
    </footer>
  );
}