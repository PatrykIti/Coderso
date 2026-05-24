# RAPORT: Form Embed Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `form-embed`
> **Edytor:** `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` (1616 linii po TASK-336-10)
> **Strona testowa:** `/admin/pages/fed7fa7d-b498-439c-858d-72ac0a89926f` (slug `/ctr-form-embed-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/form-embed-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/form-embed.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

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

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `form-selection` | `Form selection` | 0 |
| `layout` | `Layout` | 0 |
| `field-labels` | `Field labels` | 0 |
| `style` | `Style` | 0 |
| `multi-step-navigation` | `Multi-step navigation` | 0 |
| `submit-behavior` | `Submit behavior` | 0 |

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

1. **CONTRACT-13 + SHARED-HELPER:** Sekcje `Form selection`, `Layout`, `Field labels` renderowane w wielu zakładkach. Wymaga rozłącznego podziału.
2. Przemianować `Normalized payload snapshot` → `Normalization and safeguards` (CONTRACT-04).
3. Przemianować `Diagnostics` → `Runtime payload` (CONTRACT-05).

## 6. Status po TASK-336-10 (2026-05-24)

Drift sekcji z pkt 5.1 został zamknięty w kodzie i potwierdzony smoke testem:

- Wizard renderuje `Form selection` i `Setup diagnostics`, a jedyną writable
  ścieżką jest `formId`.
- Visual renderuje `Selected form`, `Content`, `Layout`, `Field labels`,
  `Style`, `Multi-step navigation`, i `Submit behavior`; public copy oraz
  prezentacja są writable tylko tutaj.
- Advanced renderuje `Runtime diagnostics`, `Submission security`,
  `Normalized payload snapshot`, i `Contract summary`; nie ma writable ścieżek,
  a snapshot redaktuje raw nonce i public site-key values.
- Fixture `/ctr-form-embed-2305` został opublikowany, więc public CSS smoke
  sprawdza HTTP 200 i brak overflow zamiast zgłaszać `public_fixture_missing`.

Walidacja:

- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-task-336-10-public --widget form-embed --output-json .tmp/widget-smoke-form-embed.json --output-md .tmp/widget-smoke-form-embed.md`

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).
