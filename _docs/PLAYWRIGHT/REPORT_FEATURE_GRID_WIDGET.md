# RAPORT: Feature Grid Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W trakcie  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #13 (Feature Grid Widget)  
> **Środowisko admin:** http://localhost:5173/admin  
> **Środowisko front:** http://localhost:3000  
> **Strona testowa:** FeatureGridTestPage (oddzielna strona testowa)

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

| Wariant | Opis | Liczba kart | Kolumny |
|---------|------|-------------|---------|
| `cards-3` | Trzy kart balansowane | 3 | 3 (hardcoded) |
| `cards-4` | Cztery karty | 4 | 4 (hardcoded) |
| `highlight-first` | Pierwsza karta wyróżniona (2 kolumny) | 4 | md:grid-cols-3 |

### 2.3 Responsywność (CSS klasy)

| Kolumny | Klasy Tailwind |
|---------|----------------|
| 2 | `sm:grid-cols-2` |
| 3 | `sm:grid-cols-2 lg:grid-cols-3` |
| 4 | `sm:grid-cols-2 xl:grid-cols-4` |

### 2.4 Tryby edytora

- **Wizard** — wariant, tytuł sekcji, opis, liczba kart, podstawowe etykiety kart
- **Visual** — pełny edytor: wariant/layout, header copy, karty (treść, ikona, obraz, CTA), kolory i obramowania
- **Advanced** — tokeny layoutu (columns/gap/borderWidth/radius), normalizacja, raw payload snapshot

---

## 3. Wyniki testów Playwright — Admin UI (localhost:5173)

> *Sekcja uzupełniana po testach Playwright*

### 3.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie cards-3 / cards-4 / highlight-first | ⏳ |
| Karta 1 wyróżniona w highlight-first (col-span-2) | ⏳ |
| Liczba kart zmienia się automatycznie przy zmianie wariantu | ⏳ |
| Aktywny wariant oznaczony badge "Selected" | ⏳ |

### 3.2 Header sekcji

| Test | Wynik |
|------|-------|
| Eyebrow widoczny i edytowalny | ⏳ |
| Title i description sekcji | ⏳ |
| Header ukryty gdy wszystkie pola puste | ⏳ |

### 3.3 Karty

| Test | Wynik |
|------|-------|
| Dodawanie kart (do max 8) | ⏳ |
| Usuwanie kart (min 1) | ⏳ |
| Reorder (Move up / Move down) | ⏳ |
| Edycja tytułu, opisu, ikony, image URL | ⏳ |
| CTA label + CTA URL | ⏳ |
| Ikona zastępowana obrazem gdy obydwa wypełnione | ⏳ |
| Fallback placeholder (kreskowa linia) gdy brak ikony i obrazu | ⏳ |

### 3.4 Style

| Test | Wynik |
|------|-------|
| Gap: None / Compact / Default / Spacious | ⏳ |
| Columns token (2/3/4) | ⏳ |
| Border width (0–3px) | ⏳ |
| Border radius (none/md/lg/xl) | ⏳ |
| Card background color (picker + CSS var) | ⏳ |
| Card border color (picker + CSS var) | ⏳ |
| Clear surfaceColor | ⏳ |

### 3.5 Wizard

| Test | Wynik |
|------|-------|
| Wariant selector (Select dropdown) | ⏳ |
| Section title i description | ⏳ |
| Cards count selector | ⏳ |
| Basic card labels (tylko title) | ⏳ |

### 3.6 Advanced

| Test | Wynik |
|------|-------|
| Layout tokens (columns/gap/borderWidth/radius) | ⏳ |
| "Normalize items to variant baseline" | ⏳ |
| "Normalize full payload" | ⏳ |
| Raw payload snapshot | ⏳ |

---

## 4. Wyniki testów Playwright — Frontend (localhost:3000)

> *Sekcja uzupełniana po testach Playwright*

