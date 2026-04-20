"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const profileLinks = [
  { href: "/profile", label: "Prehľad profilu" },
  { href: "/profile/settings", label: "Nastavenia" },
];

export default function ProfileNavigation() {
  const pathname = usePathname();

  return (
    <div className="rounded-2xl border bg-white p-2 shadow-sm">
      <nav className="flex flex-wrap gap-2">
        {profileLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              pathname === link.href
                ? "bg-sky-100 text-sky-700"
                : "text-slate-700 hover:bg-slate-100 hover:text-sky-600"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}