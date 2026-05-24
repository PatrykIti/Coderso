# RAPORT: Grid Columns Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `grid-columns`
> **Edytor:** `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` (2486 linii)
> **Strona testowa:** `/admin/pages/ee3f7352-52f1-4b4a-a910-619d94dc4410` (slug `/ctr-grid-columns-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/grid-columns-visual.png`, `grid-columns-advanced.png`, `grid-columns-wizard.png`
> **DOM raw:** `_raw/grid-columns.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and layout structure` | Variant and structure |
| 2 | `Column sizing and labels` | Items and order (column subsection) |
| 3 | `Gap and column surface` | (unmapped — propose canonical) |
| 4 | `Per-column surfaces and behavior` | Items and order (column subsection) |
| 5 | `Slots and runtime behavior` | Runtime payload |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical layout tokens` | Technical tokens |
| 2 | `Per-column override tokens` | Technical tokens (per-item subsection) |
| 3 | `Raw payload snapshot` | Raw payload snapshot |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Gap and column surface`.
3. Przemianować `Variant and layout structure` → `Variant and structure` (CONTRACT-01).
4. Przemianować `Technical layout tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).