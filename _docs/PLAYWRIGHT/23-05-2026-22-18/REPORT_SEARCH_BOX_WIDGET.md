# RAPORT: Search Box Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `search-box`
> **Edytor:** `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` (465 linii)
> **Strona testowa:** `/admin/pages/b4734a85-b68d-470f-b65d-54ea42f92eaa` (slug `/ctr-search-box-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/search-box-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/search-box.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Mode` | Data source / behavior selector |
| 2 | `Surface` | Surface (border, radius, shadow) |
| 3 | `Copy and behavior` | (unmapped — propose canonical) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Mode` | Data source / behavior selector |
| 2 | `Surface` | Surface (border, radius, shadow) |
| 3 | `Copy and behavior` | (unmapped — propose canonical) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Contract` | Runtime payload |
| 2 | `Runtime payload` | Runtime payload |
| 3 | `Copy and behavior` | (unmapped — propose canonical) |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_3 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `search-box.visual.search-copy` | `Search copy` | 4 |
| `search-box.visual.search-interaction` | `Search interaction` | 2 |
| `search-box.visual.search-surface` | `Search surface` | 3 |

## 2. Sekcje siedzące w helperach (poza top-level funkcjami)

Sekcje (`<EditorSection title=…>`) zdefiniowane wewnątrz pomocniczych komponentów, nie w głównej funkcji editora — przez to parser top-level nie znalazł ich w §1, ale renderują się w UI:

- `Mode` → **Data source / behavior selector**
- `Copy and behavior` → **(unmapped — propose canonical)**
- `Runtime payload` → **Runtime payload**
- `Surface` → **Surface (border, radius, shadow)**
- `Contract` → **Runtime payload**

## 3. Krytyczne uwagi kontraktu

Identycznie jak listing-filters — Visual pusty, jedyna `Contract` w Advanced.

## 5. Rekomendacje per widget

1. **CONTRACT-12 + SHARED-HELPER:** Sekcje renderowane identycznie w Wizard i Visual. Advanced ma jedyną unikalną sekcję `Contract`/`Runtime payload`. Wymaga rozłącznego podziału lub usunięcia trybów.
2. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Copy and behavior`.
3. Przemianować `Contract` → `Runtime payload` (CONTRACT-05).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).