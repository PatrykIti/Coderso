# RAPORT: Spacer Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #11 (Spacer Widget)
> **Środowisko:** http://localhost:5173/admin + http://localhost:3000
> **Strona testowa:** TEST-SPACER-0516 (`/admin/pages/1d6c38df-4720-4ea8-b1d5-8b43dc97b515`)

---

## 1. Przegląd widgetu

**Typ:** Layout primitive
**Moduł:** Layout
**Warianty:** `responsive` (domyślny), `fixed`
**Kategoria:** `layout`

Spacer widget to minimalistyczny blok pionowej przestrzeni w layoucie strony. Odpowiada za wstawianie kontrolowanej pustej przestrzeni między innymi widgetami. Obsługuje responsywne wysokości na poziomie desktop/tablet/mobile (tryb `responsive`) lub jedną wspólną wysokość dla wszystkich breakpointów (tryb `fixed`).

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych (`SpacerData`)

| Pole | Typ | Opis |
|------|-----|------|
| `height.desktop` | `string` | Wysokość na desktop (token lub wartość px) |
| `height.tablet` | `string` | Wysokość na tablet (tylko tryb responsive) |
| `height.mobile` | `string` | Wysokość na mobile (tylko tryb responsive) |
| `showGuideInEditor` | `boolean` | Widoczność nakładki pomocniczej w Preview mode |

**Domyślne wartości:**
- desktop: `"16"` → `4rem`
- tablet: `"12"` → `3rem`
- mobile: `"8"` → `2rem`
- showGuideInEditor: `true`

### 2.2 Tokeny wysokości (15 opcji)

| Token | Wartość CSS |
|-------|------------|
| `none` | `0rem` |
| `0` | `0rem` (duplikat `none`) |
| `1` | `0.25rem` |
| `2` | `0.5rem` |
| `3` | `0.75rem` |
| `4` | `1rem` |
| `5` | `1.25rem` |
| `6` | `1.5rem` |
| `8` | `2rem` |
| `10` | `2.5rem` |
| `12` | `3rem` |
| `16` | `4rem` |
| `20` | `5rem` |
| `24` | `6rem` |
| `32` | `8rem` |
| Custom | wartość px (np. `48px`) |

### 2.3 Warianty

| Wariant | Zachowanie |
|---------|-----------|
| `responsive` | Niezależne wartości dla desktop/tablet/mobile |
| `fixed` | Jedna wartość (desktop) klonowana do tablet i mobile przy normalizacji |

### 2.4 Tryby edytora

| Tryb | Zawartość |
|------|-----------|
| **Wizard** | Spacer mode (select), Desktop height (token + px), Show guide toggle |
| **Visual** | Variant cards (Responsive/Fixed), Responsive heights (token+px per breakpoint), Editor guide toggle |
| **Advanced** | Technical height tokens (zawsze 3 breakpointy — BUG), Raw payload JSON, Layout (container/padding/margin), Visibility (Desktop/Tablet/Mobile) |

### 2.5 Renderowanie (`SpacerBlock`)

Widget renderuje `<div aria-hidden="true">` z CSS custom properties:
- `--spacer-mobile-height`, `--spacer-tablet-height`, `--spacer-desktop-height`
- Tailwind klasy: `h-[var(--spacer-mobile-height)] md:h-[var(--spacer-tablet-height)] lg:h-[var(--spacer-desktop-height)]`
- Guide overlay renderowany wyłącznie gdy `previewDevice` prop jest przekazany (tylko Preview dialog)

---

## 3. Wyniki testów Playwright — co działa poprawnie ✓

### 3.1 Wizard Editor

| Test | Wynik |
|------|-------|
| Spacer mode select: Responsive / Fixed | ✓ Działa |
| Desktop height — token dropdown (15 opcji) | ✓ Działa |
| Desktop height — Custom px input | ✓ Działa |
| Token → czyści custom input | ✓ Działa |
| Custom px → przełącza combobox na "Custom px" | ✓ Działa |
| Resolved value preview (np. "Resolved: 4rem") | ✓ Aktualizuje się na bieżąco |
| Show guide toggle | ✓ Działa |
| Przycisk "Continue to layout and styling" | ✓ Przechodzi do Visual |

