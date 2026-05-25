# RAPORT: Split Layout Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `split-layout`
> **Edytor:** `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` (697 linii)
> **Strona testowa:** `/admin/pages/c3fa7a67-99fc-42ec-a4e4-131c1dc75a58` (slug `/ctr-split-layout-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/split-layout-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/split-layout.txt`

---

## 1. Sekcje per zakładka

### Wizard

Status po TASK-336-19: Wizard ma jedna sekcje `Choose a starter split` i
zapisuje tylko one-time starter `variant`.

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Pane layout` | Accepted current |
| 2 | `Phone behavior` | Accepted current |
| 3 | `Spacing and alignment` | Accepted current |
| 4 | `Pane content` | Accepted current |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `How this layout renders` | Accepted current |
| 2 | `Saved layout summary` | Accepted current |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

Status po TASK-336-19: strict smoke ma 5 widocznych sekcji Visual i 2
widoczne sekcje Advanced, bez metadata gaps.

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `split-layout.visual.variant-ratio` | `Pane layout` | metadata-backed |
| `split-layout.visual.mobile-behavior` | `Phone behavior` | metadata-backed |
| `split-layout.visual.spacing-alignment` | `Spacing and alignment` | metadata-backed |
| `split-layout.visual.pane-guidance` | `Pane content` | guidance summary |
| `split-layout.structure` | `Structure` | 2 |

## 5. Rekomendacje per widget

Status 2026-05-25: zalecenia z tego snapshotu sa superseded przez
`TASK-336-19` Split Layout cleanup. Wizard ma teraz widoczna sekcje
`Choose a starter split`, Visual uzywa sekcji `Pane layout`, `Phone behavior`,
`Spacing and alignment`, `Pane content`, a Advanced pokazuje tylko read-only
human summaries bez developer-facing implementation details.

Evidence:

- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-split-layout-advanced-readonly-2026-05-25.*`
  reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).
