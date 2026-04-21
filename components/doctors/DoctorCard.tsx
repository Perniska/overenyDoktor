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
import { getDoctorAvatarSrc } from "@/lib/entitiy-avatar";
import { getDataQualityStatusLabel } from "@/lib/labels";

export type DoctorListItem = {
  id: string;
  title: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  specialization_name: string | null;
  specialization_slug: string | null;
  city: string | null;
  region: string | null;
  street: string | null;
  facility_name: string | null;
  avg_rating: number | null;
  review_count: number;
  verification_status: string;
  data_quality_status: string;
  raw_name?: string | null;
};

type DoctorCardProps = {
  doctor: DoctorListItem;
};

export function DoctorCard({ doctor }: DoctorCardProps) {
  const rating = Number(doctor.avg_rating ?? 0);
  const hasRating = doctor.review_count > 0 && rating > 0;
  const avatarSrc = getDoctorAvatarSrc(doctor);

  return (
    <Link href={`/doctors/${doctor.id}`} className="block h-full">
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
              <Image
                src={avatarSrc}
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
                    {doctor.full_name ||
                      `${doctor.first_name} ${doctor.last_name}`}
                  </CardTitle>

                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                    <Stethoscope className="size-4" />
                    {doctor.specialization_name ?? "Špecializácia neuvedená"}
                  </p>
                </div>

                {doctor.verification_status === "verified" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <ShieldCheck className="size-3.5" />
                    overený
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm text-slate-600">
          {doctor.facility_name ? (
            <p className="flex items-center gap-1.5">
              <Building2 className="size-4" />
              {doctor.facility_name}
            </p>
          ) : null}

          {doctor.city || doctor.region ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {[doctor.street, doctor.city, doctor.region]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : null}

          <p className="text-xs text-slate-500">
            {getDataQualityStatusLabel(doctor.data_quality_status)}
          </p>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="flex items-center gap-1.5 font-medium text-slate-800">
              <Star className="size-4" />
              {hasRating ? rating.toFixed(1) : "Bez hodnotenia"}
            </span>

            <span className="text-xs text-slate-500">
              {doctor.review_count} recenzií
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
