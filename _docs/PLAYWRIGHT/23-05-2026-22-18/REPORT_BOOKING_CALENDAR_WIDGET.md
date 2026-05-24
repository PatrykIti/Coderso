# RAPORT: Booking Calendar Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `booking-calendar`
> **Edytor:** `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` (624 linii)
> **Strona testowa:** `/admin/pages/2fc615b9-5d62-4135-839f-3f10b119f0da` (slug `/ctr-booking-calendar-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/booking-calendar-visual.png`, `booking-calendar-advanced.png`, `booking-calendar-wizard.png`
> **DOM raw:** `_raw/booking-calendar.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Flow` | (unmapped — propose canonical) |
| 2 | `Availability behavior` | Behavior |
| 3 | `Date policy` | Behavior |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |
| 2 | `Status messages` | Behavior (+ split Section body) |
| 3 | `Service context` | Behavior |
| 4 | `Date picker` | Behavior |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Runtime endpoints` | Runtime payload |
| 2 | `Defaults` | Behavior (+ Section header for defaults) |
| 3 | `Resolved runtime payload` | Runtime payload |

## 5. Rekomendacje per widget

1. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Flow`.
2. Przemianować `Variant` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Runtime endpoints` → `Runtime payload` (CONTRACT-05).
4. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).