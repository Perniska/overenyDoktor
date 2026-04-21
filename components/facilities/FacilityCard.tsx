// components/facilities/FacilityCard.tsx

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  MapPin,
  ShieldCheck,
  Star,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FACILITY_AVATAR_SRC } from "@/lib/entitiy-avatar";
import { getDataQualityStatusLabel } from "@/lib/labels";

export type FacilityListItem = {
  id: string;
  name: string;
  facility_type_name: string | null;
  facility_type_slug: string | null;
  facility_kind: string | null;
  provider_name: string | null;
  provider_ico: string | null;
  primary_specialization: string | null;
  city: string | null;
  region: string | null;
  district: string | null;
  street: string | null;
  raw_address: string | null;
  avg_rating: number | null;
  review_count: number;
  verification_status: string;
  data_quality_status: string;
};

type FacilityCardProps = {
  facility: FacilityListItem;
};

export function FacilityCard({ facility }: FacilityCardProps) {
  const rating = Number(facility.avg_rating ?? 0);
  const hasRating = facility.review_count > 0 && rating > 0;

  return (
    <Link href={`/facilities/${facility.id}`} className="block h-full">
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
              <Image
                src={FACILITY_AVATAR_SRC}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="line-clamp-2 text-lg">
                    {facility.name}
                  </CardTitle>

                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                    <Building2 className="size-4" />
                    {facility.facility_type_name ??
                      facility.facility_kind ??
                      "Zdravotnícke zariadenie"}
                  </p>
                </div>

                {facility.verification_status === "verified" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <ShieldCheck className="size-3.5" />
                    overené
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm text-slate-600">
          {facility.primary_specialization ? (
            <p className="flex items-center gap-1.5">
              <Stethoscope className="size-4" />
              {facility.primary_specialization}
            </p>
          ) : null}

          {facility.city || facility.region || facility.raw_address ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {[facility.street, facility.city, facility.region]
                .filter(Boolean)
                .join(", ") || facility.raw_address}
            </p>
          ) : null}

          <p className="text-xs text-slate-500">
            {getDataQualityStatusLabel(facility.data_quality_status)}
          </p>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="flex items-center gap-1.5 font-medium text-slate-800">
              <Star className="size-4" />
              {hasRating ? rating.toFixed(1) : "Bez hodnotenia"}
            </span>

            <span className="text-xs text-slate-500">
              {facility.review_count} recenzií
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}