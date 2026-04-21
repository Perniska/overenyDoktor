# evuc_pipeline.py
# Jeden skript na scraping + čistenie e-VÚC dát.
#
# Inštalácia balíkov:
#   py -m pip install requests beautifulsoup4 tqdm
#
# Spustenie, ak je tento súbor v koreňovom priečinku projektu:
#   py evuc_pipeline.py --max-pages 50000 --out-dir data
#
# Spustenie, ak je tento súbor v priečinku data:
#   py data\evuc_pipeline.py --max-pages 50000 --out-dir data
#
# Poznámka:
# - Začni radšej testom: --max-pages 1000
# - Finálny beh: --max-pages 50000 až 150000 podľa toho, koľko portál pustí stránok.

from __future__ import annotations

import argparse
import csv
import re
import time
from collections import deque
from pathlib import Path
from typing import Any, Optional
from urllib.parse import parse_qs, urlencode, urldefrag, urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

try:
    from tqdm import tqdm
except Exception:  # pragma: no cover
    tqdm = None


BASE_DOMAIN = "www.e-vuc.sk"

REGION_NAMES: dict[str, str] = {
    "bsk": "Bratislavský samosprávny kraj",
    "ttsk": "Trnavský samosprávny kraj",
    "tsk": "Trenčiansky samosprávny kraj",
    "nsk": "Nitriansky samosprávny kraj",
    "zsk": "Žilinský samosprávny kraj",
    "bbsk": "Banskobystrický samosprávny kraj",
    "psk": "Prešovský samosprávny kraj",
    "ksk": "Košický samosprávny kraj",
}

# Semienka sú zámerne širšie. Crawler potom berie iba /zdravotnictvo/ stránky.
CATEGORY_SEEDS: list[str] = [
    "zdravotnictvo",
    "zdravotnictvo/ambulantne-zdravotnicke-zariadenia",
    "zdravotnictvo/ustavne-zdravotnicke-zariadenia",
    "zdravotnictvo/lekarne",
    "zdravotnictvo/vydajne-zdravotnickych-pomocok",
]

OUTPUT_FIELDS: list[str] = [
    "source_url",
    "source_page_id",
    "region",
    "district",
    "facility_name",
    "facility_type",
    "external_identifier",
    "specializations",
    "primary_specialization",
    "insurance_companies",
    "provider_name",
    "provider_ico",
    "doctor_full_name",
    "doctor_title",
    "doctor_first_name",
    "doctor_last_name",
    "doctor_suffix",
    "doctor_source",
    "doctor_parse_status",
    "raw_address",
    "address_cleaned",
    "street",
    "street_number",
    "postal_code",
    "city",
    "city_part",
    "office_hours_valid_from",
    "office_hours_pondelok",
    "office_hours_utorok",
    "office_hours_streda",
    "office_hours_stvrtok",
    "office_hours_piatok",
    "office_hours_sobota",
    "office_hours_nedela",
    "price_list_pdf_url",
    "staff_names",
    "raw_text_excerpt",
    "import_status",
    "verification_status",
]

LABELS: dict[str, str] = {
    "druh zariadenia": "facility_type",
    "identifikátor": "external_identifier",
    "identifikator": "external_identifier",
    "odborné zameranie": "specializations",
    "odborne zameranie": "specializations",
    "miesto prevádzkovania": "raw_address",
    "miesto prevadzkovania": "raw_address",
    "poisťovne": "insurance_companies",
    "poistovne": "insurance_companies",
    "poskytovateľ": "provider_name",
    "poskytovatel": "provider_name",
    "ičo": "provider_ico",
    "ico": "provider_ico",
    "platnosť od": "office_hours_valid_from",
    "platnost od": "office_hours_valid_from",
}

STOP_SECTION_LABELS: set[str] = {
    "ordinačné hodiny",
    "ordinacne hodiny",
    "cenník",
    "cennik",
}

DAY_ALIASES: dict[str, str] = {
    "pondelok": "office_hours_pondelok",
    "utorok": "office_hours_utorok",
    "streda": "office_hours_streda",
    "štvrtok": "office_hours_stvrtok",
    "stvrtok": "office_hours_stvrtok",
    "piatok": "office_hours_piatok",
    "sobota": "office_hours_sobota",
    "nedeľa": "office_hours_nedela",
    "nedela": "office_hours_nedela",
}

TITLE_RE = r"(?:MUDr\.|MDDr\.|MVDr\.|Mgr\.|PhDr\.|JUDr\.|RNDr\.|Bc\.|doc\.|Doc\.|prof\.|Prof\.|Dr\.)"
SUFFIX_RE = r"(?:PhD\.|CSc\.|MPH|MBA|MHA|DrSc\.)"