### 3.2 Visual Editor

| Test | Wynik |
|------|-------|
| Variant cards Responsive/Fixed z badge "Selected"/"Pick" | ✓ Działa |
| Tryb Fixed — tablet/mobile pola ukryte | ✓ Ukryte, komunikat "Fixed mode uses desktop height" |
| Tryb Responsive — 3 oddzielne pola H | ✓ Widoczne |
| Token `none` → Resolved: 0rem | ✓ |
| Token `32` → Resolved: 8rem | ✓ |
| Custom px `100px` → Resolved: 100px | ✓ |
| Show guide toggle w Visual | ✓ Działa |

### 3.3 Advanced Editor

| Test | Wynik |
|------|-------|
| Technical height tokens — 3 pola | ✓ Widoczne |
| Raw payload snapshot — poprawny JSON | ✓ Aktualizuje się na bieżąco |
| Layout: Container, Padding, Margin | ✓ Dostępne |
| Visibility: Desktop/Tablet/Mobile switche | ✓ Działają |

### 3.4 Canvas i Preview

| Test | Wynik |
|------|-------|
| Spacer widoczny w canvas jako element | ✓ Widoczny |
| Guide overlay w Preview modal (Desktop/Tablet/Mobile) | ✓ Wyświetla "Spacer Xrem" |
| Preview Desktop/Tablet/Mobile switcher | ✓ Działa |
| DOM data-attributes poprawne | ✓ (`data-spacer`, `data-spacer-variant`, `data-spacer-desktop` etc.) |

### 3.5 Frontend (http://localhost:3000)

| Test | Wynik |
|------|-------|
| Spacer renderuje się z poprawną wysokością CSS | ✓ |
| CSS custom properties `--spacer-*-height` | ✓ Ustawione |
| Responsywność — mobile (375px): 32px = 2rem | ✓ |
| Responsywność — tablet (768px): 64px = 4rem | ✓ |
| Responsywność — desktop (1280px): 128px = 8rem | ✓ |
| Guide overlay niewidoczny na froncie | ✓ Poprawnie ukryty |
| Brak błędów JS związanych ze spacerem | ✓ |
| Frontend = Admin (identyczne zachowanie) | ✓ |

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Duplikat tokenów `none` i `0`
**Priorytet:** Średni
**Opis:** Token `none` i token `0` mają identyczną wartość CSS (`0rem`). Oba są widoczne w liście jako oddzielne opcje — "None" i "0 (0rem)" — co wprowadza zbędną redundancję.
**Lokalizacja:** `core/widgets/core/spacer.tsx:5` — `spacerHeightTokens` array
**Repro:** Dropdown Desktop height → wybierz "None" → Resolved: 0rem → wybierz "0 (0rem)" → Resolved: 0rem (identyczne)
**Rekomendacja:** Usunąć jeden z tokenów (najlepiej `"0"`) i zachować tylko `"none"`.

#### BUG-02 — Fixed→Responsive: wartości tablet/mobile dziedziczą desktop zamiast poprzednich wartości
**Priorytet:** Wysoki
**Opis:** Gdy użytkownik ustawia różne wartości (np. desktop=32, tablet=12, mobile=8) w trybie Responsive, a następnie przełącza na Fixed i z powrotem na Responsive — wartości tablet i mobile są nadpisane przez wartość desktop (32, 32, 32). Użytkownik traci poprzednie ustawienia breakpointów.
**Lokalizacja:** `core/admin/ui/widgets/editors/SpacerEditors.tsx:55` — `normalizeValue` → `normalizeSpacerData` w trybie Fixed nadpisuje tablet i mobile
**Repro:** Visual → ustaw tablet=12, mobile=8 → przełącz na Fixed → wróć do Responsive → tablet=desktop, mobile=desktop
**Rekomendacja:** Zachować wartości tablet/mobile w osobnym stanie przed wejściem w Fixed, przywrócić je przy powrocie do Responsive.

