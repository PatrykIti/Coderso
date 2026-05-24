# RAPORT: Product Gallery Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `product-gallery`
> **Edytor:** `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` (822 linii)
> **Strona testowa:** `/admin/pages/1edd10a5-7626-4630-aa47-87c6604fcc62` (slug `/ctr-product-gallery-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/product-gallery-visual.png`, `product-gallery-advanced.png`, `product-gallery-wizard.png`
> **DOM raw:** `_raw/product-gallery.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Product source` | Data source |
| 2 | `Price filters` | Data source (filter subsection) |
| 3 | `Layout` | Layout (width, padding, alignment) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Section header` | Section header |
| 2 | `Card content` | Items and order (Card content subsection) |
| 3 | `Product links` | Actions |
| 4 | `Empty state` | Empty state |
| 5 | `Surfaces` | Surface (border, radius, shadow) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Product behavior` | Behavior |
| 2 | `Diagnostics` | Runtime payload |
| 3 | `Preview status` | Runtime payload |
| 4 | `Query preview` | Runtime payload |

## 5. Rekomendacje per widget

1. Przemianować `Diagnostics` → `Runtime payload` (CONTRACT-05).
2. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).