MEDICAL_OR_FACILITY_WORDS: set[str] = {
    "ambulancia",
    "ambulancie",
    "stacionár",
    "stacionar",
    "svalz",
    "lekárstvo",
    "lekarstvo",
    "zubné",
    "zubne",
    "vnútorné",
    "vnutorne",
    "klinická",
    "klinickej",
    "klinicka",
    "imunológia",
    "imunologie",
    "alergológia",
    "alergologie",
    "psychológia",
    "psychologie",
    "fyziatria",
    "balneológie",
    "liečebnej",
    "rehabilitácie",
    "chirurgia",
    "chirurgická",
    "gynekológia",
    "pôrodníctvo",
    "otorinolaryngológia",
    "urológia",
    "rádiológia",
    "radiologia",
    "ultrazvukové",
    "ultrazvukove",
    "vyšetrovacie",
    "metódy",
    "funkčná",
    "diagnostika",
    "zubných",
    "lekári",
    "sestry",
    "detská",
    "detska",
    "zdravotná",
    "zdravotna",
    "starostlivosť",
    "starostlivost",
    "jednodňová",
    "jednodnova",
    "poskytovanie",
    "domáca",
    "domaca",
    "ošetrovateľská",
    "osetrovatelska",
    "lekáreň",
    "lekaren",
    "výdajňa",
    "vydajna",
    "nemocnica",
    "poliklinika",
    "centrum",
    "clinic",
    "klinika",
    "diagnostické",
    "diagnosticke",
    "zariadenie",
    "zariadenia",
    "pohotovosť",
    "pohotovost",
}

COMPANY_WORDS: set[str] = {
    "s.r.o",
    "s.r.o.",
    "spol.",
    "spol",
    "a.s",
    "a.s.",
    "n.o",
    "n.o.",
    "nezisková",
    "neziskova",
    "nemocnica",
    "poliklinika",
    "clinic",
    "klinika",
    "centrum",
    "group",
    "medical",
    "zdravie",
    "zdravotná",
    "zdravotna",
    "služba",
    "sluzba",
}

CITY_HINT_WORDS: set[str] = {
    "bratislava",
    "banská",
    "banska",
    "bystrica",
    "košice",
    "kosice",
    "prešov",
    "presov",
    "žilina",
    "zilina",
    "trnava",
    "trenčín",
    "trencin",
    "nitra",
    "staré",
    "stare",
    "mesto",
    "ružinov",
    "ruzinov",
    "vrakuňa",
    "vrakuna",
    "podunajské",
    "podunajske",
    "biskupice",
}


def clean_ws(value: Any) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()


def normalize_key(value: str) -> str:
    value = clean_ws(value).lower().strip(":")
    replacements = str.maketrans({
        "á": "a", "ä": "a", "č": "c", "ď": "d", "é": "e", "í": "i",
        "ľ": "l", "ĺ": "l", "ň": "n", "ó": "o", "ô": "o", "ŕ": "r",
        "š": "s", "ť": "t", "ú": "u", "ý": "y", "ž": "z",
    })
    return value.translate(replacements)


def get_attr_str(tag: Any, attr: str) -> Optional[str]:
    """Bezpečné čítanie atribútov z BeautifulSoup tak, aby Pylance nehlásil typové chyby."""
    if tag is None:
        return None
    raw = tag.get(attr)
    if raw is None:
        return None
    if isinstance(raw, list):
        return " ".join(str(x) for x in raw if x is not None).strip() or None
    return str(raw).strip() or None


def strip_query_noise(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query, keep_blank_values=True)

    # page_id je dôležitý. Ostatné navigačné parametre nechávame len vtedy,
    # ak sú potrebné na otvorenie stránky. Tracking parametre zahodíme.
    allowed_prefixes = ("page", "page_id", "id", "p", "search", "q")
    clean_query: dict[str, list[str]] = {}
    for key, values in query.items():
        low = key.lower()
        if low.startswith(("utm_", "fbclid", "gclid")):
            continue
        if low in {"page_id"} or low.startswith(allowed_prefixes):
            clean_query[key] = values

    encoded = urlencode(clean_query, doseq=True)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, encoded, ""))