#### BUG-03 — Advanced editor force-używa `variant="responsive"` niezależnie od aktualnego wariantu
**Priorytet:** Wysoki
**Opis:** W `SpacerAdvancedEditor` komponent `<ResponsiveHeights>` jest wywołany z hardcoded `variant="responsive"`, co oznacza że zawsze wyświetla 3 oddzielne pola (desktop, tablet, mobile) — nawet gdy aktywny wariant widgetu to "fixed". W trybie Fixed edytowanie pól tablet/mobile w Advanced nie ma efektu (bo normalizacja Fixed je nadpisze), ale użytkownik nie dostaje żadnej informacji zwrotnej o tym.
**Lokalizacja:** `core/admin/ui/widgets/editors/SpacerEditors.tsx:358`
```tsx
// Linia 358 — hardcoded "responsive" zamiast przekazania aktualnego `variant` prop
<ResponsiveHeights value={value} variant="responsive" onChange={onChange} />
```
**Repro:** Ustaw wariant Fixed → przejdź do Advanced → zobaczysz 3 oddzielne edytowalne pola tablet/mobile mimo że Fixed nie ich używa
**Rekomendacja:** Przekazać `variant={variant}` do `ResponsiveHeights` w Advanced lub jawnie oznaczyć pola tablet/mobile jako disabled/read-only gdy wariant to Fixed.

#### BUG-04 — "Show guide in editor" — mylący opis i niedziałający w głównym canvas
**Priorytet:** Wysoki
**Opis:** Guide overlay (label "Spacer Xrem") nie jest widoczny w głównym canvas edytora mimo że `showGuideInEditor=true` i `data-spacer-show-guide="true"`. Guide renderuje się wyłącznie gdy `previewDevice` prop jest przekazany do SpacerBlock (co dzieje się tylko w Preview modal i custom-screens). Nazwy i opisy opcji sugerują że guide jest widoczny "w edytorze" — co jest niezgodne z rzeczywistością.
**Lokalizacja:**
- `core/widgets/core/spacer.tsx:160` — `const showGuide = Boolean(normalized.showGuideInEditor) && Boolean(previewDevice);`
- Wizard opis: "Displays spacer label overlay in runtime preview only." (dokładny, ale niejasny)
- Visual opis: "Helps identify spacer size while composing templates." (sugeruje działanie w edytorze — mylący)
**Repro:** Dodaj spacer, włącz "Show guide in editor", sprawdź canvas → nakładka niewidoczna. Kliknij Preview → "Spacer 8rem" widoczny.
**Rekomendacja:** Dwa możliwe rozwiązania:
1. (Preferowane) Przekazać `previewDevice="desktop"` do SpacerBlock renderowanego w canvas edytora
2. Zmienić nazwy: "Show guide in preview" + opis "Visible in page preview, not in editor"

---

### 4.2 Problemy UX edytora

#### UX-01 — Wizard nie informuje że Fixed = ta sama wartość dla tablet i mobile
**Opis:** W trybie Wizard po wyborze wariantu "Fixed", formularz pokazuje jedynie "Desktop height" bez żadnej informacji że ta wartość będzie użyta też dla tablet i mobile. Brak komunikatu informacyjnego jak w Visual editor ("Fixed mode uses desktop height for tablet and mobile."). Użytkownik może nie zdawać sobie sprawy z konsekwencji wyboru Fixed.
**Rekomendacja:** Dodać komunikat informacyjny pod polem Desktop height w Wizard gdy wybrany jest tryb Fixed.

#### UX-02 — "Custom px" opcja w dropdownie jest no-op
**Opis:** Kliknięcie opcji "Custom px" w dropdownie wysokości nie wykonuje żadnej akcji (`if (next === "custom") return;`). Combobox wraca do poprzedniej wartości. Użytkownik może kliknąć "Custom px" oczekując jakiegoś efektu, ale nic się nie dzieje — dezorientujące.
**Lokalizacja:** `core/admin/ui/widgets/editors/SpacerEditors.tsx:172-177`
**Rekomendacja:** Ukryć opcję "Custom px" z dropdownu lub przekształcić ją w separator/label wyjaśniający że input poniżej służy do custom px. Ewentualnie: kliknięcie "Custom px" przenosi focus do custom input.

