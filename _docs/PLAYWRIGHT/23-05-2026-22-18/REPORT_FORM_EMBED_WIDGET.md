# RAPORT: Form Embed Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `form-embed`
> **Edytor:** `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` (1243 linii)
> **Strona testowa:** `/admin/pages/fed7fa7d-b498-439c-858d-72ac0a89926f` (slug `/ctr-form-embed-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/form-embed-visual.png`, `form-embed-advanced.png`, `form-embed-wizard.png`
> **DOM raw:** `_raw/form-embed.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Content` | (ignore — screen widget label) |
| 2 | `Form selection` | Data source |
| 3 | `Layout` | Layout (width, padding, alignment) |
| 4 | `Field labels` | Items and order (form fields subsection) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Form selection` | Data source |
| 2 | `Submit behavior` | Behavior |
| 3 | `Multi-step navigation` | Behavior |
| 4 | `Layout` | Layout (width, padding, alignment) |
| 5 | `Style` | Surface (border, radius, shadow) |
| 6 | `Field labels` | Items and order (form fields subsection) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Diagnostics` | Runtime payload |
| 2 | `Normalized payload snapshot` | Raw payload snapshot |
| 3 | `Form selection` | Data source |

## 2. Sekcje siedzące w helperach (poza top-level funkcjami)

Sekcje (`<EditorSection title=…>`) zdefiniowane wewnątrz pomocniczych komponentów, nie w głównej funkcji editora — przez to parser top-level nie znalazł ich w §1, ale renderują się w UI:

- `Form selection` → **Data source**
- `Content` → **(ignore — screen widget label)**
- `Layout` → **Layout (width, padding, alignment)**
- `Field labels` → **Items and order (form fields subsection)**
- `Style` → **Surface (border, radius, shadow)**
- `Multi-step navigation` → **Behavior**
- `Submit behavior` → **Behavior**
- `Diagnostics` → **Runtime payload**
- `Normalized payload snapshot` → **Raw payload snapshot**

## 3. Krytyczne uwagi kontraktu

Jw. — wszystkie 3 zakładki puste na poziomie main funkcji.

## 5. Rekomendacje per widget

1. Przemianować `Normalized payload snapshot` → `Normalization and safeguards` (CONTRACT-04).
2. Przemianować `Diagnostics` → `Runtime payload` (CONTRACT-05).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).