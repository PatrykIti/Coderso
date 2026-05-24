# RAPORT: Tabs Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `tabs`
> **Edytor:** `core/admin/ui/widgets/editors/TabsEditors.tsx` (918 linii)
> **Strona testowa:** `/admin/pages/0be2cb49-8113-4a88-8d17-0ed70d5c5fdd` (slug `/ctr-tabs-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/tabs-visual.png`, `tabs-advanced.png`, `tabs-wizard.png`
> **DOM raw:** `_raw/tabs.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |
| 2 | `Diagnostics` | Runtime payload |

## 3. Krytyczne uwagi kontraktu

**Kolizja `Variant`** w 3 zakładkach jednocześnie — ten sam tytuł sekcji w Wizard, Visual, Advanced. Trzeba przemianować: Visual `Variant and structure`, Advanced `Behavior` lub `Runtime payload`, Wizard `Step 1: Variant`.

## 4. Kolizje (ten sam tytuł w wielu zakładkach)

| Tytuł | Występuje w |
|-------|--------------|
| `Variant` | wizard, visual, advanced |

Naprawa: nadać unikalne tytuły lub scalić sekcje w jedno miejsce.

## 5. Rekomendacje per widget

1. Przemianować `Variant` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Diagnostics` → `Runtime payload` (CONTRACT-05).
3. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).