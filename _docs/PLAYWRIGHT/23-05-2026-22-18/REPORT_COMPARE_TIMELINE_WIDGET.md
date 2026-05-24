# RAPORT: Compare Timeline Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `compare-timeline`
> **Edytor:** `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` (1681 linii)
> **Strona testowa:** `/admin/pages/9ad7e86e-e732-4d17-9ea9-07c5bfb32cca` (slug `/ctr-compare-timeline-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/compare-timeline-visual.png`, `compare-timeline-advanced.png`, `compare-timeline-wizard.png`
> **DOM raw:** `_raw/compare-timeline.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Quick setup` | Variant and structure (Wizard combined) |
| 2 | `Axis copy` | Section header (Axis subsection) |
| 3 | `Track labels` | Items and order (subsection) |
| 4 | `Marker baseline` | Items and order (Markers subsection) |
| 5 | `Highlight segments` | Items and order (subsection) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and compare structure` | Variant and structure |
| 2 | `Axis steps and track labels` | Items and order (Axis subsection) |
| 3 | `Markers and segment mapping` | Items and order (Markers subsection) |
| 4 | `Highlight and guide styles` | Surface (+ split Colors) |
| 5 | `Colors and typography` | Colors (+ split Typography) |
| 6 | `Spacing and layout preview hints` | Layout (+ Behavior preview) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Layout tokens` | Technical tokens |
| 2 | `Raw metadata fields` | (unmapped — propose canonical) |
| 3 | `Data normalization` | Normalization and safeguards |

## 5. Rekomendacje per widget

1. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Raw metadata fields`.
2. Przemianować `Variant and compare structure` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Colors and typography` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
4. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).