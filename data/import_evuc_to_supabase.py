from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "overenydoktor.sk/evuc")

DAYS = [
    ("office_hours_monday", "monday"),
    ("office_hours_tuesday", "tuesday"),
    ("office_hours_wednesday", "wednesday"),
    ("office_hours_thursday", "thursday"),
    ("office_hours_friday", "friday"),
    ("office_hours_saturday", "saturday"),
    ("office_hours_sunday", "sunday"),
]

DOCTOR_TITLE_RE = re.compile(
    r"\b(MUDr\.|MDDr\.|PhDr\.|Mgr\.|Bc\.|doc\.|prof\.|RNDr\.|Ing\.|prim\.)\b",
    re.IGNORECASE,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_env_file(path: Path) -> None:
    """Jednoduche nacitanie .env/.env.local bez python-dotenv balika."""
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def text(value: Any) -> str | None:
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def clean_provider_ico(value: Any) -> str | None:
    value = text(value)
    if not value:
        return None
    digits = re.sub(r"\D+", "", value)
    if 6 <= len(digits) <= 8:
        return digits
    return None


def normalize_data_quality_status(value: Any) -> str:
    """Mapuje hodnoty z CSV na povolene hodnoty v DB check constrainte."""
    v = (text(value) or "").lower().strip()
    if v in {"current", "outdated", "reported", "unknown"}:
        return v
    if v in {"ready", "ok", "valid", "imported", "active"}:
        return "current"
    if v in {"needs_review", "needs_manual_check", "pending", "review"}:
        return "unknown"
    return "current"


def to_int(value: Any) -> int | None:
    value = text(value)
    if not value:
        return None
    match = re.search(r"\d+", value)
    return int(match.group(0)) if match else None


def zip5(value: Any) -> str | None:
    value = text(value)
    if not value:
        return None
    digits = re.sub(r"\D+", "", value)
    return digits if len(digits) == 5 else None


def as_bool(value: Any, default: bool = False) -> bool:
    value = text(value)
    if value is None:
        return default
    return value.lower() in {"1", "true", "t", "yes", "y", "ano", "áno"}


def as_uuid(value: Any) -> str | None:
    value = text(value)
    if not value:
        return None
    try:
        return str(uuid.UUID(value))
    except ValueError:
        return None


def uuid_or_generated(value: Any, prefix: str, fallback: str) -> str:
    parsed = as_uuid(value)
    if parsed:
        return parsed
    return str(uuid.uuid5(NAMESPACE, f"{prefix}:{fallback}"))


def parse_page_id(source_url: str | None) -> int | None:
    if not source_url:
        return None
    match = re.search(r"[?&]page_id=(\d+)", source_url)
    return int(match.group(1)) if match else None


def split_multi(value: Any) -> list[str]:
    value = text(value)
    if not value:
        return []
    parts = re.split(r"\s*(?:\||;|\n|\r\n)\s*", value)
    return list(dict.fromkeys([p.strip() for p in parts if p and p.strip()]))


def clean_dict(data: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in data.items():
        if value is None:
            continue
        if value == "" or value == []:
            continue
        out[key] = value
    return out


def iter_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def file_kind(headers: set[str], filename: str) -> str:
    if {"id", "slug", "name", "info"}.issubset(headers):
        return "facility_type_seed"
    if {"id", "slug", "category", "name"}.issubset(headers):
        return "specialization_seed"
    if {"facility_id", "evuc_page_id", "facility_name", "facility_type_id"}.issubset(headers):
        return "facilities_staging"
    if {"facility_id", "evuc_identifier", "street", "zip_code", "full_address"}.issubset(headers):
        return "facility_addresses"
    if {"facility_id", "evuc_identifier", "specialization_id", "specialization_name"}.issubset(headers):
        return "facility_specializations"
    if {"doctor_candidate_id", "facility_id", "doctor_full_name", "doctor_first_name", "doctor_last_name"}.issubset(headers):
        if "high_confidence" in filename.lower():
            return "doctor_candidates_high_confidence"
        return "doctor_candidates_staging"
    if {"id", "name", "id_facility_type", "description", "website_url", "deleted_at"}.issubset(headers):
        return "facilities_existing_schema_seed"
    return "unknown"


class SupabaseRest:
    def __init__(self, url: str, key: str, dry_run: bool = False) -> None:
        self.url = url.rstrip("/")
        self.rest_url = f"{self.url}/rest/v1"
        self.key = key
        self.dry_run = dry_run

    def _headers(self, prefer: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def upsert(self, table: str, rows: list[dict[str, Any]], on_conflict: str, batch_size: int = 250) -> int:
        if not rows:
            return 0

        total = 0
        for start in range(0, len(rows), batch_size):
            raw_batch = [clean_dict(row) for row in rows[start : start + batch_size]]
            raw_batch = [row for row in raw_batch if row]
            if not raw_batch:
                continue

            # PostgREST pri hromadnom upserte vyzaduje, aby mal kazdy objekt
            # v jednom JSON poli rovnake kluce. Niektore nase riadky maju
            # prazdne volitelne hodnoty, preto ich tu doplnime ako null.
            all_keys = sorted({key for row in raw_batch for key in row.keys()})
            batch = [{key: row.get(key) for key in all_keys} for row in raw_batch]

            if self.dry_run:
                total += len(batch)
                continue

            conflict = quote(on_conflict, safe=",")
            endpoint = f"{self.rest_url}/{table}?on_conflict={conflict}"
            body = json.dumps(batch, ensure_ascii=False).encode("utf-8")
            request = Request(
                endpoint,
                data=body,
                headers=self._headers("resolution=merge-duplicates,return=minimal"),
                method="POST",
            )
            try:
                with urlopen(request, timeout=60) as response:
                    if response.status not in {200, 201, 204}:
                        raise RuntimeError(f"Neocakavany HTTP status {response.status} pri tabulke {table}")
            except HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")
                example_keys = sorted(batch[0].keys()) if batch else []
                raise RuntimeError(
                    f"Supabase chyba pri tabulke {table} / on_conflict={on_conflict} "
                    f"/ batch_start={start}:\n"
                    f"HTTP {exc.code}\n{detail}\n"
                    f"Kluce v odosielanom batchi: {example_keys}"
                ) from exc
            except URLError as exc:
                raise RuntimeError(f"Nepodarilo sa spojit so Supabase: {exc}") from exc
            total += len(batch)
        return total


def normalize_key(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower().strip())


def build_facility_type_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        raw_id = text(row.get("id")) or text(row.get("slug")) or text(row.get("name")) or "unknown"
        out.append(clean_dict({
            "id": uuid_or_generated(row.get("id"), "facility_type", raw_id),
            "slug": text(row.get("slug")),
            "name": text(row.get("name")) or text(row.get("slug")) or "Neznamy typ zariadenia",
            "info": text(row.get("info")),
        }))
    return out


def build_specialization_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        slug = text(row.get("slug")) or text(row.get("name")) or "nezname"
        out.append(clean_dict({
            "id": uuid_or_generated(row.get("id"), "specialization", slug),
            "slug": slug,
            "category": text(row.get("category")),
            "name": text(row.get("name")) or slug,
        }))
    return out


def specialization_lookup(rows: list[dict[str, str]]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for row in rows:
        spec_id = uuid_or_generated(row.get("id"), "specialization", text(row.get("slug")) or text(row.get("name")) or "")
        for key in (row.get("slug"), row.get("name")):
            key_text = text(key)
            if key_text:
                lookup[normalize_key(key_text)] = spec_id
    return lookup


def office_hours_from_row(row: dict[str, str]) -> dict[str, Any]:
    hours: dict[str, Any] = {}
    valid_from = text(row.get("office_hours_valid_from"))
    if valid_from:
        hours["valid_from"] = valid_from
    for csv_key, json_key in DAYS:
        value = text(row.get(csv_key))
        if value:
            hours[json_key] = value
    return hours


def parse_evuc_parse_status(value: Any) -> str | None:
    value = text(value)
    if not value:
        return None
    value = value.lower()
    return value if value in {"facility_only", "needs_review", "needs_manual_check"} else None


def verification_status_from_parse(parse_status: str | None) -> str:
    return "needs_review" if parse_status in {"needs_review", "needs_manual_check"} else "pending"


def build_facility_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        raw_facility_id = text(row.get("facility_id")) or text(row.get("evuc_identifier")) or text(row.get("source_url")) or text(row.get("facility_name")) or ""
        facility_id = uuid_or_generated(row.get("facility_id"), "facility", raw_facility_id)
        facility_type_id = as_uuid(row.get("facility_type_id"))
        if not facility_type_id:
            continue
        parse_status = parse_evuc_parse_status(row.get("verification_status"))
        out.append(clean_dict({
            "id": facility_id,
            "name": text(row.get("facility_name")) or "Nezname zdravotnicke zariadenie",
            "id_facility_type": facility_type_id,
            "description": text(row.get("description_for_existing_facilities")),
            "website_url": None,
            "evuc_identifier": text(row.get("evuc_identifier")),
            "evuc_page_id": to_int(row.get("evuc_page_id")),
            "source_url": text(row.get("source_url")),
            "provider_name": text(row.get("provider_name")),
            "provider_ico": clean_provider_ico(row.get("provider_ico")),
            "region": text(row.get("region")),
            "district": text(row.get("district")),
            "raw_address": text(row.get("address_full")),
            "facility_kind": text(row.get("facility_type")),
            "primary_specialization": text(row.get("primary_specialization")),
            "specializations_raw": split_multi(row.get("specializations")),
            "insurance_companies": split_multi(row.get("insurance_companies")),
            "office_hours": office_hours_from_row(row),
            "price_list_url": text(row.get("price_list_pdf_url")),
            "price_list_note": text(row.get("price_list_pdf_name")),
            "evuc_import_status": "imported_from_evuc",
            "evuc_parse_status": parse_status,
            "verification_status": verification_status_from_parse(parse_status),
            "data_quality_status": normalize_data_quality_status(row.get("data_quality_status")),
            "last_checked_at": now_iso(),
        }))
    return out


def build_address_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        facility_id = as_uuid(row.get("facility_id")) or uuid_or_generated(row.get("facility_id"), "facility", text(row.get("evuc_identifier")) or text(row.get("full_address")) or "")
        city = text(row.get("city"))
        region = text(row.get("region"))
        zc = zip5(row.get("zip_code"))
        full_address = text(row.get("full_address"))
        street = text(row.get("street"))
        number = text(row.get("street_number"))
        street_full = f"{street} {number}" if street and number and number not in street else (street or full_address)
        if not (street_full and city and region and zc):
            continue
        out.append(clean_dict({
            "id": str(uuid.uuid5(NAMESPACE, f"address:{facility_id}:{full_address or street_full}:{zc}")),
            "street": street_full,
            "city": city,
            "region": region,
            "zip_code": zc,
            "id_facility": facility_id,
            "id_doctor": None,
            "is_primary": as_bool(row.get("is_primary"), True),
            "raw_address": full_address,
            "source": "evuc",
        }))
    return out


def build_facility_specialization_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    for row in rows:
        facility_id = as_uuid(row.get("facility_id"))
        specialization_id = as_uuid(row.get("specialization_id"))
        if not facility_id or not specialization_id:
            continue

        key = (facility_id, specialization_id)
        if key in seen:
            continue
        seen.add(key)

        out.append(clean_dict({
            "id_facility": facility_id,
            "id_specialization": specialization_id,
            "is_primary": as_bool(row.get("is_primary"), False),
            "source": "evuc",
            "evuc_identifier": text(row.get("evuc_identifier")),
        }))

    return out


def should_import_doctor(row: dict[str, str], source_kind: str, include_review_doctors: bool) -> bool:
    first = text(row.get("doctor_first_name"))
    last = text(row.get("doctor_last_name"))
    full = text(row.get("doctor_full_name"))
    if not (first and last and full):
        return False
    if source_kind == "doctor_candidates_high_confidence":
        return True
    if not include_review_doctors:
        return False
    title = text(row.get("doctor_title"))
    confidence_text = text(row.get("candidate_confidence"))
    try:
        confidence = float(confidence_text.replace(",", ".")) if confidence_text else 0.0
    except ValueError:
        confidence = 0.0
    return bool(title) or bool(DOCTOR_TITLE_RE.search(full)) or confidence >= 0.75


def build_doctor_and_link_rows(
    candidates_by_kind: list[tuple[str, dict[str, str]]],
    spec_lookup: dict[str, str],
    include_review_doctors: bool,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    doctors: list[dict[str, Any]] = []
    links: list[dict[str, Any]] = []
    seen_doctors: set[str] = set()
    seen_links: set[tuple[str, str]] = set()

    def priority(item: tuple[str, dict[str, str]]) -> int:
        return 0 if item[0] == "doctor_candidates_high_confidence" else 1

    for kind, row in sorted(candidates_by_kind, key=priority):
        if not should_import_doctor(row, kind, include_review_doctors):
            continue

        candidate_id = text(row.get("doctor_candidate_id")) or f"{text(row.get('facility_id'))}:{text(row.get('doctor_full_name'))}"
        if not candidate_id:
            continue

        doctor_id = str(uuid.uuid5(NAMESPACE, f"doctor:{candidate_id}"))
        if doctor_id in seen_doctors:
            continue
        seen_doctors.add(doctor_id)

        primary_specialization = text(row.get("primary_specialization"))
        spec_id = spec_lookup.get(normalize_key(primary_specialization)) if primary_specialization else None

        doctors.append(clean_dict({
            "id": doctor_id,
            "first_name": text(row.get("doctor_first_name")),
            "last_name": text(row.get("doctor_last_name")),
            "identifier": candidate_id,
            "specialization": spec_id,
            "verification_status": "needs_review",
            "verification_source": "evuc",
            "source_url": text(row.get("source_url")),
            "last_checked_at": now_iso(),
            "data_quality_status": "current",
            "title": text(row.get("doctor_title")),
            "raw_name": text(row.get("doctor_full_name")),
            "source_page_id": parse_page_id(text(row.get("source_url"))),
            "import_status": "imported_from_evuc",
        }))

        facility_id = as_uuid(row.get("facility_id"))
        if facility_id:
            link_key = (doctor_id, facility_id)
            if link_key not in seen_links:
                seen_links.add(link_key)
                links.append({
                    "id_doctor": doctor_id,
                    "id_facility": facility_id,
                    "role": "primary",
                    "is_current": True,
                })

    return doctors, links


def main() -> int:
    parser = argparse.ArgumentParser(description="Import eVUC CSV dat do Supabase.")
    parser.add_argument("--csv", nargs="+", required=True, help="Cesta k jednemu alebo viacerym CSV suborom.")
    parser.add_argument("--env-file", default=".env.local", help="Cesta k .env suboru. Default: .env.local")
    parser.add_argument("--include-review-doctors", action="store_true", help="Importovat aj opatrne vyfiltrovanych staging lekarov.")
    parser.add_argument("--dry-run", action="store_true", help="Len spracuje CSV, nic neposiela do Supabase.")
    parser.add_argument("--batch-size", type=int, default=250)
    args = parser.parse_args()

    load_env_file(Path(args.env_file))
    if Path(args.env_file).name != ".env":
        load_env_file(Path(".env"))

    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    if not supabase_url or not supabase_key:
        print("Chyba SUPABASE_URL a/alebo SUPABASE_SERVICE_ROLE_KEY v .env.local/.env.", file=sys.stderr)
        print("Na import odporucam SERVICE_ROLE_KEY, nie anon key.", file=sys.stderr)
        return 2

    categorized: dict[str, list[dict[str, str]]] = {
        "facility_type_seed": [],
        "specialization_seed": [],
        "facilities_staging": [],
        "facility_addresses": [],
        "facility_specializations": [],
        "facilities_existing_schema_seed": [],
        "doctor_candidates_high_confidence": [],
        "doctor_candidates_staging": [],
        "unknown": [],
    }

    for path_str in args.csv:
        path = Path(path_str)
        if not path.exists():
            print(f"Preskakujem, subor neexistuje: {path}", file=sys.stderr)
            continue
        rows = iter_csv_rows(path)
        if not rows:
            print(f"Preskakujem prazdny CSV subor: {path.name}")
            continue
        kind = file_kind(set(rows[0].keys()), path.name)
        categorized.setdefault(kind, []).extend(rows)
        print(f"{path.name}: {len(rows)} riadkov -> {kind}")

    facility_type_rows = build_facility_type_rows(categorized["facility_type_seed"])
    specialization_rows = build_specialization_rows(categorized["specialization_seed"])
    facility_rows = build_facility_rows(categorized["facilities_staging"])
    address_rows = build_address_rows(categorized["facility_addresses"])
    facility_specialization_rows = build_facility_specialization_rows(categorized["facility_specializations"])

    candidates_by_kind: list[tuple[str, dict[str, str]]] = []
    candidates_by_kind.extend(("doctor_candidates_high_confidence", row) for row in categorized["doctor_candidates_high_confidence"])
    candidates_by_kind.extend(("doctor_candidates_staging", row) for row in categorized["doctor_candidates_staging"])

    spec_lookup = specialization_lookup(categorized["specialization_seed"])
    doctor_rows, doctor_facility_rows = build_doctor_and_link_rows(
        candidates_by_kind,
        spec_lookup,
        include_review_doctors=args.include_review_doctors,
    )

    print("\nPripravene na import:")
    print(f"  facility_type:              {len(facility_type_rows)}")
    print(f"  specialization:             {len(specialization_rows)}")
    print(f"  facilities:                 {len(facility_rows)}")
    print(f"  addresses:                  {len(address_rows)}")
    print(f"  facility_specializations:   {len(facility_specialization_rows)}")
    print(f"  doctors:                    {len(doctor_rows)}")
    print(f"  doctor_facilities:          {len(doctor_facility_rows)}")

    if categorized["facilities_existing_schema_seed"]:
        print(f"  Pozn.: evuc_facilities_seed_existing_schema.csv ma {len(categorized['facilities_existing_schema_seed'])} riadkov a je preskoceny, lebo importujeme bohatsi evuc_facilities_staging.csv.")

    if categorized["unknown"]:
        print(f"  Pozor: {len(categorized['unknown'])} riadkov bolo v neznamom type CSV a neimportovali sa.")

    if args.dry_run:
        print("\nDRY RUN: Do Supabase sa nic neposlalo.")
        return 0

    client = SupabaseRest(supabase_url, supabase_key, dry_run=False)
    imported = {
        "facility_type": client.upsert("facility_type", facility_type_rows, "id", args.batch_size),
        "specialization": client.upsert("specialization", specialization_rows, "id", args.batch_size),
        "facilities": client.upsert("facilities", facility_rows, "id", args.batch_size),
        "addresses": client.upsert("addresses", address_rows, "id", args.batch_size),
        "facility_specializations": client.upsert("facility_specializations", facility_specialization_rows, "id_facility,id_specialization", args.batch_size),
        "doctors": client.upsert("doctors", doctor_rows, "id", args.batch_size),
        "doctor_facilities": client.upsert("doctor_facilities", doctor_facility_rows, "id_doctor,id_facility", args.batch_size),
    }

    print("\nHotovo. Importovane/upsertovane:")
    for table, count in imported.items():
        print(f"  {table}: {count}")

    print("\nRychla kontrola v Supabase SQL editore:")
    print("  select count(*) from facilities;")
    print("  select count(*) from specialization;")
    print("  select count(*) from facility_specializations;")
    print("  select count(*) from doctors;")
    print("  select count(*) from doctor_facilities;")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
