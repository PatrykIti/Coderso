# RAPORT: Accordion Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `accordion`
> **Edytor:** `core/admin/ui/widgets/editors/AccordionEditors.tsx` (912 linii)
> **Strona testowa:** `/admin/pages/cabe29cc-1ad6-45b7-8773-731cc5b0c503` (slug `/ctr-accordion-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/accordion-visual.png`, `accordion-advanced.png`, `accordion-wizard.png`
> **DOM raw:** `_raw/accordion.txt`

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

**Kolizja `Variant`** w 3 zakładkach jednocześnie — identyczna sytuacja jak Tabs.

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