# RAPORT: Timeline Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `timeline`
> **Edytor:** `core/admin/ui/widgets/editors/TimelineEditors.tsx` (1846 linii)
> **Strona testowa:** `/admin/pages/261d5209-9323-4237-ad8e-20eb3f0e9d60` (slug `/ctr-timeline-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/timeline-visual.png`, `timeline-advanced.png`, `timeline-wizard.png`
> **DOM raw:** `_raw/timeline.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and timeline structure` | Variant and structure |
| 2 | `Steps content and order` | Items and order |
| 3 | `Guides and axis line` | Surface (+ split Colors) |
| 4 | `Markers and accents` | Items and order (Markers subsection) |
| 5 | `Colors and background` | Colors (+ split Background) |
| 6 | `Typography and spacing` | Typography (+ split Layout) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Layout tokens` | Technical tokens |
| 2 | `Data normalization` | Normalization and safeguards |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Przemianować `Variant and timeline structure` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Colors and background` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
4. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).