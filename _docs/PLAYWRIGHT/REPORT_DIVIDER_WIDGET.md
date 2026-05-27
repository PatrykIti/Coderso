# RAPORT: Divider Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #11 (Divider Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `divider-audit` (oddzielna od innych agentów)

---

## 1. Przegląd widgetu

**Typ:** Layout / Atomic (brak slotów)
**Kategoria:** `layout`
**Warianty:** `line`, `dashed`, `label-center`
**Plik renderera:** `core/widgets/core/divider.tsx`
**Plik edytora:** `core/admin/ui/widgets/editors/DividerEditors.tsx`

Divider to prosty widget separatora wizualnego — pozioma linia oddzielająca sekcje/bloki. Opcjonalnie może mieć wyśrodkowany label (wariant `label-center`). Widget jest w pełni statyczny (zero JavaScript, zero slotów).

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Pole | Typ | Domyślnie | Opis |
|------|-----|-----------|------|
| `label` | `string?` | `""` | Tekst wyśrodkowany (tylko `label-center`) |
| `thickness` | `number` | `1` | Grubość linii w px (1–8) |
| `color` | `string` | `var(--color-border)` | Kolor linii (hex lub CSS var) |
| `width` | `"full"\|"container"\|"custom"` | `"full"` | Tryb szerokości |
| `customWidth` | `string` | `"320px"` | Szerokość przy trybie `custom` |
| `marginTop` | `string` | `"6"` | Margines górny (token lub px) |
| `marginBottom` | `string` | `"6"` | Margines dolny (token lub px) |

### 2.2 Warianty

| ID | Opis |
|----|------|
| `line` | Standardowa ciągła linia pozioma |
| `dashed` | Przerywana linia (border-style: dashed) |
| `label-center` | Linia z wyśrodkowanym tekstem pomiędzy dwoma segmentami |

### 2.3 Tryby szerokości

| Tryb | Rezultat CSS |
|------|-------------|
| `full` | `100%` |
| `container` | `min(100%, 48rem)` — **hardcoded 768px** |
| `custom` | wartość z pola `customWidth` |

### 2.4 Tokeny spacingu

14 predefiniowanych wartości (`none`, `0`–`24`) mapowanych na wartości rem + niestandardowe px. Zarówno `none` jak i `0` mapują na `0rem` — **duplikat**.

### 2.5 Tryby edytora

