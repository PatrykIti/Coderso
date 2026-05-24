# RAPORT: Stats KPI Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `stats-kpi`
> **Edytor:** `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` (1255 linii)
> **Strona testowa:** `/admin/pages/3d15559a-c923-49e8-8902-93854a55c734` (slug `/ctr-stats-kpi-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/stats-kpi-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/stats-kpi.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Stats layout` | Layout (Wizard step) |
| 2 | `Header copy` | Section header |
| 3 | `Primary metric content` | Items and order (Wizard seed) |
| 4 | `Spacing guidance` | Layout (width, padding, alignment) |
| 5 | `Title` | (ignore — likely subsection of metric) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and metric structure` | Variant and structure |
| 2 | `Header copy` | Section header |
| 3 | `Metrics content and links` | Items and order (+ Actions subsection) |
| 4 | `Text and value styling` | Typography |
| 5 | `Card and icon surfaces` | Surface (per-item subsection) |
| 6 | `Section layout and spacing` | Layout (width, padding, alignment) |
| 7 | `Title` | (ignore — likely subsection of metric) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical spacing and alignment tokens` | Technical tokens |
| 2 | `Normalization and safeguards` | Normalization and safeguards |
| 3 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-metric-structure` | `Variant and metric structure` | 0 |
| `header-copy` | `Header copy` | 0 |
| `metrics-content-and-links` | `Metrics content and links` | 0 |
| `text-and-value-styling` | `Text and value styling` | 0 |
| `card-and-icon-surfaces` | `Card and icon surfaces` | 0 |
| `section-layout-and-spacing` | `Section layout and spacing` | 0 |

## 3. Krytyczne uwagi kontraktu

**Kolizja `Header copy`** w Wizard i Visual — Wizard musi być stepem (`Step 1: Stats layout`, `Step 2: Header copy`, `Step 3: Primary metric`), nie kopią pierwszej sekcji Visual.

## 4. Kolizje (ten sam tytuł w wielu zakładkach)

| Tytuł | Występuje w |
|-------|--------------|
| `Header copy` | wizard, visual |

Naprawa: nadać unikalne tytuły lub scalić sekcje w jedno miejsce.

## 5. Rekomendacje per widget

1. Przemianować `Variant and metric structure` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Header copy` → `Section header` (CONTRACT-02).
3. Przemianować `Technical spacing and alignment tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).