| Test | Admin | Front | Zgodność |
|------|-------|-------|----------|
| Renderowanie wariantu cards-3 | ⏳ | ⏳ | ⏳ |
| Renderowanie wariantu cards-4 | ⏳ | ⏳ | ⏳ |
| Renderowanie highlight-first | ⏳ | ⏳ | ⏳ |
| Ikony emoji w kartach | ⏳ | ⏳ | ⏳ |
| Obrazy w kartach | ⏳ | ⏳ | ⏳ |
| CTA linki klikalny | ⏳ | ⏳ | ⏳ |
| Responsywność mobilna | ⏳ | ⏳ | ⏳ |

---

## 5. Znalezione błędy i problemy UX

> *Sekcja uzupełniana po testach Playwright*

### 5.1 Błędy funkcjonalne (Bugs)

*(Do uzupełnienia)*

### 5.2 Problemy UX edytora

*(Do uzupełnienia)*

---

## 6. Analiza kodu — zidentyfikowane problemy przed testami

### 6.1 Potencjalne problemy z logiki kodu

#### KOD-01 — Columns token ignorowany dla cards-3 i cards-4
**Priorytet:** Wysoki  
**Opis:** W rendererze `FeatureGridBlock` wartość `style.columns` jest ignorowana dla wariantów `cards-3` i `cards-4` — hardcoded do "3" i "4" odpowiednio. Tylko `highlight-first` respektuje token `columns`. Kontrolka "Columns" w Visual editorze jest zatem myląca — zmiana kolumn nie ma efektu dla dwóch z trzech wariantów.  
**Lokalizacja:** `featureGrid.tsx:327-332`  

```tsx
const resolvedColumns =
  resolvedVariant === "cards-3"
    ? "3"
    : resolvedVariant === "cards-4"
      ? "4"
      : resolveFeatureGridColumns(style.columns, variantDefaultColumnsMap[resolvedVariant]);
```

#### KOD-02 — Brak synchronizacji liczby kart przy zmianie wariantu
**Priorytet:** Wysoki  
**Opis:** Zmiana wariantu w edytorze nie aktualizuje automatycznie liczby kart do baseline wariantu. `featureGridVariantItemCountMap` definiuje oczekiwane liczby (3/4/4) ale editor `onVariantChange` nie wywołuje `setItemsCount`. Użytkownik może mieć 8 kart przy przełączeniu na `cards-3` — renderer wyrenderuje tylko 3 ale edytor nadal pokazuje 8 kart do edycji.  
**Lokalizacja:** `FeatureGridEditors.tsx:444`, `featureGrid.tsx:323`

#### KOD-03 — `resolveFeatureGridGap` nie obługuje wartości "md"
**Priorytet:** Niski  
**Opis:** Funkcja `resolveFeatureGridGap` sprawdza tylko "none", "sm", "lg" — nie "md", które jest wartością domyślną. "md" trafia do fallback `return "md"` co działa poprawnie, ale jest nieczytelne i podatne na błędy refactoringu.  
**Lokalizacja:** `featureGrid.tsx:266-269`

#### KOD-04 — `resolveFeatureGridBorderWidth` nie obsługuje wartości "1"
**Priorytet:** Niski  
**Opis:** Analogicznie do KOD-03, funkcja sprawdza "0", "2", "3" ale nie "1" (domyślna). "1" trafia do fallback. Niekonsekwentna logika.  
**Lokalizacja:** `featureGrid.tsx:271-274`

#### KOD-05 — `resolveFeatureGridRadius` nie obsługuje wartości "lg"
**Priorytet:** Niski  
**Opis:** Analogicznie — sprawdza "none", "md", "xl" ale nie "lg" (domyślna).  
**Lokalizacja:** `featureGrid.tsx:276-279`

---

## 7. Braki funkcjonalne (analiza kodu)

### BF-01 — Brak kontroli wyrównania tekstu w kartach
**Opis:** Nie ma opcji wyrównania tekstu (left/center/right) wewnątrz kart. Wszystkie treści są wyrównane do lewej. Wiele designów wymaga wycentrowanego tekstu w kartach (szczególnie dla ikony nad tytułem).

### BF-02 — Brak wariantu z większą kartą "featured" na górze
**Opis:** Wariant `highlight-first` rozszerza pierwszą kartę poziomo (2 kolumny), ale brak wariantu z jedną dużą kartą na górze (full-width) i siatką pod nią.