- **Wizard** — wariant (select), opcjonalny label (tylko label-center), grubość
- **Visual** — VariantCards, label, DividerFields (grubość, width mode, kolor), SpacingField ×2
- **Advanced** — read-only variant select, DividerFields, SpacingField ×2, JSON snapshot

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | **Advanced editor: variant select jest dekoracją** — `onValueChange={() => undefined}` sprawia że select wygląda klikalnie ale nic nie robi. W zakładce Advanced nie ma kart wariantów, więc nie ma żadnego sposobu zmiany wariantu z poziomu Advanced. Brak komunikacji, że to celowe | Edytor |
| C2 | **SpacingField "Custom px" to ślepy zaułek** — po wyborze `Custom px` z dropdownu, kod robi `return` i nic nie zmienia. Pole tekstowe poniżej jest widoczne tylko gdy `!isDividerSpaceToken(value)`, co nigdy nie następuje przez wybór z listy. Użytkownik musi ręcznie wpisać wartość w pole tekstowe, nie wiedząc dlaczego dropdown nie zmienił się na "Custom px" | Edytor |
| C3 | **ColorField niszczy wartość CSS var** — domyślny kolor to `var(--color-border)`. Po kliknięciu w color picker (który pokazuje fallback `#e2e8f0`), wartość CSS var zostaje trwale zastąpiona przez hex. Nie ma możliwości przywrócenia CSS var bez ręcznego wpisania | Edytor |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak separacji koloru label i koloru linii** — w wariancie `label-center` tekst label i linia używają tego samego pola `color`. Nie można mieć szarej linii z czarnym tekstem | Dane/Renderer |
| W2 | **Brak kontroli typografii label** — `text-xs font-medium uppercase tracking-wider` hardcoded; brak font-size, font-weight, text-transform, letter-spacing | Renderer |
| W3 | **`container` width hardcoded na `min(100%, 48rem)`** — wartość 48rem nie jest konfigurowalnym tokenem; przy projekcie z inną szerokością kontenera jest to niespójne | Renderer |
| W4 | **Brak kontroli wyrównania poziomego** — przy trybach `container` i `custom`, widget jest zawsze wyśrodkowany (`mx-auto`). Brak opcji left/right | Renderer |
| W5 | **Brak kanału alpha (przezroczystości)** — pole color akceptuje hex i CSS vars, ale żaden z nich nie obsługuje przezroczystości w edytorze (brak rgba/hsla/hex8 w pickerze) | Edytor |
| W6 | **Brak `aria-hidden="true"` na dekoracyjnych dividerach** — linie bez labelu są czysto dekoracyjne i powinny być ukryte przed screen readerami | Renderer |
| W7 | **Renderer używa `<div>` zamiast `<hr>`** — `<hr>` ma natywną semantykę separatora (`role="separator"`) i lepszą interpretację przez screen readery; `<div>` wymaga jawnych atrybutów ARIA | Renderer |
| W8 | **Brak `whitespace-nowrap` na label** — `shrink-0 px-1` bez `whitespace-nowrap`; długi label może się zawinąć i zniszczyć układ linia|label|linia | Renderer |
| W9 | **Brak padding gap między label a liniami** — `gap-3` hardcoded; użytkownik nie może kontrolować odstępu między tekstem a segmentami linii | Renderer |
| W10 | **Brak kontroli stylu przerw w `dashed`** — przerywana linia (`border-style: dashed`) używa domyślnych wartości przeglądarki dla dash-gap-length; brak opcji `border-dash-offset`, `border-style: dotted` | Renderer |
| W11 | **Brak opcji "spacer-only" (bez widocznej linii)** — divider służy też jako spacer pionowy, ale nie ma trybu bez linii (samo marginTop/marginBottom bez visible line) | Dane |
| W12 | **Brak Normalize/Reset buttons** — w przeciwieństwie do innych zaawansowanych edytorów, brak przycisków resetowania do wartości domyślnych | Edytor |

### 3.3 Problemy UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | **Tokeny `none` i `0` w spacingu są duplikatami** — oba mapują na `0rem`; lista tokenów pokazuje oba, co jest redundantne i mylące (`"None"` vs `"0 (0rem)"`) | Edytor |
| U2 | **ColorField: label "Line color" myląca dla `label-center`** — tekst label jest kolorowany tym samym polem co linia, więc "Line color" jest nieprecyzyjne | Edytor |
| U3 | **Brak podglądu inline dvidera w edytorze** — żadna z zakładek (Wizard/Visual/Advanced) nie pokazuje podglądu samego separatora z aktualnymi ustawieniami | Edytor |
| U4 | **Wizard nie pokazuje kontroli koloru ani spacingu** — użytkownik musi przejść do Visual żeby ustawić kolor, tryb szerokości, marginesy; Wizard daje fałszywe poczucie kompletności | Edytor |
| U5 | **Custom width input: placeholder "e.g. 320px or 60%" — `%` nie działa** — walidator `cssLengthPattern` akceptuje `%`, ale `resolveCustomWidth` akceptuje tylko `px|rem|em|%`; placeholder jest poprawny, ale brak jasnego feedbacku walidacji | Edytor |
| U6 | **Brak wyraźnego stanu błędu dla nieprawidłowych wartości custom width/spacing** — gdy użytkownik wpisze np. "abc", `resolveCustomWidth` cicho wraca do `dividerDefaults.customWidth`; brak komunikatu błędu w UI | Edytor |
| U7 | **SpacingField: tekst "Resolved: ..." pokazuje wynik nawet gdy token jest zaznaczony** — `Resolved: 1.5rem` przy tokenie `6` jest przydatne, ale przy custom polu po wpisaniu błędnej wartości, "Resolved: 1.5rem" (fallback) nie informuje użytkownika o błędzie | Edytor |
| U8 | **Advanced editor: pozornie interaktywny variant select** — wygląda jak działający dropdown ale jest martwy; małe `text-xs` info poniżej jest zbyt subtelne | Edytor |
| U9 | **Brak możliwości wyczyszczenia pola label** — nie ma clear button; należy ręcznie usuwać tekst; spójność z innymi edytorami (niektóre mają `ClearableFieldHeader`) | Edytor |

