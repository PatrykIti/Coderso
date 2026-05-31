# RAPORT: Testimonials Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `testimonials`
> **Edytor:** `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` (2039 linii)
> **Strona testowa:** `/admin/pages/4c0e301f-1c64-48e2-b6b5-791201a8d66c` (slug `/ctr-testimonials-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/testimonials-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/testimonials.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Section copy` | Section header |
| 2 | `Initial testimonials` | Items and order (Wizard seed) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and layout structure` | Variant and structure |
| 2 | `Header copy` | Section header |
| 3 | `Testimonials content and ratings` | Items and order |
| 4 | `Section surface and typography` | Surface (+ split Typography) |
| 5 | `Colors and emphasis` | Colors |
| 6 | `CTA and conversion follow-up` | Actions |
| 7 | `Remove testimonial` | (ignore — UI control) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Display diagnostics` | Runtime payload |
| 2 | `Normalization and fallback` | Normalization and safeguards |
| 3 | `Import and export` | Items and order (import/export action) |
| 4 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-layout-structure` | `Variant and layout structure` | 0 |
| `header-copy` | `Header copy` | 0 |
| `testimonials-content-and-ratings` | `Testimonials content and ratings` | 0 |
| `section-surface-and-typography` | `Section surface and typography` | 0 |
| `colors-and-emphasis` | `Colors and emphasis` | 0 |
| `cta-and-conversion-follow-up` | `CTA and conversion follow-up` | 0 |

## 5. Rekomendacje per widget

1. Przemianować `Variant and layout structure` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Header copy` → `Section header` (CONTRACT-02).
3. Przemianować `Colors and emphasis` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
4. Przemianować `Normalization and fallback` → `Normalization and safeguards` (CONTRACT-04).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).