#### UX-03 — Custom input pusty gdy wybrany token (duplikat stanu)
**Opis:** Gdy wybrany jest token (np. `16`), custom px input jest pusty — `value={isSpacerHeightToken(value) ? "" : value}`. Skutkuje to tym że obie kontrolki mogą wydawać się "niezapisane" jednocześnie. Użytkownik widzi albo wartość w dropdownie albo w inpucie, ale nigdy w obu.
**Rekomendacja:** Dodać placeholder lub pomocniczy tekst gdy jest aktywny token (np. "Token active: 16 → 4rem").

#### UX-04 — Brak wizualnego rozróżnienia spacera w canvas gdy guide=false
**Opis:** Gdy `showGuideInEditor=false` (lub guide nie jest przekazany przez previewDevice), spacer jest kompletnie niewidoczny w canvas — to zwykła pusta przestrzeń bez żadnego wskaźnika. Użytkownik może pomyśleć że nic się nie dodało lub przypadkowo kliknąć w inne miejsce.
**Rekomendacja:** Zawsze pokazywać przynajmniej subtelny dashed border lub tło w canvas edytora dla spacera — niezależnie od `showGuideInEditor`. `showGuideInEditor` powinien kontrolować tylko label tekstowy, nie całą widoczność.

#### UX-05 — Advanced editor nie odzwierciedla wariantu Fixed
**Opis:** Powiązany z BUG-03. W trybie Fixed, Advanced pokazuje 3 edytowalne pola zamiast:
- Jedno pole (desktop) + informacja że tablet i mobile będą takie same
- Lub pola tablet/mobile disabled/read-only
Użytkownik edytuje wartości tablet/mobile w Advanced myśląc że ma efekt, ale po normalizacji Fixed są one nadpisane.
**Rekomendacja:** Wyświetlać wariant-aware layout w Advanced lub dodać baner "Widget is in Fixed mode — tablet and mobile values are synchronized with desktop."

---

### 4.3 Braki funkcjonalne

#### BF-01 — Brak widoczności guide w głównym canvas (powiązany z BUG-04)
**Priorytet:** Wysoki
**Opis:** `showGuideInEditor` nie ma żadnego efektu w głównym edytorze canvas. Guide działa tylko w Preview dialog. Jedna z głównych zadeklarowanych funkcji widgetu nie działa w oczekiwanym kontekście.

#### BF-02 — Brak jednostek vw/vh/dvh/svh
**Priorytet:** Średni
**Opis:** Spacer obsługuje tylko tokeny Tailwind (rem) i px. Brak viewport units (np. `10vh`, `5dvh`) które są przydatne do tworzenia space'u proporcjonalnego do viewportu.

#### BF-03 — Brak `clamp()` / fluid spacing
**Priorytet:** Niski
**Opis:** Brak możliwości zdefiniowania płynnej wysokości przestrzeni skalującej się między wartościami min/max jak `clamp(2rem, 5vw, 8rem)`. Alternatywą jest korzystanie z 3 oddzielnych breakpointów w trybie Responsive, ale to nie jest to samo.

#### BF-04 — Brak named presets / templates spacerów
**Priorytet:** Średni
**Opis:** Brak predefiniowanych nazwanych presetów (np. "Section gap", "Card gap", "Hero spacer") które pozwoliłyby na utrzymanie spójnego rytmu pionowego na całej stronie. Każdy spacer jest konfigurowany indywidualnie.

#### BF-05 — Brak orientacji poziomej (horizontal spacer)
**Priorytet:** Niski
**Opis:** Widget obsługuje wyłącznie pionową przestrzeń (`height`). Brak opcji `width` dla poziomego spacera używanego wewnątrz flex/grid kontenerów.

#### BF-06 — Brak wizualnego wskaźnika breakpointu w polu Desktop height
**Priorytet:** Niski
**Opis:** Przy wpisywaniu wartości brakuje wskaźnika "ta wartość zostanie użyta dla viewportów > 1024px (Tailwind lg:)". Nie wiadomo dokładnie kiedy używany jest desktop vs tablet vs mobile breakpoint w kontekście Tailwind.

