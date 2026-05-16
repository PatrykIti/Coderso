# RAPORT: Feature Grid Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #13 (Feature Grid Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko front:** http://localhost:3000
> **Strona testowa:** FeatureGridTest (`/featuregridtest`) — UUID: `98027d08-8164-43c7-9f27-3790cdc01ba9`

---

## 1. Przegląd widgetu

**Typ:** Composite
**Moduł:** Content
**Warianty:** `cards-3`, `cards-4`, `highlight-first`
**Maksymalna liczba kart:** 8
**Minimalna liczba kart:** 1

Feature Grid widget służy do prezentowania propozycji wartości, cech produktu lub usług w układzie kart. Każda karta może zawierać: ikonę lub obraz, tytuł, opis oraz przycisk CTA. Widget posiada nagłówek sekcji (eyebrow, title, description) oraz szerokie opcje stylistyczne.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Header** | `eyebrow`, `title`, `description` |
| **Karta (item)** | `id`, `icon` (emoji), `image` (URL), `title`, `description`, `ctaLabel`, `ctaHref` |
| **Styl** | `columns` (2/3/4), `gap` (none/sm/md/lg), `surfaceColor`, `borderColor`, `borderWidth` (0–3px), `radius` (none/md/lg/xl) |

### 2.2 Warianty

| Wariant | Opis | Liczba kart renderera | Grid (renderer) |
|---------|------|----------------------|-----------------|
| `cards-3` | Trzy karty balansowane | 3 | `sm:grid-cols-2 lg:grid-cols-3` |
| `cards-4` | Cztery karty | 4 | `sm:grid-cols-2 xl:grid-cols-4` |
| `highlight-first` | Pierwsza karta wyróżniona (col-span-2) | 4 | `grid-cols-1 md:grid-cols-3` |

### 2.3 Responsywność (CSS klasy)

| Kolumny token | Klasy Tailwind | Aktywny dla wariantu |
|---------------|----------------|----------------------|
| `2` | `sm:grid-cols-2` | — |
| `3` | `sm:grid-cols-2 lg:grid-cols-3` | cards-3 (hardcoded) |
| `4` | `sm:grid-cols-2 xl:grid-cols-4` | cards-4 (hardcoded) |

### 2.4 Tryby edytora

- **Wizard** — wariant, tytuł sekcji, opis, liczba kart, podstawowe etykiety kart
- **Visual** — pełny edytor: wariant/layout, header copy, karty (treść, ikona, obraz, CTA), kolory i obramowania
- **Advanced** — tokeny layoutu (columns/gap/borderWidth/radius), normalizacja, raw payload snapshot

---

## 3. Wyniki testów Playwright — Admin UI (localhost:5173)

### 3.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie cards-3 / cards-4 / highlight-first | ✓ Działa |
| Karta 1 wyróżniona w highlight-first (col-span-2, md:col-span-2) | ✓ Działa |
| Badge "Selected" / "Pick" w selectorze wariantów | ✓ Działa |
| Columns dropdown widoczny dla WSZYSTKICH wariantów (problem!) | ✗ BUG — patrz KOD-01 |
| Zmiana Columns na "2" dla cards-3 — BRAK efektu | ✗ Potwierdzone — KOD-01 |
| Zmiana Columns na "2" dla cards-4 — BRAK efektu | ✗ Potwierdzone — KOD-01 |
| Zmiana Columns dla highlight-first — BRAK efektu (hardcoded grid) | ✗ Potwierdzone — KOD-01 |

### 3.2 Synchronizacja liczby kart przy zmianie wariantu

| Test | Wynik |
|------|-------|
| Zmiana cards-3 → cards-4: renderer pokazuje 4, editor nadal 3 | ✗ BUG — KOD-02 |
| Zmiana wariantu na cards-4: 4. karta to fallback "Content workflows" | ✗ Potwierdzone — KOD-02 |
| Ustawienie 5 kart w edytorze przy cards-3: renderer pokazuje 3 | ✗ Potwierdzone — KOD-02 |
| "Normalize items to variant baseline" w Advanced naprawia rozbieżność | ✓ Działa |

### 3.3 Header sekcji