def clean_url(href: str, base_url: str) -> Optional[str]:
    href = clean_ws(href)
    if not href:
        return None
    if href.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None

    joined = urljoin(base_url, href)
    joined, _fragment = urldefrag(joined)
    parsed = urlparse(joined)

    if parsed.scheme not in {"http", "https"}:
        return None

    netloc = parsed.netloc.lower()
    if netloc != BASE_DOMAIN:
        return None

    path = parsed.path or "/"
    low_path = path.lower()

    blocked_ext = (
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
        ".css", ".js", ".zip", ".rar", ".doc", ".docx", ".xls", ".xlsx",
    )
    if low_path.endswith(blocked_ext):
        return None

    # PDF neprechádzame ako stránku, ale PDF linky cenníkov vyberáme z detailu zvlášť.
    if low_path.endswith(".pdf"):
        return None

    if "/zdravotnictvo/" not in low_path:
        return None

    return strip_query_noise(joined)


def build_start_urls(selected_regions: Optional[list[str]] = None) -> list[str]:
    regions = selected_regions or list(REGION_NAMES.keys())
    urls: list[str] = []
    for region in regions:
        region = region.strip().lower()
        if region not in REGION_NAMES:
            continue
        for category in CATEGORY_SEEDS:
            urls.append(f"https://{BASE_DOMAIN}/{region}/{category}.html")
            urls.append(f"https://{BASE_DOMAIN}/{region}/{category}/")
    return list(dict.fromkeys(urls))


def fetch(session: requests.Session, url: str, timeout: int = 30) -> Optional[str]:
    try:
        response = session.get(url, timeout=timeout)
        if response.status_code != 200:
            return None
        ctype = response.headers.get("content-type", "").lower()
        if "text/html" not in ctype and "application/xhtml" not in ctype and ctype:
            return None
        response.encoding = response.apparent_encoding or "utf-8"
        return response.text
    except requests.RequestException:
        return None


def soup_text_lines(soup: BeautifulSoup) -> list[str]:
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text("\n", strip=True)
    lines: list[str] = []
    for line in text.splitlines():
        line = clean_ws(line)
        if not line:
            continue
        if line in {"|", "›", "»"}:
            continue
        lines.append(line)
    return lines


def line_starts_with_label(line: str) -> Optional[tuple[str, str]]:
    raw = clean_ws(line)
    raw_norm = normalize_key(raw)

    for label, field in LABELS.items():
        label_norm = normalize_key(label)
        if raw_norm == label_norm:
            return field, ""
        if raw_norm.startswith(label_norm + ":"):
            # Remainder berieme z pôvodného textu, nie z normalizovaného.
            match = re.match(rf"^{re.escape(label)}\s*:\s*(.*)$", raw, flags=re.I)
            if match:
                return field, clean_ws(match.group(1))
            # Fallback bez diakritiky.
            parts = raw.split(":", 1)
            return field, clean_ws(parts[1]) if len(parts) > 1 else ""

    return None


def is_any_label(line: str) -> bool:
    if line_starts_with_label(line):
        return True
    norm = normalize_key(line)
    if norm in {normalize_key(x) for x in STOP_SECTION_LABELS}:
        return True
    if norm.rstrip(":") in {normalize_key(x) for x in DAY_ALIASES}:
        return True
    return False


def parse_label_blocks(lines: list[str]) -> dict[str, str]:
    data: dict[str, list[str]] = {}

    i = 0
    while i < len(lines):
        label_info = line_starts_with_label(lines[i])
        if not label_info:
            i += 1
            continue

        field, remainder = label_info
        values: list[str] = []
        if remainder:
            values.append(remainder)

        i += 1
        while i < len(lines) and not is_any_label(lines[i]):
            # Koniec poisťovní/odborného zamerania býva pred Poskytovateľ/IČO atď.
            values.append(lines[i])
            i += 1

        if values:
            data.setdefault(field, []).extend(values)

    out: dict[str, str] = {}
    for field, values in data.items():
        cleaned = [clean_ws(v) for v in values if clean_ws(v)]
        if not cleaned:
            continue
        if field in {"specializations", "insurance_companies"}:
            out[field] = "; ".join(dedupe_keep_order(cleaned))
        elif field == "raw_address":
            out[field] = ", ".join(cleaned)
        else:
            out[field] = clean_ws(" ".join(cleaned))

    return out