### 3.4 Problemy renderera

| # | Problem | Obszar |
|---|---------|--------|
| R1 | **Brak `role="separator"` lub `aria-hidden="true"`** — dekoracyjne `<div>` bez atrybutów ARIA; screen reader może próbować odczytać element | Dostępność |
| R2 | **Brak `<hr>` jako semantyczny element separatora** — W3C zaleca `<hr>` dla tematycznych przerw w treści | Dostępność/Semantyka |
| R3 | **`data-divider-color` eksponuje surową wartość** — `var(--color-border)` widoczna w atrybucie danych; tech leak do DOM | Renderer |
| R4 | **Label bez zabezpieczenia przed zawijaniem** — `shrink-0` bez `whitespace-nowrap`; długi label nadal może się zawinąć na wąskich viewportach | Renderer |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=divider-audit`
> **Data testu:** 2026-05-16
> **Strona testowa:** `/test-divider-0516` (UUID: `37fbfa5f-9583-4277-ac30-92b21559ae9b`)

### 4.1 Wizard Editor

| Obserwacja | Status |
|-----------|--------|
| Select wariantu (`Line` / `Dashed` / `Label center`) działa poprawnie | ✅ |
| Pole `Center label` pojawia się tylko dla `label-center` | ✅ |
| Select grubości linii (1–8px) działa | ✅ |
| Brak kontroli koloru w Wizard | ⚠️ (U4) |
| Brak kontroli spacingu w Wizard | ⚠️ (U4) |
| Przycisk "Continue to layout and styling" przechodzi do Visual | ✅ |

### 4.2 Visual Editor

| Obserwacja | Status |
|-----------|--------|
| Variant cards (Line/Dashed/Label center) renderują się i przełączają | ✅ |
| Pole `Center label` pojawia się po wyborze `label-center` | ✅ |
| Canvas preview aktualizuje się po wpisaniu labelu ("OR") | ✅ |
| `Line thickness` dropdown (1–8px) działa | ✅ |
| `Width mode`: Full width / Container width / Custom width działają | ✅ |
| Po wyborze `Custom width` pojawia się pole z wartością `320px` | ✅ |
| **Color picker pokazuje `#e2e8f0` gdy wartość to `var(--color-border)`** | 🔴 C3 |
| Po zmianie koloru przez picker CSS var `var(--color-border)` zostaje zastąpiona przez hex | 🔴 C3 |
| Można przywrócić CSS var ręcznie przez tekst input | ✅ (obejście) |
| **"Custom px" w SpacingField — wybór z dropdown nic nie zmienia** | 🔴 C2 |
| Tekst input w SpacingField pozwala wpisać własną wartość (ręcznie) | ✅ (obejście) |
| "Resolved: 1.5rem" przy tokenie `6` — informacja pomocna | ✅ |

### 4.3 Advanced Editor

| Obserwacja | Status |
|-----------|--------|
| **Variant select otwiera się i pokazuje opcje, ale wybór nic nie zmienia** | 🔴 C1 |
| Po wyborze "Line" z "Label center" — canvas, badge i dane pozostają `label-center` | 🔴 C1 |
| Mała nota "Variant is controlled by visual variant cards." — zbyt subtelna | ⚠️ U8 |
| Line thickness, Width mode, Line color — działają jak w Visual | ✅ |
| SpacingField — te same problemy co w Visual (C2) | 🔴 C2 |
| JSON snapshot sekcja "Raw payload" poprawnie pokazuje normalized data | ✅ |

### 4.4 Rendering w Admin Canvas

| Obserwacja | Status |
|-----------|--------|
| `line` — cienka ciągła linia widoczna w canvas | ✅ |
| `dashed` — przerywana linia widoczna w canvas | ✅ |
| `label-center` + label "OR" — tekst wyśrodkowany między dwiema liniami | ✅ |
| Real-time preview aktualizuje się przy zmianie wariantu, koloru, grubości | ✅ |
| Canvas shows "Page error: Not authenticated" przy wygaśnięciu sesji | ⚠️ Sesja |