| Test | Wynik |
|------|-------|
| Eyebrow widoczny i edytowalny | ✓ Działa |
| Title i description sekcji | ✓ Działa |
| Header ukryty gdy wszystkie pola puste | ✓ Działa (conditional render) |

### 3.4 Karty

| Test | Wynik |
|------|-------|
| Dodawanie kart (przycisk "Add card") | ✓ Działa |
| Limit 8 kart (Add card disabled przy max) | ✓ Działa |
| Usuwanie kart (przycisk "Remove") | ✓ Działa — BEZ confirm dialog |
| Limit min 1 karty (Remove disabled przy 1) | ✓ Działa |
| Reorder (Move up / Move down) | ✓ Działa |
| Edycja tytułu | ✓ Działa |
| Edycja opisu | ✓ Działa |
| Edycja ikony (emoji input) | ✓ Działa (live update w preview) |
| Edycja Image URL — nieprawidłowy URL → broken image bez walidacji | ✗ BF-14 potwierdzone |
| CTA label i CTA URL | ✓ Działa |
| javascript: URL w CTA — blokowane przez XSS protection | ✓ Działa |
| Brak CTA gdy URL zablokowany — użytkownik NIE dostaje info | ✗ UX problem |
| Obraz zastępuje ikonę gdy oba wypełnione | ✓ Działa |
| Fallback placeholder (kreskowa linia) gdy brak ikony i obrazu | ✓ Działa |

### 3.5 Style — Colors and Borders

| Test | Wynik |
|------|-------|
| Gap: None / Compact / Default / Spacious | ✓ Działa |
| Border width (0px / 1px / 2px / 3px) | ✓ Działa |
| Border radius (none / md / lg / xl) | ✓ Działa |
| Card background color (picker + text input) | ✓ Działa |
| Clear surfaceColor | ✓ Działa (Clear button aktywny/disabled) |
| Card border color (picker + text input) | ✓ Działa |
| Clear dla borderColor — BRAK przycisku Clear | ✗ UX-08 potwierdzone |

### 3.6 Wizard editor

| Test | Wynik |
|------|-------|
| Wariant selector (Select dropdown) | ✓ Działa |
| Section title i description | ✓ Działa |
| Cards count selector | ✓ Działa |
| Basic card labels (tylko tytuł — bez opisu/ikony/CTA) | ✓ Działa |
| "Continue to layout and styling" → przejście do Visual | ✓ Działa |
| Brak info że Wizard ogranicza edycję kart | ✗ UX-05 potwierdzone |

### 3.7 Advanced editor

| Test | Wynik |
|------|-------|
| Layout tokens (columns/gap/borderWidth/radius) — duplikaty z Visual | ✗ UX-09 potwierdzone |
| "Normalize items to variant baseline" | ✓ Działa |
| "Normalize full payload" | ✓ Działa |
| Raw payload snapshot (pre z JSON) | ✓ Działa |

---

## 4. Wyniki testów Playwright — Frontend (localhost:3000)

### 4.1 Tabela porównawcza Admin ↔ Frontend

| Test | Admin | Front | Zgodność |
|------|-------|-------|----------|
| Renderowanie wariantu cards-3 | ✓ | ✓ | ✓ Zgodne |
| Renderowanie wariantu cards-4 | ✓ | ✓ | ✓ Zgodne |
| Renderowanie highlight-first | ✓ | ✓ | ✓ Zgodne |
| Ikony emoji w kartach | ✓ | ✓ | ✓ Zgodne |
| Broken image przy invalid URL | ✓ | ✓ | ✓ Zgodne (oba pokazują broken) |
| CTA linki klikalne | ✓ | ✓ | ✓ Zgodne |
| Responsywność mobilna (grid-cols-1 < sm) | ✓ | ✓ | ✓ Zgodne |
| Header sekcji visible/hidden | ✓ | ✓ | ✓ Zgodne |
| CSS klasy gridu identyczne | ✓ | ✓ | ✓ Zgodne |

### 4.2 Zweryfikowane klasy CSS na froncie