def parse_office_hours(lines: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}

    for idx, line in enumerate(lines):
        cleaned = clean_ws(line)
        norm = normalize_key(cleaned).rstrip(":")

        # Platnosť od
        if norm.startswith("platnost od"):
            if ":" in cleaned:
                out["office_hours_valid_from"] = clean_ws(cleaned.split(":", 1)[1])
            elif idx + 1 < len(lines):
                out["office_hours_valid_from"] = clean_ws(lines[idx + 1])

        # Dni
        for day, field in DAY_ALIASES.items():
            day_norm = normalize_key(day)
            if norm == day_norm or norm.startswith(day_norm + ":"):
                value = ""
                if ":" in cleaned:
                    value = clean_ws(cleaned.split(":", 1)[1])
                if not value and idx + 1 < len(lines):
                    nxt = clean_ws(lines[idx + 1])
                    if not is_any_label(nxt):
                        value = nxt
                out[field] = value or ""

    return out


def dedupe_keep_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        key = clean_ws(value).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(clean_ws(value))
    return out


def remove_duplicate_adjacent_text(value: str) -> str:
    value = clean_ws(value)
    if not value:
        return ""

    # Niektoré e-VÚC stránky majú text zdvojený bez medzery:
    # "zariadenie...starostlivostizariadenie...starostlivosti"
    half = len(value) // 2
    if len(value) % 2 == 0 and value[:half] == value[half:]:
        return value[:half].strip()

    # Jemnejší fallback pre opakovanie rovnakého bloku s medzerou.
    parts = value.split()
    if len(parts) >= 4 and len(parts) % 2 == 0:
        mid = len(parts) // 2
        if parts[:mid] == parts[mid:]:
            return " ".join(parts[:mid])

    return value


def get_page_title(soup: BeautifulSoup) -> str:
    for selector in ["h1", "h2"]:
        tag = soup.select_one(selector)
        if tag:
            text = clean_ws(tag.get_text(" ", strip=True))
            if text:
                return text

    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    title = clean_ws(title)
    title = re.sub(r"\s*-\s*e-VÚC.*$", "", title, flags=re.I)
    return title


def source_page_id_from_url(url: str) -> str:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    page_id = qs.get("page_id", [""])[0]
    return clean_ws(page_id)


def parse_region_district(url: str, lines: list[str]) -> tuple[str, str]:
    parsed = urlparse(url)
    parts = [p for p in parsed.path.split("/") if p]

    region = ""
    district = ""

    if parts:
        region = REGION_NAMES.get(parts[0].lower(), "")

    # Typická štruktúra:
    # /bbsk/zdravotnictvo/ambulantne-zdravotnicke-zariadenia/banska-bystrica/detail.html
    if len(parts) >= 4 and parts[1].lower() == "zdravotnictvo":
        district = slug_to_title(parts[3])

    # Fallback z textu, ak sa v breadcrumbs objaví kraj.
    if not region:
        joined = " ".join(lines[:40])
        for name in REGION_NAMES.values():
            if name.lower() in joined.lower():
                region = name
                break

    return region, district


def slug_to_title(slug: str) -> str:
    slug = slug.replace(".html", "")
    parts = [p for p in slug.split("-") if p]
    small_words = {"a", "s", "so", "zo", "nad", "pod", "pri", "v"}
    title_parts: list[str] = []
    for part in parts:
        if part in small_words:
            title_parts.append(part)
        else:
            title_parts.append(part[:1].upper() + part[1:])
    return " ".join(title_parts)


def parse_address(raw_address: str) -> dict[str, str]:
    raw = clean_ws(raw_address)
    raw = raw.replace(" ,", ",")
    raw = re.sub(r"\s*/\s*", "/", raw)
    raw = re.sub(r"\s*,\s*", ", ", raw)

    out = {
        "address_cleaned": raw,
        "street": "",
        "street_number": "",
        "postal_code": "",
        "city": "",
        "city_part": "",
    }
    if not raw:
        return out

    postal_match = re.search(r"\b(\d{3}\s?\d{2})\b", raw)
    if postal_match:
        out["postal_code"] = postal_match.group(1).replace(" ", "")
        after = raw[postal_match.end():].strip(" ,")
        if after:
            city_part_split = re.split(r"\s+-\s+", after, maxsplit=1)
            out["city"] = clean_ws(city_part_split[0].strip(" ,"))
            if len(city_part_split) > 1:
                out["city_part"] = clean_ws(city_part_split[1])

    before_postal = raw[: postal_match.start()].strip(" ,") if postal_match else raw
    chunks = [c.strip() for c in before_postal.split(",") if c.strip()]
    if chunks:
        last = chunks[-1]
        # Ulica, súpisné/orientačné číslo vo formáte "Horná 14021/61A"
        m = re.search(r"(.+?)\s+(\d+[A-Za-zÁ-ž]?(?:/\d+[A-Za-zÁ-ž]?)?)$", last)
        if m:
            out["street"] = clean_ws(m.group(1))
            out["street_number"] = clean_ws(m.group(2))
        else:
            # e-VÚC niekedy dáva ulicu a číslo ako samostatné bloky.
            if len(chunks) >= 2 and re.search(r"\d", chunks[-1]):
                out["street"] = clean_ws(chunks[-2])
                out["street_number"] = clean_ws(chunks[-1])
            else:
                out["street"] = clean_ws(last)

    return out


