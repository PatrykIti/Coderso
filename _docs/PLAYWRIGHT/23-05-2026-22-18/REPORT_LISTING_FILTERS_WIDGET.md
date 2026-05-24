# RAPORT: Listing Filters Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `listing-filters`
> **Edytor:** `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` (2011 linii)
> **Strona testowa:** `/admin/pages/f9435704-9702-45f5-92b1-22711c7fb0ad` (slug `/ctr-listing-filters-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/listing-filters-visual.png`, `listing-filters-advanced.png`, `listing-filters-wizard.png`
> **DOM raw:** `_raw/listing-filters.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
_(brak sekcji top-level (sekcje istnieją w helperach — patrz §3) — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
_(brak sekcji top-level (sekcje istnieją w helperach — patrz §3))_

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Contract` | Runtime payload |

## 2. Sekcje siedzące w helperach (poza top-level funkcjami)

Sekcje (`<EditorSection title=…>`) zdefiniowane wewnątrz pomocniczych komponentów, nie w głównej funkcji editora — przez to parser top-level nie znalazł ich w §1, ale renderują się w UI:

- `Listing query` → **Data source**
- `Facet controls` → **Items and order (facet subsection)**
- `Runtime behavior` → **Runtime payload**
- `Variant and layout` → **Variant and structure**
- `Surface` → **(unmapped — propose canonical)**
- `Diagnostics` → **Runtime payload**
- `Runtime payload` → **Runtime payload**

## 3. Krytyczne uwagi kontraktu

Visual top-level pusty; jedyna `Contract` w Advanced. Wymaga pełnego odświeżenia top-level sekcji (CONTRACT-12).

## 5. Rekomendacje per widget

1. Przemianować `Contract` → `Runtime payload` (CONTRACT-05).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).