| Wariant | Grid class (zweryfikowana) |
|---------|---------------------------|
| cards-3 | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7` |
| cards-4 | `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-7` |
| highlight-first | `grid grid-cols-1 md:grid-cols-3 gap-7` |

### 4.3 Spostrzeżenia z testów frontend

- **cards-4 na md/lg (768–1279px):** Wyświetla 2 kolumny (`sm:grid-cols-2`), dopiero od `xl:` (1280px) pokazuje 4. Na laptopie 1024px grid wygląda jak cards-2, co jest mylące dla wariantu nazwanego "Cards 4".
- **Brak rel="noopener noreferrer":** Zewnętrzne linki CTA (http://...) nie mają żadnego atrybutu `rel`. Potwierdzone na froncie.
- **Ikony emoji bez aria-hidden:** Czytniki ekranu będą odczytywać "Rocket sign emoji" itp. Potwierdzone na froncie.
- **Hierarchia nagłówków:** Na testowej stronie brak H1/H2 — widget zaczyna od H3 (sekcja) → H4 (karty). Problem hierarchii.

---

## 5. Znalezione błędy i problemy UX

### 5.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Columns dropdown aktywny ale bez efektu dla cards-3, cards-4, highlight-first
**Priorytet:** Wysoki
**Opis:** Dropdown "Columns" (2/3/4 columns) jest widoczny i aktywny w Visual editorze dla WSZYSTKICH wariantów, ale zmiana wartości nie ma żadnego efektu — renderer ignoruje token `columns` dla wszystkich trzech wariantów. Dla cards-3 hardcodowane "3", dla cards-4 hardcodowane "4", dla highlight-first hardcoded `md:grid-cols-3`. Użytkownik zmienia dropdown i nic się nie dzieje w preview — kompletnie mylące zachowanie.
**Lokalizacja:** `featureGrid.tsx:327-332`, `FeatureGridEditors.tsx:446-467`
**Repro:** Visual editor → zmień Columns na "2" → renderer nie reaguje (data-feature-grid-columns nadal "3"/"4")

#### BUG-02 — Editor pokazuje więcej kart niż renderer przy zmianie wariantu
**Priorytet:** Wysoki
**Opis:** Po zmianie wariantu, liczba kart w edytorze NIE synchronizuje się z oczekiwaną liczbą wariantu. Przykład: masz 3 karty (cards-3) → zmiana na cards-4 → renderer pokazuje 4 (4. karta to fallback "Content workflows"), ale editor nadal pokazuje 3 karty do edycji. Odwrotnie: ustawisz 5 kart → zmiana na cards-3 → renderer pokazuje 3 ale editor wyświetla 5.
**Lokalizacja:** `FeatureGridEditors.tsx:444`, `featureGrid.tsx:323`
**Skutek:** Użytkownik edytuje "niewidoczne" karty (nie pojawiają się w preview), lub nie widzi karty która jest faktycznie renderowana (auto-generowany fallback)

#### BUG-03 — Brak walidacji Image URL — broken image bez ostrzeżenia
**Priorytet:** Średni
**Opis:** Pole "Image URL" przyjmuje dowolny tekst bez walidacji. Wpisanie "not-a-valid-url" powoduje wyświetlenie broken image zarówno w admin preview jak i na froncie. Brak komunikatu błędu lub walidacji formatu URL.
**Lokalizacja:** `FeatureGridEditors.tsx:619-628`, `featureGrid.tsx:410-418`

#### BUG-04 — Brak Clear dla borderColor (asymetria z surfaceColor)
**Priorytet:** Niski
**Opis:** Pole `surfaceColor` ma przycisk Clear (przez `ClearableFieldHeader`), ale `borderColor` go nie ma — mimo że semantycznie oba pola powinny być symetrycznie clearable. Użytkownik nie może przywrócić domyślnego `var(--color-border)` bez ręcznego wpisania wartości.
**Lokalizacja:** `FeatureGridEditors.tsx:668-684`

#### BUG-05 — cards-4 pokazuje 2 kolumny na laptopach 768–1279px
**Priorytet:** Średni
**Opis:** Wariant `cards-4` używa klasy `xl:grid-cols-4`, co oznacza 4 kolumny dopiero od 1280px. Na standardowych laptopach (1024px, 1280px bez marginesu) wyświetla się 2 kolumny (`sm:grid-cols-2`). Użytkownik wybierający "Cards 4" oczekuje 4 kolumn, a dostaje 2 na większości urządzeń desktop. Wariant cards-3 idzie do `lg:grid-cols-3` (1024px) — konsekwentnie niższy próg.
**Lokalizacja:** `featureGrid.tsx:65` (`"4": "sm:grid-cols-2 xl:grid-cols-4"`)

---

### 5.2 Problemy UX edytora

#### UX-01 — Kolumny dropdown widoczny ale bezużyteczny dla wszystkich wariantów
**Opis:** Związane z BUG-01. Kontrolka dezorientuje użytkownika — wydaje się aktywna, ale nie ma żadnego efektu. Brak jakiegokolwiek feedbacku (tooltip, disabled state, komunikat).
**Rekomendacja:** Ukryć lub disabled Columns dropdown dla cards-3 i cards-4, dodać notatkę wyjaśniającą że kolumny są określone przez wariant.

#### UX-02 — Brak wizualnego podglądu wariantów w selectorze
**Opis:** Selector wariantów to lista przycisków z opisem tekstowym. Nie ma miniatury/ilustracji pokazującej jak dany wariant wygląda. Szczególnie problem dla `highlight-first` — użytkownik musi kliknąć żeby zobaczyć jak wygląda wyróżniona pierwsza karta.
**Rekomendacja:** Dodać ASCII/SVG miniaturę layoutu przy każdym wariancie.

#### UX-03 — Move up/down zamiast drag-and-drop
**Opis:** Reorder kart przez kliknięcia Move up/Move down jest uciążliwy. Dla 8 kart (max) i reorderu z pozycji 1 na 8 potrzeba 7 kliknięć. Brak drag-and-drop handlera.
**Rekomendacja:** Dodać drag-and-drop handle (ikona ⋮⋮) na każdej karcie.

#### UX-04 — Wizard nie synchronizuje liczby kart z wybranym wariantem
**Opis:** Zmiana wariantu w Wizard dropdown nie ustawia automatycznie liczby kart do baseline wariantu. Użytkownik może wybrać "Cards 4" ale nadal ma 3 karty.
**Rekomendacja:** Po zmianie wariantu w Wizard → auto-set `Cards count` do baseline wariantu.

#### UX-05 — Wizard ogranicza edycję kart bez informowania użytkownika
**Opis:** Wizard editor pozwala edytować tylko tytuły kart, bez dostępu do opisu, ikony, obrazu, CTA. Brak jakiegokolwiek komunikatu że pozostałe opcje są w zakładce "Visual".
**Rekomendacja:** Dodać informację na dole Wizard: "Więcej opcji kart dostępne w zakładce Visual".

#### UX-06 — Remove karta — natychmiastowe usunięcie bez undo/confirm
**Opis:** Kliknięcie "Remove" natychmiast usuwa kartę bez dialogu potwierdzenia ani możliwości cofnięcia. Brak undo toast.
**Rekomendacja:** Dodać dialog confirm lub toast "Karta usunięta [Cofnij]" (2 sek).

#### UX-07 — Pola Icon i Image URL bez wyjaśnienia priorytetu
**Opis:** Icon i Image URL są obok siebie bez informacji że Image URL ma priorytet (gdy oba wypełnione, ikona jest ignorowana). Użytkownik może nie rozumieć dlaczego jego emoji nie wyświetla się.
**Rekomendacja:** Tooltip lub nota: "Image URL zastępuje ikonę gdy oba są wypełnione".

#### UX-08 — Brak feedbacku gdy CTA URL jest zablokowany przez XSS filter
**Opis:** Wpisanie `javascript:alert(1)` do CTA URL powoduje że link znika z preview bez żadnego komunikatu. Użytkownik nie wie dlaczego link nie działa.
**Rekomendacja:** Pokazać inline error: "Niedozwolony format URL" gdy wartość jest blokowana.

#### UX-09 — Advanced editor duplikuje tokeny z Visual
**Opis:** Advanced editor zawiera te same kontrolki (columns/gap/borderWidth/radius) co Visual editor. Różnica nie jest wyjaśniona. Użytkownik nie wie po co istnieją dwie kopie tych samych kontrolek.
**Rekomendacja:** Przenieść duplikaty z Advanced lub dodać wyraźną dokumentację w UI rozróżniającą konteksty.

#### UX-10 — Editor startuje zawsze od Wizard (jednorazowo)
**Opis:** Każde nowe kliknięcie w widget otwiera edytor od ostatniej aktywnej zakładki (co jest dobre), ale pierwszy raz zawsze zaczyna od Wizard. Wizard wymaga kliknięcia "Continue to layout and styling" żeby przejść do Visual — dodatkowy krok przy podstawowym flow.
**Rekomendacja:** Rozważyć czy Wizard jest potrzebny jako default, gdy Visual jest kompletny i intuicyjny.

---

## 6. Analiza kodu — dodatkowe problemy z logiki

### KOD-01 — Columns token ignorowany dla WSZYSTKICH wariantów
**Priorytet:** Wysoki
**Opis:** W rendererze `FeatureGridBlock` wartość `style.columns` jest ignorowana dla wszystkich wariantów:
- `cards-3`: hardcoded "3"
- `cards-4`: hardcoded "4"
- `highlight-first`: hardcoded `md:grid-cols-3`

Token `columns` w danych (`style.columns`) jest zapisywany ale nigdy używany przez renderer.
**Lokalizacja:** `featureGrid.tsx:327-347`

```tsx
// cards-3 i cards-4 ignorują style.columns:
const resolvedColumns = resolvedVariant === "cards-3" ? "3" : resolvedVariant === "cards-4" ? "4"
  : resolveFeatureGridColumns(style.columns, variantDefaultColumnsMap[resolvedVariant]);

