# RAPORT: Gallery Mosaic Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `gallery-mosaic`
> **Edytor:** `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` (1516 linii)
> **Strona testowa:** `/admin/pages/5b42d115-258d-4967-9936-e3ca11972a14` (slug `/ctr-gallery-mosaic-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/gallery-mosaic-visual.png`, `gallery-mosaic-advanced.png`, `gallery-mosaic-wizard.png`
> **DOM raw:** `_raw/gallery-mosaic.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and media structure` | Variant and structure |
| 2 | `Header copy` | Section header |
| 3 | `Media items and links` | Items and order (Media subsection) |
| 4 | `Drag to reorder. Keyboard: Alt + Arrow keys.` | (ignore — drag handle hint) |
| 5 | `Interaction` | Behavior |
| 6 | `Overlay and caption controls` | Behavior |
| 7 | `Layout style` | Layout |
| 8 | `Density and motion` | Layout (+ split Motion or Behavior) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical ratio and layout tokens` | Technical tokens |
| 2 | `Configuration import and export` | Items and order (import/export action) |
| 3 | `Normalization and safeguards` | Normalization and safeguards |
| 4 | `Raw payload snapshot` | Raw payload snapshot |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Przemianować `Variant and media structure` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Header copy` → `Section header` (CONTRACT-02).
4. Przemianować `Technical ratio and layout tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).