def extract_pdf_links(soup: BeautifulSoup, base_url: str) -> str:
    links: list[str] = []
    for a in soup.find_all("a"):
        href = get_attr_str(a, "href")
        if not href:
            continue
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if not parsed.path.lower().endswith(".pdf"):
            continue

        text = clean_ws(a.get_text(" ", strip=True))
        # Uprednostníme cenník, ale keď stránka obsahuje iba jeden PDF, je tiež užitočný.
        if "cenn" in normalize_key(text) or "cenn" in normalize_key(absolute) or len(links) == 0:
            links.append(absolute)

    return "; ".join(dedupe_keep_order(links))


def looks_like_company_or_facility(text: str) -> bool:
    low = normalize_key(text)
    if any(word in low for word in COMPANY_WORDS):
        return True
    if any(word in low.split() for word in MEDICAL_OR_FACILITY_WORDS):
        return True
    if text.isupper() and len(text.split()) <= 4:
        return True
    return False


def clean_person_text(text: str) -> str:
    text = clean_ws(text)
    text = text.replace("MUDr.", "MUDr. ")
    text = text.replace("MDDr.", "MDDr. ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.;])", r"\1", text)
    text = re.sub(r"\.\s*(PhD\.|CSc\.|MPH|MBA|MHA|DrSc\.)", r", \1", text)
    text = re.sub(r"\s*,\s*", ", ", text)
    return clean_ws(text)


def parse_person(candidate: str, source: str) -> dict[str, str]:
    candidate = clean_person_text(candidate)
    empty = {
        "doctor_full_name": "",
        "doctor_title": "",
        "doctor_first_name": "",
        "doctor_last_name": "",
        "doctor_suffix": "",
        "doctor_source": source,
        "doctor_parse_status": "facility_only",
    }

    if not candidate:
        return empty

    # Odstráni profesijné dodatky, ktoré nie sú mená.
    if " - " in candidate:
        before_dash, after_dash = candidate.split(" - ", 1)
        if any(w in normalize_key(after_dash) for w in MEDICAL_OR_FACILITY_WORDS):
            candidate = before_dash.strip()

    if looks_like_company_or_facility(candidate) and not re.search(TITLE_RE, candidate):
        return empty

    title = ""
    suffix = ""

    suffix_match = re.search(rf",?\s*({SUFFIX_RE})\s*$", candidate)
    if suffix_match:
        suffix = suffix_match.group(1)
        candidate = candidate[: suffix_match.start()].strip(" ,")

    title_match = re.match(rf"^\s*({TITLE_RE})\s*", candidate)
    if title_match:
        title = title_match.group(1)
        candidate = candidate[title_match.end():].strip()

    candidate = re.sub(r"\([^)]*\)", "", candidate).strip(" ,")
    candidate = re.sub(r"\s+", " ", candidate)

    words = candidate.split()
    if len(words) < 2:
        # "MUDr. Lopatková" bez krstného mena necháme na manuálnu kontrolu.
        if title and len(words) == 1:
            return {
                **empty,
                "doctor_full_name": clean_ws(" ".join([title, candidate, suffix]).strip(" ,")),
                "doctor_title": title,
                "doctor_first_name": "",
                "doctor_last_name": candidate,
                "doctor_suffix": suffix,
                "doctor_parse_status": "needs_manual_check",
            }
        return empty

    if len(words) > 5:
        return empty

    # Každé meno by malo začínať veľkým písmenom alebo byť akceptovateľná iniciála.
    for word in words:
        if not re.match(r"^[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽáäčďéíľĺňóôŕšťúýž.\-]+$", word):
            return empty

    low_words = {normalize_key(w.strip(".,")) for w in words}
    if low_words & MEDICAL_OR_FACILITY_WORDS:
        return empty
    if low_words & COMPANY_WORDS:
        return empty
    if len(low_words & CITY_HINT_WORDS) >= 1 and not title:
        return empty

    first_name = words[0]
    last_name = " ".join(words[1:])
    full = " ".join([x for x in [title, first_name, last_name] if x])
    if suffix:
        full = f"{full}, {suffix}"

    status = "title_from_" + source if title else "name_from_" + source
    return {
        **empty,
        "doctor_full_name": full,
        "doctor_title": title,
        "doctor_first_name": first_name,
        "doctor_last_name": last_name,
        "doctor_suffix": suffix,
        "doctor_parse_status": status,
    }


