# RAPORT: Stack Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `stack`
> **Edytor:** `core/admin/ui/widgets/editors/StackEditors.tsx` (812 linii)
> **Strona testowa:** `/admin/pages/7b23083d-f7cd-481e-8417-fc2278e54466` (slug `/ctr-stack-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/stack-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/stack.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and flow` | Variant and structure |
| 2 | `Responsive direction` | Responsive overrides |
| 3 | `Responsive alignment and wrap` | Responsive overrides |
| 4 | `Slot guidance` | Behavior (Slot subsection) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical flow tokens` | Technical tokens |
| 2 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_5 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-flow` | `Variant and flow` | 0 |
| `responsive-direction` | `Responsive direction` | 0 |
| `responsive-alignment-and-wrap` | `Responsive alignment and wrap` | 0 |
| `slot-guidance` | `Slot guidance` | 0 |
| `stack.structure` | `Structure` | 1 |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Przemianować `Variant and flow` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Technical flow tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).