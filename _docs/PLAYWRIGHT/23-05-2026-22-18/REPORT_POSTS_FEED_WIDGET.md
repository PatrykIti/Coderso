# RAPORT: Posts Feed Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `posts-feed`
> **Edytor:** `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` (1607 linii)
> **Strona testowa:** `/admin/pages/160c954b-1b3e-4798-bf37-74f697a18e24` (slug `/ctr-posts-feed-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/posts-feed-visual.png`, `posts-feed-advanced.png`, `posts-feed-wizard.png`
> **DOM raw:** `_raw/posts-feed.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Runtime status` | Runtime payload |
| 2 | `Section header` | Section header |
| 3 | `Layout and style` | Layout (+ split Surface) |
| 4 | `Display` | Behavior |
| 5 | `Source setup` | Data source |
| 6 | `Empty state` | Empty state |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Runtime status` | Runtime payload |
| 2 | `Section header` | Section header |
| 3 | `Layout and style` | Layout (+ split Surface) |
| 4 | `Display` | Behavior |
| 5 | `Source setup` | Data source |
| 6 | `Empty state` | Empty state |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Runtime status` | Runtime payload |
| 2 | `Section header` | Section header |
| 3 | `Layout and style` | Layout (+ split Surface) |
| 4 | `Display` | Behavior |
| 5 | `Runtime payload` | Runtime payload |
| 6 | `Source setup` | Data source |
| 7 | `Empty state` | Empty state |

## 2. Sekcje siedzące w helperach (poza top-level funkcjami)

Sekcje (`<EditorSection title=…>`) zdefiniowane wewnątrz pomocniczych komponentów, nie w głównej funkcji editora — przez to parser top-level nie znalazł ich w §1, ale renderują się w UI:

- `Runtime status` → **Runtime payload**
- `Source setup` → **Data source**
- `Display` → **Behavior**
- `Section header` → **Section header**
- `Layout and style` → **Layout (+ split Surface)**
- `Empty state` → **Empty state**
- `Runtime payload` → **Runtime payload**

## 3. Krytyczne uwagi kontraktu

Wszystkie 3 zakładki mają pustą main funkcję — sekcje w helperach. Należy podnieść do top-level lub udokumentować helpery jako część kontraktu (CONTRACT-13).

## 5. Rekomendacje per widget

1. Przemianować `Runtime status` → `Runtime payload` (CONTRACT-05).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).

## 2026-05-24 TASK-336-09 status

Ten raport jest zastąpiony przez implementację TASK-336-09:

- `Wizard` renderuje tylko `Source setup` i posiada `source.*` ownership.
- `Visual` renderuje `Display`, `Section header`, `Layout and style`,
  `Pagination presentation` oraz `Empty state`.
- `Advanced` renderuje wyłącznie read-only diagnostics: `Resolved query`,
  `Runtime status`, `Runtime payload`, `Contract summary`.
- `posts-feed` ma teraz v2 `editorContract`, a targetowane testy Vitest/Bun
  sprawdzają brak zduplikowanych writable paths.
- Targetowany smoke Playwright na `/posts-feed-test-page` przeszedł z
  `adminFailures=0`, `metadataGaps=0`, `fixtureGaps=0`, `publicFailures=0`.