def extract_title_person(text: str) -> Optional[str]:
    text = clean_person_text(text)
    pattern = rf"({TITLE_RE}\s*[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][\wÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽáäčďéíľĺňóôŕšťúýž.\-]+(?:\s+[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][\wÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽáäčďéíľĺňóôŕšťúýž.\-]+){{1,4}}(?:,\s*{SUFFIX_RE})?)"
    match = re.search(pattern, text)
    if match:
        return clean_ws(match.group(1))
    return None


def extract_person_from_facility_name(facility_name: str, provider_name: str = "") -> dict[str, str]:
    name = clean_ws(facility_name)
    provider_name = clean_ws(provider_name)

    # 1) Najspoľahlivejšie: meno s titulom kdekoľvek v názve.
    titled = extract_title_person(name)
    if titled:
        return parse_person(titled, "facility_name")

    # 2) Odstránime poskytovateľa v zátvorke.
    no_parens = re.sub(r"\([^)]*\)", "", name)
    no_parens = clean_ws(no_parens)

    # 3) Kandidát býva medzi špecializáciou a mestom:
    # "Ambulancia..., Martin Buršík, Bratislava-Staré Mesto, (...)"
    parts = [clean_ws(p) for p in no_parens.split(",") if clean_ws(p)]

    candidates: list[str] = []
    for part in parts[1:]:
        low = normalize_key(part)

        if provider_name and normalize_key(provider_name) in low:
            continue
        if any(city in low for city in CITY_HINT_WORDS):
            continue
        if any(w in low.split() for w in MEDICAL_OR_FACILITY_WORDS):
            continue
        if looks_like_company_or_facility(part):
            continue
        if re.search(r"\d", part):
            continue

        # 2-4 veľké slová, napr. "Martin Buršík", "Adela Penesová".
        words = part.split()
        if 2 <= len(words) <= 4:
            if all(re.match(r"^[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽáäčďéíľĺňóôŕšťúýž.\-]+$", w) for w in words):
                candidates.append(part)

    for candidate in candidates:
        parsed = parse_person(candidate, "facility_name")
        if parsed["doctor_full_name"]:
            return parsed

    return parse_person("", "facility_name")


def extract_person_from_provider(provider_name: str) -> dict[str, str]:
    provider_name = clean_ws(provider_name)
    if not provider_name:
        return parse_person("", "provider_name")

    titled = extract_title_person(provider_name)
    if titled:
        return parse_person(titled, "provider_name")

    if looks_like_company_or_facility(provider_name):
        return parse_person("", "provider_name")

    return parse_person(provider_name, "provider_name")


def extract_staff_names(lines: list[str]) -> str:
    joined = "\n".join(lines)
    matches: list[str] = []

    # Typické časti e-VÚC: "Lekári, sestry:" a potom mená.
    for match in re.finditer(rf"({TITLE_RE}\s*[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][^\n;:,()]+(?:\s+[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][^\n;:,()]+){{1,4}})", joined):
        person = clean_person_text(match.group(1))
        parsed = parse_person(person, "staff")
        if parsed["doctor_full_name"]:
            matches.append(parsed["doctor_full_name"])

    return "; ".join(dedupe_keep_order(matches))


def classify_record(record: dict[str, str]) -> dict[str, str]:
    doctor_status = record.get("doctor_parse_status", "")
    doctor_name = record.get("doctor_full_name", "")

    if doctor_status == "needs_manual_check":
        record["verification_status"] = "needs_manual_check"
    elif doctor_name:
        record["verification_status"] = "needs_review"
    else:
        record["verification_status"] = "facility_only"

    record["import_status"] = "imported_from_evuc"
    return record


def is_probable_facility_detail(lines: list[str], soup: BeautifulSoup, url: str) -> bool:
    joined_norm = normalize_key(" ".join(lines[:300]))
    strong_hits = 0
    for key in [
        "druh zariadenia",
        "identifikator",
        "odborne zameranie",
        "miesto prevadzkovania",
        "poskytovatel",
        "ico",
    ]:
        if normalize_key(key) in joined_norm:
            strong_hits += 1

    if strong_hits >= 3:
        return True

    # Detailové stránky zvyknú mať page_id, ale samotný page_id nestačí.
    if source_page_id_from_url(url) and strong_hits >= 2:
        return True

    return False


