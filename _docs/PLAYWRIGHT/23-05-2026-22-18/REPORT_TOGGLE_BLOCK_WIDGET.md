# RAPORT: Toggle Block Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `toggle-block`
> **Edytor:** `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` (870 linii)
> **Strona testowa:** `/admin/pages/12d1d6fb-2aeb-46db-8775-088e87d8b70b` (slug `/ctr-toggle-block-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/toggle-block-visual.png`, `toggle-block-advanced.png`, `toggle-block-wizard.png`
> **DOM raw:** `_raw/toggle-block.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Step 1: Variant` | Variant and structure (Wizard step) |
| 2 | `Step 2: Labels` | Section header (Wizard step) |
| 3 | `Step 3: Starting pane` | Behavior (Wizard step) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Diagnostics` | Runtime payload |

## 3. Krytyczne uwagi kontraktu

Jedyny widget z numeracją `Step 1:` / `Step 2:` / `Step 3:` w Wizard — wzorzec do propagacji na inne widgety, które mają nietrywialny Wizard (booking-calendar, compare-timeline, contact, etc.). Visual ma tylko jedną sekcję `Variant` — za mało; brakuje `Items and order` (panes) i `Behavior` na poziomie kontraktu.

## 5. Rekomendacje per widget

1. Przemianować `Variant` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Diagnostics` → `Runtime payload` (CONTRACT-05).
3. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).