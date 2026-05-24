# RAPORT: Entry Teaser Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `entry-teaser`
> **Edytor:** `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` (2041 linii)
> **Strona testowa:** `/admin/pages/8ccacd83-70eb-4e65-aac5-8c0767d4866b` (slug `/ctr-entry-teaser-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/entry-teaser-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/entry-teaser.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Source mode` | Data source |
| 2 | `Variant` | Variant and structure |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and structure` | Variant and structure |
| 2 | `Teaser content fields` | Items and order |
| 3 | `Fallback state` | Behavior |
| 4 | `Source summary` | Data source |
| 5 | `Section context` | Behavior |
| 6 | `CTA behavior` | Actions (+ Behavior) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Style tokens` | Technical tokens |
| 2 | `Runtime payload snapshot` | Runtime payload |
| 3 | `Layout and media` | Layout (+ Media subsection) |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_DOM nie znalazł żadnych sekcji `[data-widget-editor-section]`._

## 5. Rekomendacje per widget

1. Przemianować `Variant` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Runtime payload snapshot` → `Runtime payload` (CONTRACT-05).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).