def parse_facility_detail(url: str, html: str) -> Optional[dict[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    lines = soup_text_lines(soup)

    if not is_probable_facility_detail(lines, soup, url):
        return None

    fields = parse_label_blocks(lines)
    office = parse_office_hours(lines)

    facility_name = get_page_title(soup)
    if not facility_name and lines:
        facility_name = lines[0]

    region, district = parse_region_district(url, lines)

    record: dict[str, str] = {field: "" for field in OUTPUT_FIELDS}
    record["source_url"] = url
    record["source_page_id"] = source_page_id_from_url(url)
    record["region"] = region
    record["district"] = district
    record["facility_name"] = facility_name

    for key, value in fields.items():
        if key in record:
            record[key] = remove_duplicate_adjacent_text(value)

    for key, value in office.items():
        if key in record:
            record[key] = value

    # Primárna špecializácia = prvý blok z Odborného zamerania.
    specializations = record.get("specializations", "")
    if specializations:
        record["primary_specialization"] = clean_ws(specializations.split(";")[0])

    # Cenník PDF
    record["price_list_pdf_url"] = extract_pdf_links(soup, url)

    # Adresa rozdelená na časti
    address_parts = parse_address(record.get("raw_address", ""))
    record.update(address_parts)

    # Lekár/osoba: najprv facility_name, potom provider_name.
    doctor = extract_person_from_facility_name(record["facility_name"], record.get("provider_name", ""))
    if not doctor.get("doctor_full_name"):
        provider_doctor = extract_person_from_provider(record.get("provider_name", ""))
        # Provider ako osoba je menej istý, ale relevantný.
        if provider_doctor.get("doctor_full_name"):
            doctor = provider_doctor

    for key in [
        "doctor_full_name",
        "doctor_title",
        "doctor_first_name",
        "doctor_last_name",
        "doctor_suffix",
        "doctor_source",
        "doctor_parse_status",
    ]:
        record[key] = doctor.get(key, "")

    record["staff_names"] = extract_staff_names(lines)

    # Ukážka textu na kontrolu bez obrovského CSV.
    record["raw_text_excerpt"] = clean_ws(" | ".join(lines[:80]))[:2500]

    return classify_record(record)


def extract_links_from_page(html: str, current_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []

    for a in soup.find_all("a"):
        href = get_attr_str(a, "href")
        if not href:
            continue
        cleaned = clean_url(href, current_url)
        if cleaned:
            links.append(cleaned)

    # Niektoré odkazy môžu byť v canonical/og:url.
    for tag in soup.find_all(["link", "meta"]):
        href = get_attr_str(tag, "href") or get_attr_str(tag, "content")
        if not href:
            continue
        cleaned = clean_url(href, current_url)
        if cleaned:
            links.append(cleaned)

    return dedupe_keep_order(links)


def write_csv(path: Path, rows: list[dict[str, str]], fields: list[str] = OUTPUT_FIELDS) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def scrape_evuc(
    start_urls: list[str],
    max_pages: int,
    delay: float,
    output_dir: Path,
    save_every: int = 500,
) -> list[dict[str, str]]:
    output_dir.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (compatible; OverenyDoktorDataResearch/1.0; "
            "educational/public-healthcare-directory-data)"
        ),
        "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en;q=0.5",
    })

    queue: deque[str] = deque(start_urls)
    visited: set[str] = set()
    queued: set[str] = set(start_urls)
    rows_by_url: dict[str, dict[str, str]] = {}

    if tqdm:
        progress: Any = tqdm(total=max_pages, desc="Prechádzam e-VÚC stránky")
    else:
        progress = None

    try:
        while queue and len(visited) < max_pages:
            current_url = queue.popleft()
            queued.discard(current_url)

            if current_url in visited:
                continue

            visited.add(current_url)

            html = fetch(session, current_url)
            if html is None:
                if progress:
                    progress.update(1)
                time.sleep(delay)
                continue

            record = parse_facility_detail(current_url, html)
            if record:
                # Dedup podľa page_id, inak podľa URL.
                key = record.get("source_page_id") or current_url
                rows_by_url[key] = record

            for link in extract_links_from_page(html, current_url):
                if link not in visited and link not in queued:
                    queue.append(link)
                    queued.add(link)

            if progress:
                progress.set_postfix({
                    "records": len(rows_by_url),
                    "queue": len(queue),
                })
                progress.update(1)

            if len(visited) % save_every == 0:
                rows = list(rows_by_url.values())
                write_outputs(output_dir, rows)
                write_progress(output_dir, visited_count=len(visited), queued_count=len(queue), records_count=len(rows))

            time.sleep(delay)
    finally:
        if progress:
            progress.close()

    rows = list(rows_by_url.values())
    write_outputs(output_dir, rows)
    write_progress(output_dir, visited_count=len(visited), queued_count=len(queue), records_count=len(rows))
    return rows


def write_outputs(output_dir: Path, rows: list[dict[str, str]]) -> None:
    write_csv(output_dir / "evuc_all_facilities.csv", rows)

    doctor_rows = [
        row for row in rows
        if row.get("verification_status") in {"needs_review", "needs_manual_check"}
        or row.get("doctor_full_name")
        or row.get("staff_names")
    ]
    facility_only_rows = [
        row for row in rows
        if row.get("verification_status") == "facility_only"
        and not row.get("doctor_full_name")
        and not row.get("staff_names")
    ]

    write_csv(output_dir / "evuc_doctor_candidates.csv", doctor_rows)
    write_csv(output_dir / "evuc_facilities_only.csv", facility_only_rows)

    summary_path = output_dir / "evuc_summary.txt"
    by_region: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for row in rows:
        by_region[row.get("region", "") or "(bez kraja)"] = by_region.get(row.get("region", "") or "(bez kraja)", 0) + 1
        by_status[row.get("verification_status", "") or "(bez statusu)"] = by_status.get(row.get("verification_status", "") or "(bez statusu)", 0) + 1

    with summary_path.open("w", encoding="utf-8") as f:
        f.write(f"Spolu zariadení: {len(rows)}\n\n")
        f.write("Podľa kraja:\n")
        for key, value in sorted(by_region.items(), key=lambda x: (-x[1], x[0])):
            f.write(f"- {key}: {value}\n")
        f.write("\nPodľa verification_status:\n")
        for key, value in sorted(by_status.items(), key=lambda x: (-x[1], x[0])):
            f.write(f"- {key}: {value}\n")


def write_progress(output_dir: Path, visited_count: int, queued_count: int, records_count: int) -> None:
    path = output_dir / "evuc_progress.csv"
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["visited_pages", "queued_pages", "records"])
        writer.writeheader()
        writer.writerow({
            "visited_pages": visited_count,
            "queued_pages": queued_count,
            "records": records_count,
        })


