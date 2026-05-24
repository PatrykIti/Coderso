# RAPORT: Stack Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `stack`
> **Edytor:** `core/admin/ui/widgets/editors/StackEditors.tsx` (812 linii)
> **Strona testowa:** `/admin/pages/7b23083d-f7cd-481e-8417-fc2278e54466` (slug `/ctr-stack-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/stack-visual.png`, `stack-advanced.png`, `stack-wizard.png`
> **DOM raw:** `_raw/stack.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

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

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Przemianować `Variant and flow` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Technical flow tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).