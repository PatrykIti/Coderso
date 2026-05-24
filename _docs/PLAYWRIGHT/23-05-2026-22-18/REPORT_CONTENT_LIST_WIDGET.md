# RAPORT: Content List Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `content-list`
> **Edytor:** `core/admin/ui/widgets/editors/ContentListEditors.tsx` (1434 linii)
> **Strona testowa:** `/admin/pages/e07ab9e8-57f8-477b-86c3-86b2ccec4b61` (slug `/ctr-content-list-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/content-list-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/content-list.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Source setup` | Data source |
| 2 | `Variant` | Variant and structure |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and layout` | Variant and structure |
| 2 | `Source and filters` | Data source |
| 3 | `Section context` | Behavior |
| 4 | `Pagination and actions` | Behavior (+ Actions subsection) |
| 5 | `Presentation fields` | Items and order (Card content subsection) |
| 6 | `Empty state` | Empty state |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Query controls` | (unmapped — propose canonical) |
| 2 | `Styling tokens` | Technical tokens |
| 3 | `Runtime payload snapshot` | Runtime payload |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-layout` | `Variant and layout` | 0 |
| `source-and-filters` | `Source and filters` | 0 |
| `section-context` | `Section context` | 0 |
| `pagination-and-actions` | `Pagination and actions` | 0 |
| `presentation-fields` | `Presentation fields` | 0 |
| `empty-state` | `Empty state` | 0 |

## 5. Rekomendacje per widget

1. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Query controls`.
2. Przemianować `Variant and layout` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Runtime payload snapshot` → `Runtime payload` (CONTRACT-05).
4. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).