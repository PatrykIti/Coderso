# RAPORT: Search Box Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `search-box`
> **Edytor:** `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` (465 linii)
> **Strona testowa:** `/admin/pages/b4734a85-b68d-470f-b65d-54ea42f92eaa` (slug `/ctr-search-box-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/search-box-visual.png`, `search-box-advanced.png`, `search-box-wizard.png`
> **DOM raw:** `_raw/search-box.txt`

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

- `Mode` → **(unmapped — propose canonical)**
- `Copy and behavior` → **(unmapped — propose canonical)**
- `Runtime payload` → **Runtime payload**
- `Surface` → **(unmapped — propose canonical)**
- `Contract` → **Runtime payload**

## 3. Krytyczne uwagi kontraktu

Identycznie jak listing-filters — Visual pusty, jedyna `Contract` w Advanced.

## 5. Rekomendacje per widget

1. Przemianować `Contract` → `Runtime payload` (CONTRACT-05).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).