#### BF-07 — Brak możliwości wpisania wartości bez "px" sufiksu w custom input
**Priorytet:** Niski
**Opis:** `resolveHeightTokenOrPx` obsługuje zapis bez sufiksu (np. `"48"` → `"48px"`), ale placeholder i dokumentacja sugerują tylko format z px (`"e.g. 48px"`). Niespójność między implementacją a komunikacją użytkownika.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | `aria-hidden="true"` na spacerze — poprawne | WCAG — | OK |
| A2 | Brak etykiety dla custom px input (wyłącznie `placeholder`) | WCAG 1.3.1 | Niski |
| A3 | Guide overlay brak `aria-label` / `role` | — | Niski |

---

## 6. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Plik |
|----|------|------|
| BUG-02 | Fixed→Responsive niszczy wartości tablet/mobile | SpacerEditors.tsx |
| BUG-03 | Advanced editor hardcoded `variant="responsive"` | SpacerEditors.tsx:358 |
| BUG-04 | Guide niewidoczny w canvas — mylące UX | spacer.tsx:160 + SpacerEditors.tsx |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-01 | Komunikat Fixed mode w Wizard |
| UX-02 | "Custom px" opcja w dropdownie jest no-op — ukryć lub przeformułować |
| UX-04 | Zawsze widoczny outline spacera w canvas (niezależnie od guide) |
| UX-05 | Advanced pokazuje Fixed-aware layout |

### Do naprawy w kolejnym kroku

| ID | Priorytet | Opis |
|----|-----------|------|
| BUG-01 | Średni | Usunąć duplikat tokenu `"0"` (taki sam jak `none`) |
| BF-01 | Wysoki | Guide widoczny w canvas (previewDevice w canvas) |
| BF-04 | Średni | Named presets spacerów dla spójnego rytmu pionowego |
| BF-02 | Średni | Jednostki vw/vh/dvh |
| UX-03 | Niski | Custom input placeholder gdy aktywny token |
| BF-03 | Niski | Fluid spacing clamp() |
| BF-05 | Niski | Horizontal spacer option |

---

## 7. Porównanie Admin UI vs Frontend

| Aspekt | Admin UI | Frontend | Zgodność |
|--------|----------|----------|----------|
| Wysokość spacera (responsive) | ✓ Ustawia CSS vars | ✓ Renderuje CSS vars | ✓ Identyczne |
| Tryb Fixed — 3 breakpointy = desktop | ✓ Normalizacja poprawna | ✓ Normalizacja poprawna | ✓ Identyczne |
| Guide overlay | ✓ Widoczny w Preview modal | ✗ Niewidoczny (brak previewDevice) | ✓ Poprawne (celowe) |
| aria-hidden | ✓ | ✓ | ✓ |

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 4 |
| Problemy UX edytora | 5 |
| Braki funkcjonalne | 7 |
| Problemy dostępności | 2 |
| **Łącznie** | **18** |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `spacer-page-editor.png` | Nowa strona testowa w edytorze (pusty canvas) |
| `spacer-widget-added.png` | Spacer dodany do strony |
| `spacer-wizard-editor.png` | Wizard editor — tryb Responsive |
| `spacer-wizard-fixed-mode.png` | Wizard editor — tryb Fixed (brak komunikatu o tablet/mobile) |
| `spacer-visual-editor.png` | Visual editor — tryb Fixed (tablet/mobile ukryte) |
| `spacer-visual-responsive.png` | Visual editor — tryb Responsive (3 pola) |
| `spacer-canvas-with-guide.png` | Canvas z włączonym guide (niewidoczny!) |
| `spacer-canvas-guide-off.png` | Canvas z wyłączonym guide (niewidoczny spacer) |
| `spacer-advanced-editor.png` | Advanced editor — 3 pola zawsze widoczne (BUG-03) |
| `spacer-canvas-fixed-mode.png` | Canvas — spacer w trybie Fixed |
| `spacer-preview-dialog.png` | Preview dialog — guide "Spacer 8rem" widoczny |
| `spacer-preview-mobile.png` | Preview mobile — guide "Spacer 8rem" (Fixed = stała wartość) |
| `spacer-frontend-desktop.png` | Frontend desktop — spacer (pusta przestrzeń) |
| `spacer-frontend-desktop-1280.png` | Frontend 1280px — computed height: 128px = 8rem |