---

## 5. Testy na froncie (localhost:3000)

> **URL:** `http://localhost:3000/test-divider-0516`
> **Viewporty:** 1280×800 (desktop), 390×844 (mobile)

### 5.1 Renderowanie wariantów

| Wariant | Desktop | Mobile (390px) |
|---------|---------|----------------|
| `line` — solid 1px border | ✅ | ✅ |
| `dashed` — dashed border-style | ✅ | ✅ |
| `label-center` z "OR" | ✅ | ✅ |

### 5.2 Computed styles (DOM inspection)

```
line:   border-style: solid,  1px, rgb(226,232,240)
dashed: border-style: dashed, 1px, rgb(226,232,240)
label-center: 2× solid segments (linia | label | linia)
```

`var(--color-border)` rozwiązuje się do `rgb(226, 232, 240)` (#e2e8f0) na light theme — poprawnie.

### 5.3 Struktura HTML i ARIA

```html
<!-- Wynik dla wariantu line: -->
<div class="w-full"
  data-divider="true"
  data-divider-variant="line"
  data-divider-thickness="1"
  data-divider-color="var(--color-border)"  <!-- CSS var w atrybucie -->
  data-divider-width-mode="full"
  data-divider-has-label="false"
  <!-- brak role="separator" -->
  <!-- brak aria-hidden="true" -->
>
  <div class="mx-auto border-t" style="border-top-width:1px;...;width:100%"></div>
</div>
```

**Problemy potwierdzone w DOM:**
- Wszystkie warianty renderowane jako `<div>` — potwierdzenie **W7/R2**
- Zero `role` na jakimkolwiek elemencie — potwierdzenie **R1**
- Zero `aria-hidden` na dekoracyjnych dividerach — potwierdzenie **R1**
- `data-divider-color="var(--color-border)"` eksponuje CSS var w DOM — potwierdzenie **R3**

### 5.4 Mobile (390px)

- Wszystkie 3 warianty renderują poprawnie
- Krótki label "OR" nie powoduje zawijania
- Spacing (marginTop/marginBottom 1.5rem) zachowany

---

## 6. Porównanie Admin Preview vs Frontend

| Aspekt | Admin Preview | Frontend | Zgodność |
|--------|--------------|----------|----------|
| Wariant `line` — rendering | Cienka szara linia | Cienka szara linia | ✅ |
| Wariant `dashed` — rendering | Przerywana linia | Przerywana linia (border-style: dashed) | ✅ |
| Wariant `label-center` + "OR" | Tekst wyśrodkowany | Tekst wyśrodkowany | ✅ |
| Kolor `var(--color-border)` | Wyświetla jako border | Resolves do #e2e8f0 | ✅ |
| Spacing (1.5rem top/bottom) | Visible space above/below | margin-top: 1.5rem ✅ | ✅ |
| Responsywność (390px) | Canvas zbyt wąski by porównać | Poprawne | — |

**Wnioski:** Admin preview i frontend są **spójne** — nie wykryto rozbieżności renderowania między środowiskami.

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | C1 | **Variant select w Advanced jest martwy (dekoracja)** | Dezorientacja użytkownika — UI sugeruje możliwość zmiany wariantu |
| 🔴 KRYTYCZNY | C2 | **SpacingField "Custom px" — ślepy zaułek** | Użytkownik nie może intuicyjnie ustawić własnego spacingu |
| 🔴 KRYTYCZNY | C3 | **Color picker niszczy wartość CSS var** | Utrata design tokenu; brak możliwości przywrócenia |
| 🟠 WYSOKI | W1 | **Brak osobnego koloru dla tekstu label** | Ograniczona personalizacja wariantu label-center |
| 🟠 WYSOKI | W7 | **`<div>` zamiast `<hr>`** | Błąd semantyczny i dostępności |
| 🟠 WYSOKI | R1 | **Brak ARIA (separator/hidden)** | Niedostępność dla screen readerów |
| 🟠 WYSOKI | W8 | **Brak `whitespace-nowrap` na label** | Potencjalny layout break przy długim labelu |
| 🟡 ŚREDNI | U1 | **Tokeny `none` i `0` jako duplikaty** | Zbędna redundancja w UI |
| 🟡 ŚREDNI | U3 | **Brak inline preview dvidera** | Użytkownik musi zapisać i sprawdzić na froncie |
| 🟡 ŚREDNI | W3 | **Container width hardcoded 48rem** | Niespójna szerokość w projektach z innym design tokenem |
| 🟡 ŚREDNI | W6 | **Brak aria-hidden dla dekoracyjnych linii** | SEO i dostępność |
| 🟡 ŚREDNI | U6 | **Brak komunikatu błędu walidacji custom width** | Ciche fallbacki dezorientują użytkownika |
| 🟢 NISKI | W2 | **Typografia label hardcoded** | Ograniczone opcje brandingowe |
| 🟢 NISKI | W4 | **Brak wyrównania poziomego (left/right)** | Brak opcji asymetrycznych dividerów |
| 🟢 NISKI | W11 | **Brak trybu "spacer-only"** | Trzeba używać HTML trick zamiast widgetu |
| 🟢 NISKI | W12 | **Brak Reset/Normalize buttons** | Wygoda redaktora |

---

## 8. Dodatkowe obserwacje z sesji

### 8.1 Wygasanie sesji admin (problem CMS, nie widget)

Sesja admina wygasa po ~5 minutach bezczynności na poziomie API (401 Unauthorized na `/api/pages/{id}` i `/api/pages/{id}/publish`). Skutkuje to:
- Utratą niezapisanych zmian (widget data reset do ostatnio opublikowanej wersji)
- Koniecznością ponownego logowania
- Nieudanymi próbami publikacji (zmiany nie docierają do backendu)

Prawdopodobna przyczyna: krótki TTL sesji/tokena JWT bez silent refresh. Nie jest to bezpośredni błąd divider widget, ale wpływa na workflow redaktora.

### 8.2 Potwierdzenie spójności Preview

Nie wykryto żadnych rozbieżności między admin canvas preview a frontendem (`localhost:3000`). Oba środowiska renderują widget identycznie dla wszystkich 3 wariantów.

---

## Status po TASK-256 (2026-05-17)

- `TASK-256-05-03`: the Advanced variant select no longer behaves like a live
  control; it is rendered as a disabled technical field with explicit guidance
  that variant ownership lives in Visual mode.
- `TASK-256-04` + `TASK-256-05-03`: unlabeled divider output now exposes
  separator semantics instead of a plain presentational block.
- Shared evidence from this turn:
  `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx
  tests/vitest/widgets/divider.test.tsx` passed on 2026-05-17.

## Status po TASK-303 i TASK-264 (2026-05-17)

Validation from the closure pass:
- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`

| Row | Final status | Owner | Evidence |
|---|---|---|---|
| C1 | `TASK-256` | `TASK-256-05-03` | Advanced variant is now disabled/read-only with explicit Visual ownership guidance. |
| C2 | `fixed` | `TASK-303` | Shared spacing token fields now enter explicit custom mode instead of silently no-oping. |
| C3 | `fixed` | `TASK-303` | Divider swatches no longer overwrite CSS-variable values; token replacement stays on the text input. |
| W1 | `fixed` | `TASK-264-01` | `label-center` now has a separate label color field and runtime label-color output. |
| W2 | `fixed` | `TASK-264-01` | Label typography is schema-backed for size, weight, transform, and letter spacing. |
| W3 | `fixed` | `TASK-264-02` | `container` width now uses bounded `sm/md/lg` tokens instead of a hardcoded `48rem`. |
| W4 | `fixed` | `TASK-264-02` | Non-full dividers now support `left`, `center`, and `right` alignment. |
| W5 | `fixed` | `TASK-264-03` | Divider now exposes bounded transparency authoring through editor-owned opacity tokens. |
| W6 | `TASK-256` | `TASK-256-04` + `TASK-256-05-03` | Unlabeled divider output keeps the shared separator semantics baseline; no local reopening was needed. |
| W7 | `TASK-256` | `TASK-256-04` + `TASK-256-05-03` | The live shared baseline keeps separator semantics on the current runtime contract instead of reopening a literal `<hr>` task here. |
| W8 | `fixed` | `TASK-264-01` | Label output now includes `whitespace-nowrap` and preserves line-label-line layout. |
| W9 | `fixed` | `TASK-264-01` | Label gap is now configurable through bounded gap tokens. |
| W10 | `fixed` | `TASK-264-03` | Divider exposes bounded `dashed`/`dotted` line styles and dash-pattern choices. |
| W11 | `fixed` | `TASK-264-03` | Divider now supports `visibility="spacer-only"` for intentional rhythm without a visible line. |
| W12 | `fixed` | `TASK-264-04` | Advanced now exposes normalize/reset actions without mutating the active variant. |
| U1 | `fixed` | `TASK-303` | Visible token choices now collapse the legacy `0` duplicate behind canonical `None`. |
| U2 | `fixed` | `TASK-264-01` | Visual/Advanced now distinguish `Line color` from `Label color` when `label-center` is active. |
| U3 | `fixed` | `TASK-264-04` | Wizard, Visual, and Advanced now render inline Divider preview. |
| U4 | `fixed` | `TASK-264-04` | Wizard now includes line color, width-mode, alignment, and spacing controls. |
| U5 | `not reproducible` | `TASK-264-06` | `%` custom widths were already accepted by the live parser; closure keeps this row as historical report drift. |
| U6 | `fixed` | `TASK-303` + `TASK-264-02` | Shared spacing drafts now show invalid-state feedback, and custom-width drafts stay visible until corrected. |
| U7 | `fixed` | `TASK-303` | Shared token/custom fields now show explicit invalid-state copy instead of fallback-only `Resolved` text. |
| U8 | `TASK-256` | `TASK-256-05-03` | Advanced keeps a disabled technical variant field instead of a fake-interactive control. |
| U9 | `fixed` | `TASK-264-01` | Center label fields now expose a clear action. |
| R1 | `TASK-256` | `TASK-256-04` + `TASK-256-05-03` | Unlabeled output keeps shared separator semantics while decorative line segments stay hidden from assistive tech. |
| R2 | `TASK-256` | `TASK-256-04` + `TASK-256-05-03` | Closure keeps the shared separator baseline and does not reopen a Divider-local semantic rewrite. |
| R3 | `fixed` | `TASK-264-05` | Public DOM now exposes bounded marker kinds instead of raw style strings. |
| R4 | `fixed` | `TASK-264-01` | Label text now stays on one line through runtime `whitespace-nowrap`. |

## Status po TASK-336-19 (2026-05-25)

Fresh helper-agent and Claude-oriented contract review re-opened Divider because
the earlier layout-token closure still left Advanced with hidden writable
controls, raw JSON payload diagnostics, stale section names, and incomplete
Wizard/Visual ownership metadata.

Targeted evidence from this slice:
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-divider-advanced-readonly-2026-05-25.md`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-divider-advanced-readonly-2026-05-25.json`

| Row | Final status | Owner | Evidence |
|---|---|---|---|
| Advanced hidden mutators | `fixed-task-336-19` | `TASK-336-19` | Divider Advanced now renders read-only runtime/support summaries only and exposes no writable editor groups. |
| Raw payload snapshot | `fixed-task-336-19` | `TASK-336-19` | The visible JSON payload snapshot was removed from Advanced; diagnostics use human line/width/spacing/support rows. |
| Wizard/Visual metadata gap | `fixed-task-336-19` | `TASK-336-19` | Divider controls now use `WidgetControlRow` metadata, and Wizard is narrowed to a read-only style summary while Visual owns daily label, line, width, color, and spacing. |
| Beginner-facing CSS/token authoring | `fixed-task-336-19` | `TASK-336-19` | Width, spacing, opacity, and thickness controls show friendly labels or saved-custom compatibility state instead of raw CSS values or token numbers. |

Additional closure notes:
- `8.1` remains `excluded` CMS/session scope.
- `_docs/_WIDGETS/tmp/divider/MATRIX.md` remains archived research reference; no new research pass was required to close the shipped Divider contract.

*Raport zakończony — 2026-05-16; closure refreshed — 2026-05-17; TASK-336-19 refreshed — 2026-05-25.*