def parse_regions_arg(value: str) -> Optional[list[str]]:
    value = clean_ws(value)
    if not value:
        return None
    if value.lower() in {"all", "vsetko", "všetko"}:
        return None
    regions = [x.strip().lower() for x in value.split(",") if x.strip()]
    return regions or None


def main() -> None:
    parser = argparse.ArgumentParser(description="Scraper e-VÚC zdravotníckych zariadení.")
    parser.add_argument("--max-pages", type=int, default=50000, help="Maximálny počet navštívených stránok.")
    parser.add_argument("--delay", type=float, default=0.15, help="Pauza medzi requestami v sekundách.")
    parser.add_argument("--out-dir", type=Path, default=Path("data"), help="Priečinok na výstupné CSV.")
    parser.add_argument(
        "--regions",
        type=str,
        default="all",
        help="Kraje podľa slugov oddelené čiarkou, napr. bsk,bbsk alebo all.",
    )
    parser.add_argument(
        "--start-url",
        action="append",
        default=[],
        help="Voliteľný vlastný štartovací URL. Môžeš zadať viackrát.",
    )

    args = parser.parse_args()

    selected_regions = parse_regions_arg(args.regions)
    start_urls = build_start_urls(selected_regions)

    for url in args.start_url:
        cleaned = clean_url(url, url)
        if cleaned:
            start_urls.append(cleaned)

    start_urls = list(dict.fromkeys(start_urls))

    if not start_urls:
        raise SystemExit("Nemám žiadne štartovacie URL. Skontroluj --regions alebo --start-url.")

    rows = scrape_evuc(
        start_urls=start_urls,
        max_pages=args.max_pages,
        delay=args.delay,
        output_dir=args.out_dir,
    )

    print("\nHotovo.")
    print(f"Záznamy: {len(rows)}")
    print(f"Výstupy sú v priečinku: {args.out_dir.resolve()}")
    print("- evuc_all_facilities.csv")
    print("- evuc_doctor_candidates.csv")
    print("- evuc_facilities_only.csv")
    print("- evuc_summary.txt")
    print("- evuc_progress.csv")


if __name__ == "__main__":
    main()