// highlight-first ignoruje resolvedColumns bo używa hardcoded grid:
const gridClassName = resolvedVariant === "highlight-first"
  ? joinClasses("grid grid-cols-1 md:grid-cols-3", gapClassMap[resolvedGap])  // HARDCODED
  : joinClasses("grid grid-cols-1", columnsClassMap[resolvedColumns], gapClassMap[resolvedGap]);
```

### KOD-02 — Brak synchronizacji liczby kart przy zmianie wariantu w edytorze
**Priorytet:** Wysoki
**Opis:** `onVariantChange` callback zmienia wariant ale nie wywołuje `setItemsCount`. Renderer używa `visibleItemCount` z wariantu (np. 3 dla cards-3), ale editor pokazuje aktualną liczbę kart z danych. Powstaje rozbieżność: edytor pokazuje N kart, renderer pokazuje M kart.
**Lokalizacja:** `FeatureGridEditors.tsx:444`

### KOD-03, KOD-04, KOD-05 — Niekonsekwentna logika resolver functions
**Priorytet:** Niski
**Opis:** Funkcje resolve nie sprawdzają wartości domyślnych explicite:
- `resolveFeatureGridGap`: sprawdza "none", "sm", "lg" — nie "md" (domyślna)
- `resolveFeatureGridBorderWidth`: sprawdza "0", "2", "3" — nie "1" (domyślna)
- `resolveFeatureGridRadius`: sprawdza "none", "md", "xl" — nie "lg" (domyślna)

Wszystkie trafiają do fallback który zwraca domyślną wartość, więc działają poprawnie — ale kod jest nieczytelny i podatny na regresję.
**Lokalizacja:** `featureGrid.tsx:266-279`

---

## 7. Braki funkcjonalne

### BF-01 — Brak kontroli wyrównania tekstu w kartach
**Opis:** Brak opcji wyrównania tekstu (left/center/right) wewnątrz kart. Wszystkie treści wyrównane do lewej. Wycentrowany tekst jest standardem dla kart z ikonami (np. icon-centered layout).

### BF-02 — Brak wariantu z pełnowymiarową kartą na górze
**Opis:** `highlight-first` rozszerza kartę poziomo (2 kolumny). Brak wariantu "hero card above grid" — jedna duża karta full-width na górze + siatka mniejszych pod nią.

### BF-03 — Brak kontroli paddingu wewnętrznego kart
**Opis:** Padding `p-4` (16px) hardcoded. Brak opcji compact/default/spacious dla gęstości treści wewnątrz karty.

### BF-04 — Brak kontroli rozmiaru ikony i obrazu
**Opis:** Ikona hardcoded `h-10 w-10` (40px), obraz `h-40` (160px). Brak możliwości dostosowania rozmiarów przez edytor.

### BF-05 — Brak wariantu z poziomym układem (horizontal card)
**Opis:** Każda karta ma układ pionowy (ikona/obraz → tytuł → opis → CTA). Popularny wzorzec "ikona po lewej | tekst po prawej" nie jest obsługiwany.

### BF-06 — Brak kontroli typografii nagłówka sekcji
**Opis:** Tytuł sekcji hardcoded `text-2xl font-semibold`, wyrównanie zawsze centered. Brak kontroli rozmiaru fontu i wyrównania dla nagłówka sekcji.

### BF-07 — Brak kontroli typografii tytułu karty
**Opis:** Tytuł karty hardcoded `text-lg font-semibold`. Brak kontroli rozmiaru.

### BF-08 — Brak toggle "Enable CTA"
**Opis:** Wyłączenie CTA per karta wymaga wyczyszczenia obu pól (ctaLabel + ctaHref). Brak wyraźnego toggle "Enable CTA link". Nieintuicyjny przepływ.

### BF-09 — Brak tła sekcji (section background color)
**Opis:** `surfaceColor` steruje tłem kart, ale brak kontroli tła całej sekcji widgetu (obszaru za gridem).

### BF-10 — Brak link target i rel dla CTA
**Opis:** Linki CTA nie mają opcji `target="_blank"`. Zewnętrzne linki nie mają `rel="noopener noreferrer"` — problem bezpieczeństwa (potwierdzone na froncie).

### BF-11 — Brak efektów hover na kartach
**Opis:** Karty nie mają interaktywnych efektów hover (shadow, scale, border-color transition). Jedynym interaktywnym elementem jest link CTA z `hover:border-[var(--color-primary)]`.

### BF-12 — Brak kontroli max-width kontenera
**Opis:** `max-w-6xl` (72rem) hardcoded. Brak opcji zawężenia lub poszerzenia kontenera widgetu.

### BF-13 — Brak rich text w description kart
**Opis:** Pole description karty renderowane jako plain text. Brak bold, italic, linków inline.

### BF-14 — Brak walidacji Image URL
**Opis:** Pole Image URL przyjmuje dowolny tekst bez walidacji. Broken image pojawia się zarówno w admin preview jak i na froncie. (Potwierdzone w testach).

### BF-15 — Brak emoji pickera dla pola Icon
**Opis:** Pole Icon to plain text input. Użytkownik musi znać i wkleić kod emoji. Brak emoji selectora.

### BF-16 — Brak integracji z media library dla obrazów kart
**Opis:** Pole Image URL to zwykły input URL. Brak przycisku "Pick from library" (dostępnego np. w Hero widget dla mediów). Użytkownik musi ręcznie kopiować URL.

---

## 8. Problemy dostępności

| # | Problem | Zweryfikowane | Standard | Priorytet |
|---|---------|--------------|----------|-----------|
| A1 | CTA link bez `rel="noopener noreferrer"` dla http URLs | ✓ Playwright | Bezpieczeństwo | Wysoki |
| A2 | Brak pola alt text dla obrazów kart | ✓ Kod | WCAG 1.1.1 | Wysoki |
| A3 | Ikona emoji w `<span>` bez `aria-hidden` | ✓ Playwright | WCAG 4.1.2 | Średni |
| A4 | Nagłówek sekcji `<h3>` bez uwzględnienia hierarchii strony | ✓ Playwright | WCAG 1.3.1 | Średni |
| A5 | Tytuł karty `<h4>` — może być niezgodny z kontekstem nagłówków | ✓ Playwright | WCAG 1.3.1 | Średni |
| A6 | Brak `loading="lazy"` na obrazach kart | ✓ Kod | Performance | Niski |
| A7 | Brak `target="_blank"` opcji + brak rel dla zewnętrznych linków | ✓ Playwright | Bezpieczeństwo | Wysoki |

---

## 9. Tabela podsumowania — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-01 | Columns dropdown bez efektu dla WSZYSTKICH wariantów | Visual editor |
| BUG-02 | Rozbieżność liczby kart: editor vs renderer | Editor + Renderer |
| BUG-05 | cards-4 shows 2 columns do 1280px | CSS / Tailwind |

### Pilne błędy UX / bezpieczeństwo

| ID | Opis | Obszar |
|----|------|--------|
| BUG-03 | Brak walidacji Image URL | Editor |
| BUG-04 | Brak Clear dla borderColor | Editor UI |
| A1/A7 | Brak rel="noopener noreferrer" + brak target dla zewnętrznych linków CTA | Renderer |
| A2 | Brak pola alt text dla obrazów | Editor + Renderer |
| A3 | Ikony emoji bez aria-hidden | Renderer |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-01 | Disabled/ukryty Columns dropdown dla cards-3 i cards-4 |
| UX-02 | Wizualny podgląd wariantów w selectorze |
| UX-03 | Drag-and-drop reorder kart |
| UX-06 | Confirm/undo przy usuwaniu karty |
| UX-08 | Feedback gdy CTA URL zablokowany przez XSS filter |

### Braki funkcjonalne (priorytet)

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-16 | Wysoki | Integracja z media library dla obrazów |
| BF-15 | Wysoki | Emoji picker dla ikony |
| BF-10 | Wysoki | Link target + rel dla CTA |
| BF-01 | Wysoki | Wyrównanie tekstu w kartach |
| BF-05 | Wysoki | Horizontal card variant |
| BF-14 | Wysoki | Walidacja Image URL |
| BF-09 | Średni | Tło sekcji (section background) |
| BF-08 | Średni | Toggle "Enable CTA" per karta |
| BF-06 | Średni | Kontrola typografii nagłówka sekcji |
| BF-11 | Średni | Efekty hover na kartach |
| BF-12 | Średni | Kontrola max-width kontenera |
| BF-03 | Niski | Padding wewnętrzny kart |
| BF-04 | Niski | Rozmiar ikony/obrazu |
| BF-13 | Niski | Rich text w description |
| BF-02 | Niski | Wariant hero-card-above-grid |

---

## 10. Zgodność Admin Preview ↔ Frontend

> **Wniosek: Admin preview i frontend są ZGODNE.** Widget renderuje identycznie w obu środowiskach — klasy CSS, struktura HTML, dane atrybuty, warianty. Nie znaleziono rozbieżności w renderowaniu.

**Nota:** Podczas testów wystąpiły 401 Unauthorized na API publish/save po wygaśnięciu sesji. Wymagało re-logowania przed każdą próbą zapisu. Jest to problem infrastrukturalny (krótki TTL sesji lub issue z session management), nie błąd widgetu.

---

## 11. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 5 |
| Problemy UX edytora | 10 |
| Problemy kodu (logika) | 5 |
| Braki funkcjonalne | 16 |
| Problemy dostępności | 7 |
| **Łącznie** | **43** |

---

## 12. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `fg-01-new-page.png` | Nowa strona testowa FeatureGridTest |
| `fg-02-wizard-editor.png` | Wizard editor — domyślny widok |
| `fg-03-visual-editor.png` | Visual editor po "Continue to layout" |
| `fg-04-cards4-variant.png` | Zmiana na cards-4: editor 3 karty, renderer 4 |
| `fg-05-columns-no-effect.png` | Columns "2" nie ma efektu dla cards-4 |
| `fg-06-highlight-first.png` | highlight-first w admin preview |
| `fg-07-invalid-image-url.png` | Broken image przy nieprawidłowym URL |
| `fg-08-advanced-editor.png` | Advanced editor z duplikatami tokenów |
| `fg-09-5-cards-in-editor-3-in-preview.png` | 5 kart w edytorze, 3 w preview (KOD-02) |
| `fg-10-visual-editor-full.png` | Pełny widok Visual editor |
| `fg-12-page-published.png` | Strona opublikowana pomyślnie |
| `fg-14-frontend-with-widget.png` | Frontend z widgetem — cards-3 |
| `fg-15-mobile-view.png` | Mobile view (375px) — 1 kolumna |
| `fg-16-desktop-frontend.png` | Desktop frontend — cards-3 |
| `fg-17-highlight-first-admin.png` | highlight-first w admin |
| `fg-18-highlight-first-frontend.png` | highlight-first na froncie |
| `fg-19-external-cta-no-rel.png` | Zewnętrzny CTA bez rel="noopener" |
| `fg-20-cards4-frontend.png` | cards-4 na froncie (desktop) |
| `fg-21-cards4-1024px.png` | cards-4 na 1024px — tylko 2 kolumny |

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*