---

## Status po TASK-256 (2026-05-17)

- `TASK-256-05-03`: `SpacerAdvancedEditor` is now variant-aware instead of
  always rendering responsive breakpoint controls in fixed mode.
- `TASK-256-05-03`: fixed-mode normalization preserves hidden tablet/mobile
  values so users can switch back to responsive mode without destructive data
  loss. Runtime still resolves fixed output from the desktop token.
- `TASK-256-05-03`: `Show guide in editor` is now truthful for editor-preview
  surfaces through the shared render-context path.
- Shared evidence from this turn:
  `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx
  tests/vitest/widgets/spacer.test.tsx` passed on 2026-05-17.

## Status po TASK-303 (2026-05-17)

Shared evidence from the closure pass:
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`

| Row | Final status | Owner | Evidence |
|---|---|---|---|
| BUG-01 | `fixed` | `TASK-303` | Visible token options now collapse the legacy `0` duplicate behind canonical `None`. |
| UX-02 | `fixed` | `TASK-303` | Choosing `Custom px` now enters explicit custom-edit mode instead of silently no-oping. |
| UX-03 | `fixed` | `TASK-303` | Token/custom fields now show resolved or invalid-state guidance even when the custom input is empty. |

The remaining Spacer product backlog stays with `TASK-284` or the already-landed
shared TASK-256 slices; `TASK-303` only closed the residual Divider/Spacer
token-control drift that stayed live after TASK-256 closure.


## Status po TASK-284-01 (2026-05-21)

Leaf evidence from this turn:
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/spacer.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`

| Row | Final status | Owner | Evidence |
|---|---|---|---|
| UX-01 | `fixed` | `TASK-284-01` | Wizard now shows a fixed-mode note directly under the desktop height control before the guide toggle. |
| BF-06 | `fixed` | `TASK-284-01` | Desktop, tablet, and mobile height controls now explain the active Tailwind breakpoint range in Visual/Advanced and the desktop breakpoint in Wizard. |
| BF-07 | `fixed` | `TASK-284-01` | Spacer custom-height copy now explicitly says `48` normalizes to `48px`, while keeping `48px` valid. |
| A2 | `fixed` | `TASK-284-01` | Spacer custom-height inputs now use explicit `aria-label` plus `aria-describedby` helper wiring instead of placeholder-only context. |

## Status po TASK-284-02 (2026-05-21)

Leaf evidence from this turn:
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`

| Row | Final status | Owner | Evidence |
|---|---|---|---|
| BF-02 | `fixed` | `TASK-284-02` | Spacer now accepts bounded viewport custom heights (`vh`, `dvh`, `svh`, `vw`) and stores them in canonical lowercase form before runtime render. |
| BF-03 | `fixed` | `TASK-284-02` | Spacer now accepts safe canonical `clamp(min, preferred, max)` values, where `min`/`max` are `px|rem` and the `preferred` slot is a viewport unit, while malformed CSS falls back before public DOM output. |

## Status po TASK-284-03 (2026-05-21)

Leaf evidence from this turn:
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`

| Row | Final status | Owner | Evidence |
|---|---|---|---|
| BF-04 | `fixed` | `TASK-284-03` | Spacer now exposes transient `Card gap`, `Section gap`, and `Hero gap` presets in Wizard and Visual. Responsive mode applies full triplets, while fixed mode updates desktop only and preserves hidden tablet/mobile values until the user switches back to responsive editing. |

## Status po TASK-284-04 (2026-05-21)

