"use client";

import { FormEvent, useTransition } from "react";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = {
  id: string;
  name: string;
  slug: string;
};

type PublicSearchFormProps = {
  basePath: "/doctors" | "/facilities";
  placeholder: string;
  specializations?: Option[];
  facilityTypes?: Option[];
  showFacilityType?: boolean;
};

export function PublicSearchForm({
  basePath,
  placeholder,
  specializations = [],
  facilityTypes = [],
  showFacilityType = false,
}: PublicSearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") ?? "";
  const currentSpecialization = searchParams.get("specialization") ?? "";
  const currentFacilityType = searchParams.get("facilityType") ?? "";
  const currentCity = searchParams.get("city") ?? "";
  const currentRegion = searchParams.get("region") ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const q = String(formData.get("q") ?? "").trim();
    const specialization = String(formData.get("specialization") ?? "").trim();
    const facilityType = String(formData.get("facilityType") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim();

    if (q) params.set("q", q);
    if (specialization) params.set("specialization", specialization);
    if (facilityType) params.set("facilityType", facilityType);
    if (city) params.set("city", city);
    if (region) params.set("region", region);

    startTransition(() => {
      router.push(params.toString() ? `${basePath}?${params}` : basePath);
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push(basePath);
    });
  }

  const hasFilters =
    currentQuery ||
    currentSpecialization ||
    currentFacilityType ||
    currentCity ||
    currentRegion;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Vyhľadávanie
          </label>
          <Input name="q" defaultValue={currentQuery} placeholder={placeholder} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Špecializácia
          </label>
          <select
            name="specialization"
            defaultValue={currentSpecialization}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">Všetky</option>
            {specializations.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {showFacilityType ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Typ zariadenia
            </label>
            <select
              name="facilityType"
              defaultValue={currentFacilityType}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">Všetky typy</option>
              {facilityTypes.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

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
          <Input name="region" defaultValue={currentRegion} placeholder="Žilinský" />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={isPending}>
          <Search className="size-4" />
          Hľadať
        </Button>

        {hasFilters ? (
          <Button type="button" variant="outline" onClick={clearFilters} disabled={isPending}>
            <X className="size-4" />
            Vymazať
          </Button>
        ) : null}
      </div>
    </form>
  );
}