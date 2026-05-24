# RAPORT: Product Table Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `product-table`
> **Edytor:** `core/admin/ui/widgets/editors/ProductTableEditors.tsx` (1013 linii)
> **Strona testowa:** `/admin/pages/f317c971-cc3f-4003-9a38-66ff40c8d036` (slug `/ctr-product-table-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/product-table-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/product-table.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Table source` | Data source |
| 2 | `Surfaces` | Surface (border, radius, shadow) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Section header` | Section header |
| 2 | `Columns` | Items and order |
| 3 | `Column labels` | Items and order (subsection) |
| 4 | `Stock presentation` | Behavior |
| 5 | `Links and actions` | Actions (+ split Behavior) |
| 6 | `Empty state` | Empty state |
| 7 | `Layout and style` | Layout (+ split Surface) |
| 8 | `Surfaces` | Surface (border, radius, shadow) |
| 9 | `Export and currency` | (unmapped — propose canonical) |
| 10 | `Public controls` | Behavior |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Runtime payload` | Runtime payload |
| 2 | `Query preview` | Runtime payload |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_10 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `layout-and-style` | `Layout and style` | 0 |
| `section-header` | `Section header` | 0 |
| `columns` | `Columns` | 0 |
| `column-labels` | `Column labels` | 0 |
| `public-controls` | `Public controls` | 0 |
| `export-and-currency` | `Export and currency` | 0 |
| `stock-presentation` | `Stock presentation` | 0 |
| `links-and-actions` | `Links and actions` | 0 |
| `empty-state` | `Empty state` | 0 |
| `surfaces` | `Surfaces` | 0 |

## 5. Rekomendacje per widget

1. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Export and currency`.
2. Przemianować `Query preview` → `Runtime payload` (CONTRACT-05).
3. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).