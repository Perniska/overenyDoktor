"use client";

import { FormEvent, useTransition } from "react";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SpecializationOption = {
  id: string;
  name: string;
  slug: string;
};

type DoctorSearchFormProps = {
  specializations: SpecializationOption[];
};

export function DoctorSearchForm({ specializations }: DoctorSearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") ?? "";
  const currentSpecialization = searchParams.get("specialization") ?? "";
  const currentCity = searchParams.get("city") ?? "";
  const currentRegion = searchParams.get("region") ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const q = String(formData.get("q") ?? "").trim();
    const specialization = String(formData.get("specialization") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim();

    if (q) params.set("q", q);
    if (specialization) params.set("specialization", specialization);
    if (city) params.set("city", city);
    if (region) params.set("region", region);

    startTransition(() => {
      router.push(params.toString() ? `/doctors?${params}` : "/doctors");
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push("/doctors");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-[2fr_1.4fr_1fr_1fr_auto]">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Meno, špecializácia alebo zariadenie
          </label>
          <Input
            name="q"
            defaultValue={currentQuery}
            placeholder="napr. Novák, kardiológ, ambulancia..."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Špecializácia
          </label>
          <select
            name="specialization"
            defaultValue={currentSpecialization}
            className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Všetky špecializácie</option>
            {specializations.map((specialization) => (
              <option key={specialization.id} value={specialization.slug}>
                {specialization.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Mesto
          </label>
          <Input name="city" defaultValue={currentCity} placeholder="Žilina" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Kraj
          </label>
          <Input
            name="region"
            defaultValue={currentRegion}
            placeholder="Žilinský"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" disabled={isPending} className="w-full">
            <Search className="size-4" />
            Hľadať
          </Button>

          {(currentQuery ||
            currentSpecialization ||
            currentCity ||
            currentRegion) && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={isPending}
              aria-label="Vymazať filtre"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}