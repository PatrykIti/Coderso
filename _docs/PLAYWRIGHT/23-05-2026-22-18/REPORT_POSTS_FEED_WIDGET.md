# RAPORT: Posts Feed Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `posts-feed`
> **Edytor:** `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` (1607 linii)
> **Strona testowa:** `/admin/pages/160c954b-1b3e-4798-bf37-74f697a18e24` (slug `/ctr-posts-feed-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/posts-feed-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/posts-feed.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

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

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_5 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `posts-feed.visual.display` | `Display` | 5 |
| `posts-feed.visual.section-header` | `Section header` | 2 |
| `posts-feed.visual.layout-style` | `Layout and style` | 10 |
| `posts-feed.visual.pagination` | `Pagination presentation` | 1 |
| `posts-feed.visual.empty-state` | `Empty state` | 2 |

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

1. **CONTRACT-13 + SHARED-HELPER (KRYTYCZNE):** Wszystkie 6 sekcji (`Runtime status`, `Section header`, `Layout and style`, `Display`, `Source setup`, `Empty state`) renderowanych identycznie w Wizard, Visual i Advanced. Jedyna unikalność: Advanced dodaje `Runtime payload`. Trzy tryby są praktycznie nieodróżnialne. Wymaga decyzji: rozłącznie po trybach, albo usunięcie zakładek dla Posts Feed.
2. Przemianować `Runtime status` → `Runtime payload` (CONTRACT-05).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).