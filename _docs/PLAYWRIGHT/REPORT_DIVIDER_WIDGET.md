# RAPORT: Divider Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku  
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

*(Sekcja uzupełniana po testach przeglądarkowych)*

---

## 5. Testy na froncie (localhost:3000)

*(Sekcja uzupełniana po testach przeglądarkowych)*

---

## 6. Porównanie Admin Preview vs Frontend

*(Sekcja uzupełniana po testach przeglądarkowych)*

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

*Raport w toku — sekcje 4–6 uzupełniane po testach Playwright.*
