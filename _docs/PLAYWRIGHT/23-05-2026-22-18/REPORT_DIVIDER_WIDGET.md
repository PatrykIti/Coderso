# RAPORT: Divider Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `divider`
> **Edytor:** `core/admin/ui/widgets/editors/DividerEditors.tsx` (1056 linii)
> **Strona testowa:** `/admin/pages/074a7240-a254-4ebc-8a09-1d060e057981` (slug `/ctr-divider-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/divider-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/divider.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Preview` | (should not be a separate section — preview is global, not per-tab) |
| 2 | `Variant and label` | Variant and structure |
| 3 | `Line style and width` | (unmapped — propose canonical) |
| 4 | `Spacing around divider` | Layout (width, padding, alignment) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Preview` | (should not be a separate section — preview is global, not per-tab) |
| 2 | `Technical divider tokens` | Technical tokens |
| 3 | `Normalization and safeguards` | Normalization and safeguards |
| 4 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_4 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `preview` | `Preview` | 0 |
| `variant-and-label` | `Variant and label` | 0 |
| `line-style-and-width` | `Line style and width` | 0 |
| `spacing-around-divider` | `Spacing around divider` | 0 |

## 3. Krytyczne uwagi kontraktu

**Kolizja `Preview`** w Visual i Advanced — sekcja preview powinna być globalna (jak `Live preview` na dole panelu), nie sekcja per zakładka.

## 4. Kolizje (ten sam tytuł w wielu zakładkach)

| Tytuł | Występuje w |
|-------|--------------|
| `Preview` | visual, advanced |

Naprawa: nadać unikalne tytuły lub scalić sekcje w jedno miejsce.

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Line style and width`.
3. Przemianować `Variant and label` → `Variant and structure` (CONTRACT-01).
4. Przemianować `Technical divider tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).