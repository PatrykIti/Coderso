# RAPORT: Feature Grid Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `feature-grid`
> **Edytor:** `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` (1390 linii)
> **Strona testowa:** `/admin/pages/a06fb6e2-3b58-44c5-87e9-32125f572461` (slug `/ctr-feature-grid-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/feature-grid-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/feature-grid.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and layout structure` | Variant and structure |
| 2 | `Header copy` | Section header |
| 3 | `Feature cards and actions` | Items and order (+ Actions subsection) |
| 4 | `Remove feature card` | (ignore — UI control) |
| 5 | `Card layout and density` | Layout (per-item) |
| 6 | `Colors and borders` | Colors (+ split Surface for borders) |
| 7 | `Section typography and container` | (unmapped — propose canonical) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Layout diagnostics` | Runtime payload |
| 2 | `Normalization and safeguards` | Normalization and safeguards |
| 3 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-layout-structure` | `Variant and layout structure` | 6 |
| `header-copy` | `Header copy` | 0 |
| `feature-cards-and-actions` | `Feature cards and actions` | 0 |
| `card-layout-and-density` | `Card layout and density` | 0 |
| `colors-and-borders` | `Colors and borders` | 0 |
| `section-typography-and-container` | `Section typography and container` | 0 |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Section typography and container`.
3. Przemianować `Variant and layout structure` → `Variant and structure` (CONTRACT-01).
4. Przemianować `Header copy` → `Section header` (CONTRACT-02).
5. Przemianować `Colors and borders` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).