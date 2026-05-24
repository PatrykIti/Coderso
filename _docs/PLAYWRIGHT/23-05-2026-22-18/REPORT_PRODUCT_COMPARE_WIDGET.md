# RAPORT: Product Compare Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `product-compare`
> **Edytor:** `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` (844 linii)
> **Strona testowa:** `/admin/pages/3beb58fc-0d9a-4bd9-ae92-c1d2f83de65e` (slug `/ctr-product-compare-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/product-compare-visual.png`, `product-compare-advanced.png`, `product-compare-wizard.png`
> **DOM raw:** `_raw/product-compare.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Comparison source` | Data source |
| 2 | `Limit guidance` | Behavior |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Section copy` | Section header |
| 2 | `Attribute rows` | Items and order |
| 3 | `Labels` | (unmapped — propose canonical) |
| 4 | `Product columns` | Items and order |
| 5 | `Formatting` | (unmapped — propose canonical) |
| 6 | `Layout` | Layout (width, padding, alignment) |
| 7 | `Empty state` | Empty state |
| 8 | `Surfaces` | Surface (border, radius, shadow) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Runtime payload` | Runtime payload |
| 2 | `Query preview` | Runtime payload |

## 5. Rekomendacje per widget

1. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Formatting`, `Labels`.
2. Przemianować `Section copy` → `Section header` (CONTRACT-02).
3. Przemianować `Query preview` → `Runtime payload` (CONTRACT-05).
4. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).