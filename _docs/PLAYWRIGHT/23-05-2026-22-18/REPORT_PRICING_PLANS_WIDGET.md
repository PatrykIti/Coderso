# RAPORT: Pricing Plans Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `pricing-plans`
> **Edytor:** `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` (1859 linii)
> **Strona testowa:** `/admin/pages/21b6bd3d-6208-46a6-b9f0-e1fdbad76c7e` (slug `/ctr-pricing-plans-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/pricing-plans-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/pricing-plans.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and plan structure` | Variant and structure |
| 2 | `Header copy` | Section header |
| 3 | `Billing toggle` | (unmapped — propose canonical) |
| 4 | `Plans, features, and actions` | Items and order (+ Actions subsection) |
| 5 | `Comparison rows behavior` | Items and order (+ Behavior) |
| 6 | `Layout and notes` | Layout (width, padding, alignment) (+ split Behavior for notes) |
| 7 | `Colors and emphasis` | Colors |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Visual-owned tokens` | Technical tokens |
| 2 | `Fix and reset` | Normalization and safeguards (reset action) |
| 3 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-plan-structure` | `Variant and plan structure` | 0 |
| `header-copy` | `Header copy` | 0 |
| `pricing.billing` | `Billing toggle` | 0 |
| `plans-features-and-actions` | `Plans, features, and actions` | 0 |
| `layout-and-notes` | `Layout and notes` | 0 |
| `colors-and-emphasis` | `Colors and emphasis` | 0 |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Billing toggle`.
3. Przemianować `Variant and plan structure` → `Variant and structure` (CONTRACT-01).
4. Przemianować `Header copy` → `Section header` (CONTRACT-02).
5. Przemianować `Colors and emphasis` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).