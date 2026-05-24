# RAPORT: CTA Banner Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `cta-banner`
> **Edytor:** `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` (1296 linii)
> **Strona testowa:** `/admin/pages/94e844e2-9287-4aa4-949e-c2ea9d28ca4f` (slug `/ctr-cta-banner-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/cta-banner-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/cta-banner.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and layout structure` | Variant and structure |
| 2 | `Content copy` | (unmapped — propose canonical) |
| 3 | `Actions` | Actions |
| 4 | `Primary CTA` | Actions (subsection of Actions) |
| 5 | `Secondary CTA` | Actions (subsection of Actions) |
| 6 | `Tertiary CTA` | Actions (subsection of Actions) |
| 7 | `Colors and button styles` | Colors (+ split Actions) |
| 8 | `Border and spacing` | Surface (+ split Layout for spacing) |
| 9 | `Background and motion` | Background (+ split Motion or Behavior) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical style tokens` | Technical tokens |
| 2 | `Normalization and safeguards` | Normalization and safeguards |
| 3 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-layout-structure` | `Variant and layout structure` | 0 |
| `content-copy` | `Content copy` | 0 |
| `actions` | `Actions` | 0 |
| `colors-and-button-styles` | `Colors and button styles` | 0 |
| `border-and-spacing` | `Border and spacing` | 0 |
| `background-and-motion` | `Background and motion` | 0 |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Content copy`.
3. Przemianować `Variant and layout structure` → `Variant and structure` (CONTRACT-01).
4. Przemianować `Colors and button styles` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
5. Przemianować `Technical style tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).