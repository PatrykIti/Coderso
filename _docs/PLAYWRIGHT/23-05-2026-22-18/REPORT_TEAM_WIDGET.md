# RAPORT: Team Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `team`
> **Edytor:** `core/admin/ui/widgets/editors/TeamEditors.tsx` (1575 linii)
> **Strona testowa:** `/admin/pages/fb31e030-07df-4dce-9243-a3c8904d3269` (slug `/ctr-team-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/team-visual.png`, `team-advanced.png`, `team-wizard.png`
> **DOM raw:** `_raw/team.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and member structure` | Variant and structure |
| 2 | `Header copy and CTA` | Section header (+ Actions split required) |
| 3 | `Members content and order` | Items and order |
| 4 | `Section and card style` | Surface (+ split per-item Surface subsection) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical layout tokens` | Technical tokens |
| 2 | `Normalization and safeguards` | Normalization and safeguards |
| 3 | `Raw payload snapshot` | Raw payload snapshot |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Przemianować `Variant and member structure` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Technical layout tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).