### BF-03 — Brak padding wewnątrz karty (inner spacing)
**Opis:** Padding karty jest hardcoded do `p-4` (16px). Brak kontroli gęstości wewnętrznej karty (compact/default/spacious). Dla bardziej złożonych treści może być zbyt mały.

### BF-04 — Brak kontroli rozmiaru ikony/obrazu
**Opis:** Ikona ma stały rozmiar `h-10 w-10`. Obraz ma stałą wysokość `h-40`. Brak możliwości zmiany rozmiaru przez edytor.

### BF-05 — Brak wariantu z poziomym układem kart (horizontal card)
**Opis:** Każda karta ma układ pionowy (ikona/obraz → tytuł → opis → CTA). Brak możliwości poziomego układu (ikona | tekst) — popularny wzorzec dla feature lists.

### BF-06 — Brak kontroli typografii sekcji header
**Opis:** Brak kontroli rozmiaru fontów nagłówka sekcji (h3 hardcoded do `text-2xl`), ani wyrównania (zawsze centered).

### BF-07 — Brak kontroli typografii tytułu karty
**Opis:** Tytuł karty zawsze `text-lg font-semibold`. Brak możliwości zmiany rozmiaru.

### BF-08 — Brak możliwości wyłączenia CTA tylko na niektórych kartach
**Opis:** CTA jest opcjonalne per karta (warunkowe renderowanie gdy ctaLabel+ctaHref niepuste), ale brak wyraźnego toggle "Enable CTA" — użytkownik musi wyczyścić oba pola. Nieintuicyjny UX.

### BF-09 — Brak tła sekcji (section background)
**Opis:** Widget kontroluje tylko tło kart (`surfaceColor`). Brak kontroli tła całej sekcji otaczającej grid.

### BF-10 — Brak link target (_blank) dla CTA
**Opis:** Link CTA nie ma opcji otwierania w nowej karcie (`target="_blank"`). Brakuje też `rel="noopener noreferrer"` dla zewnętrznych linków.

### BF-11 — Brak animacji hover na kartach
**Opis:** Karty nie mają efektów hover (shadow, transform, border-color transition) poza linkiem CTA. Brak kontroli efektów interaktywnych.

### BF-12 — Brak możliwości ustawienia max-width widgetu
**Opis:** `max-w-6xl` hardcoded. Brak kontroli maksymalnej szerokości kontenera.

### BF-13 — Brak obsługi rich text w description
**Opis:** Pole description karty to plain text w `<p>`. Brak możliwości użycia bold, italic, link.

### BF-14 — Brak walidacji URL obrazu
**Opis:** Pole "Image URL" nie ma walidacji formatu URL. Użytkownik może wpisać dowolny tekst, co spowoduje broken image.

### BF-15 — Brak emoji pickera dla pola Icon
**Opis:** Pole Icon to zwykły input tekstowy. Użytkownik musi znać kod emoji. Brak emoji selectora/pickera.

### BF-16 — Brak integracji z media library dla obrazów kart
**Opis:** Pole Image URL przyjmuje tylko zewnętrzny URL. Brak przycisku "Pick from library" analogicznego do Hero widget.

---

## 8. Problemy UX edytora (analiza kodu)

### UX-01 — Kontrolka "Columns" myląca dla cards-3 i cards-4
**Opis:** Visual editor pokazuje dropdown "Columns" (2/3/4) który nie ma efektu dla wariantów cards-3 i cards-4. Użytkownik zmienia kolumny i nic się nie dzieje — frustrujące i dezorientujące.  
**Rekomendacja:** Ukryć lub disabled kontrolkę Columns gdy aktywny wariant to cards-3 lub cards-4.

### UX-02 — Brak info jak zachowuje się highlight-first
**Opis:** Wariant `highlight-first` nie ma wizualnego podglądu w selectorze wariantów. Użytkownik nie wie jak pierwsza karta będzie wyróżniona dopóki nie przełączy i nie zobaczy preview.  
**Rekomendacja:** Dodać miniaturę/preview wariantu w selectorze.