Leaf evidence from this turn:
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict` (fails locally because `semgrep`, `trivy`, and `gitleaks` are not installed in `$PATH`; `bun audit` still ran inside the same command)
- `bun run precommit`

| Row | Final status | Owner | Evidence |
|---|---|---|---|
| BF-05 | `deferred` | `TASK-284-04 -> TASK-326` | Spacer remains vertical-only. The current shared `WidgetRenderer` shell still wraps nested widgets as full-width blocks, so a local `orientation`/`width` field would be misleading instead of acting like a truthful row-flow gap. Future implementation is reassigned to shared `TASK-326`. |

## Finalny status po TASK-284-05 (2026-05-21)

Family closure validation from this turn:
- `git diff --check`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/widgets/renderer.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict` (fails locally because `semgrep`, `trivy`, and `gitleaks` are not installed in `$PATH`; `bun audit` still ran inside the same command)
- `bun run precommit`

| Row | Final status | Owner | Evidence |
|---|---|---|---|
| BUG-01 | `fixed-task-303` | `TASK-303` | Shared token controls now collapse the duplicate `0` off-state behind canonical `None`. |
| BUG-02 | `fixed-task-256` | `TASK-256-05-03` | Fixed-mode normalization now preserves hidden tablet/mobile values so responsive breakpoints survive mode round-trips. |
| BUG-03 | `fixed-task-256` | `TASK-256-05-03` | Advanced height controls now follow the active fixed/responsive variant instead of hardcoding responsive mode. |
| BUG-04 | `fixed-task-256` | `TASK-256-05-03` | The guide now renders on editor-preview surfaces through the shared render-context path, so the control is truthful in the builder. |
| UX-01 | `fixed-task-284` | `TASK-284-01` | Wizard now explains that fixed mode reuses the desktop height for tablet and mobile. |
| UX-02 | `fixed-task-303` | `TASK-303` | Selecting `Custom px` now enters explicit custom-edit mode instead of silently doing nothing. |
| UX-03 | `fixed-task-303` | `TASK-303` | Token/custom controls now keep resolved or invalid-state guidance visible even when the custom field is empty. |
| UX-04 | `no-action` | No TASK-284 implementation | Spacer intentionally stays visually minimal when `showGuideInEditor` is off; the shipped contract does not add a second always-on outline. |
| UX-05 | `fixed-task-256` | `TASK-256-05-03` | Advanced now reflects the active variant, so fixed mode no longer shows misleading editable tablet/mobile controls. |
| BF-01 | `fixed-task-256` | `TASK-256-05-03` | Guide visibility is no longer limited to the preview dialog; editor-preview surfaces now render the same affordance. |
| BF-02 | `fixed-task-284` | `TASK-284-02` | Spacer now accepts bounded viewport custom heights (`vh`, `dvh`, `svh`, `vw`). |
| BF-03 | `fixed-task-284` | `TASK-284-02` | Spacer now accepts safe canonical fluid `clamp(min, preferred, max)` values. |
| BF-04 | `fixed-task-284` | `TASK-284-03` | Spacer now exposes transient `Card gap`, `Section gap`, and `Hero gap` presets in Wizard and Visual. |
| BF-05 | `deferred` | `TASK-284-04 -> TASK-326` | Honest horizontal Spacer support still needs a shared nested row-flow rendering owner, so this row stays deferred. |
| BF-06 | `fixed-task-284` | `TASK-284-01` | Desktop, tablet, and mobile height controls now explain the active Tailwind breakpoint ranges. |
| BF-07 | `fixed-task-284` | `TASK-284-01` | Spacer copy now explicitly documents bare-number input such as `48` -> `48px`. |
| A1 | `no-action` | No TASK-284 implementation | Spacer remains a decorative layout primitive under `aria-hidden="true"`, which is the intended accessibility contract. |
| A2 | `fixed-task-284` | `TASK-284-01` | Spacer custom-height inputs now expose explicit accessible names and helper descriptions. |
| A3 | `no-action` | No TASK-284 implementation | The guide stays inside the decorative `aria-hidden` Spacer shell, so no separate role or label is exposed to assistive tech. |

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16; shared closure refreshed — 2026-05-17; TASK-284-01 refreshed — 2026-05-21; TASK-284-02 refreshed — 2026-05-21; TASK-284-03 refreshed — 2026-05-21; TASK-284-04 refreshed — 2026-05-21; TASK-284-05 refreshed — 2026-05-21.*
