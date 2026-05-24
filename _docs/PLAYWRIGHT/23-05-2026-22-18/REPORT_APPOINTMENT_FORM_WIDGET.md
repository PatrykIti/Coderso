# RAPORT: Appointment Form Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `appointment-form`
> **Edytor:** `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx` (829 linii)
> **Strona testowa:** `/admin/pages/f22436b5-24db-4536-9dda-07c0ae9cfcdb` (slug `/ctr-appointment-form-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/appointment-form-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/appointment-form.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Flow` | (unmapped — propose canonical) |
| 2 | `Copy` | Section header |
| 3 | `Surface` | Surface (border, radius, shadow) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Slot summary` | (unmapped — propose canonical) |
| 2 | `Fields` | Items and order (form fields) |
| 3 | `Custom fields` | Items and order (form fields subsection) |
| 4 | `Consent and protection` | Behavior |
| 5 | `Surface` | Surface (border, radius, shadow) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Runtime endpoint` | Runtime payload |
| 2 | `Resolved runtime payload` | Runtime payload |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_DOM nie znalazł żadnych sekcji `[data-widget-editor-section]`._

## 5. Rekomendacje per widget

1. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Flow`, `Slot summary`.
2. Przemianować `Copy` → `Section header` (CONTRACT-02).
3. Przemianować `Runtime endpoint` → `Runtime payload` (CONTRACT-05).
4. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).