### UX-03 — Move up/down przyciski zamiast drag-and-drop
**Opis:** Reorder kart odbywa się przez przyciski "Move up" / "Move down" zamiast drag-and-drop. Przy 8 kartach zmiana kolejności jest uciążliwa (wiele kliknięć).  
**Rekomendacja:** Dodać drag-and-drop handle na kartach.

### UX-04 — Wizard nie synchronizuje liczby kart z wariantem
**Opis:** W Wizard editorze po zmianie wariantu przez Select, liczba kart nie aktualizuje się automatycznie do baseline wariantu.  
**Rekomendacja:** Po zmianie wariantu automatycznie ustawić liczbę kart zgodną z tym wariantem.

### UX-05 — Brak etykiet sekcji w Wizard (tylko basic labels)
**Opis:** Wizard editor nie pozwala na edycję opisu, ikony, obrazu ani CTA kart — jedynie tytuł. Użytkownik musi przejść do Visual żeby uzupełnić resztę. Brak komunikatu o tym ograniczeniu.  
**Rekomendacja:** Dodać notatkę w Wizard: "Szczegóły kart (ikona, opis, CTA) dostępne w edytorze Visual."

### UX-06 — Brak potwierdzenia przy usuwaniu karty
**Opis:** Przycisk "Remove" usuwa kartę natychmiast bez dialogu potwierdzenia. Brak możliwości cofnięcia.  
**Rekomendacja:** Confirm dialog lub krótki undo toast.

### UX-07 — Icon i Image URL w jednym rzędzie bez wyjaśnienia priorytetu
**Opis:** Pola Icon i Image URL są w edytorze obok siebie bez informacji że Image URL ma wyższy priorytet i zastępuje ikonę gdy oba są wypełnione.  
**Rekomendacja:** Dodać tooltip lub notatkę: "Jeśli wypełniony Image URL — ikona jest ignorowana."

### UX-08 — ClearableFieldHeader dla surfaceColor ale nie dla borderColor
**Opis:** Pole "Card background" ma przycisk Clear (przez `ClearableFieldHeader`), ale "Card border color" go nie ma — mimo że oba to pola stylowe które powinny być symetrycznie clearable.  
**Lokalizacja:** `FeatureGridEditors.tsx:668-684`

### UX-09 — Advanced powtarza tokeny z Visual
**Opis:** Zakładka Advanced powtarza kontrolki columns/gap/borderWidth/radius które są już w Visual editorze (sekcja "Variant and layout structure"). Duplikacja może dezorientować użytkownika.  
**Rekomendacja:** Przenieść duplikaty lub wyraźnie rozróżnić kontekst (Advanced = "raw tokens override").

---

## 9. Problemy dostępności (analiza kodu)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | CTA link nie ma `rel="noopener noreferrer"` dla http URLs | Bezpieczeństwo | Wysoki |
| A2 | Brak `alt` walidacji dla pola Image URL | WCAG 1.1.1 | Wysoki |
| A3 | Header sekcji używa `<h3>` bez uwzględnienia hierarchii nagłówków strony | WCAG 1.3.1 | Średni |
| A4 | Tytuł karty to `<h4>` — może być niezgodny z kontekstem | WCAG 1.3.1 | Średni |
| A5 | Ikona w `<span>` bez aria-label/aria-hidden | WCAG 4.1.2 | Średni |
| A6 | Brak `loading="lazy"` na obrazach kart | Performance | Niski |

---

## 10. Podsumowanie wstępne (przed testami Playwright)

| Kategoria | Liczba |
|-----------|--------|
| Problemy z logiki kodu | 5 |
| Braki funkcjonalne | 16 |
| Problemy UX edytora | 9 |
| Problemy dostępności | 6 |
| **Łącznie (wstępnie)** | **36** |

---

## 11. Screenshoty

> *Sekcja uzupełniana po testach Playwright*

---

*Raport wygenerowany na podstawie analizy kodu — 2026-05-16. Uzupełniany po testach Playwright.*
