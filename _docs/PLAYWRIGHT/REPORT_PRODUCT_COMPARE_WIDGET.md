# RAPORT: Product Compare Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright (Product Compare Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko front:** http://localhost:3000
> **Strona testowa:** TEST-PRODUCT-COMPARE-0516 (`/admin/pages/0819cd19-ca10-4485-9566-ca0f80c93459`)

---

## 1. Przegląd widgetu

**Typ:** Composite
**Moduł:** Commerce (wymaga modułu `commerce`)
**Warianty:** `matrix` (jedyny wariant — tabela atrybutów z produktami jako kolumnami)
**Slot:** brak (widget samodzielny)
**Złożoność:** advanced
**Audience:** advanced

Product Compare widget renderuje tabelę porównawczą produktów e-commerce: produkty jako kolumny, atrybuty (cena, compare-at, stan magazynowy, ilość, slug) jako wiersze. Dane są hydratowane przez runtime resolver komercyjny.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych (`ProductCompareData`)

| Sekcja | Pola |
|--------|------|
| **source** | `limit` (1–12), `search`, `collectionIds[]` (max 30), `status[]`, `sortField`, `sortDir` |
| **fields** | `showCompareAt`, `showStockQuantity`, `showSlug` |
| **labels** | `price`, `compareAt`, `stock`, `quantity`, `slug` |
| **emptyState** | `title`, `description` |
| **style** | `tableBackground`, `tableBorderColor`, `headerBackground`, `emptyBackground`, `emptyBorderColor` |
| **resolved** | `rows[]`, `total`, `resolvedAt`, `error` |

### 2.2 Metryki (wiersze tabeli)

| Wiersz | Domyślnie widoczny | Konfigurowalny |
|--------|--------------------|----------------|
| Price | Zawsze (hardcoded `visible: true`) | Nie |
| Compare at | Tak | Tak (`showCompareAt`) |
| Stock | Zawsze (hardcoded `visible: true`) | Nie |
| Quantity | Tak | Tak (`showStockQuantity`) |
| Slug | Nie | Tak (`showSlug`) |

### 2.3 Runtime row data (`CommerceWidgetRuntimeCompareRow`)

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string | ID produktu |
| `title` | string | Nazwa produktu |
| `slug` | string | Slug URL |
| `priceAmount` | number | Cena liczbowa |
| `currency` | string | Waluta (np. "USD") |
| `compareAtAmount` | number\|null | Cena porównawcza |
| `stockState` | enum | `in_stock`, `out_of_stock`, `backorder` |
| `stockQuantity` | number\|null | Ilość w magazynie |

**Brakujące pola runtime:** brak `imageUrl`/`primaryMediaId`, brak `excerpt`/`description`, brak `status`, brak `sku`, brak linku do strony produktu.

### 2.4 Tryby edytora

| Tryb | Zawartość |
|------|-----------|
| **Wizard** | Source (kolekcje/search/limit/sort) + Limit guidance info + Surfaces (kolory) |
| **Visual** | Attribute rows (toggles) + Labels (3 z 5) + Empty state + Surfaces (kolory) |
| **Advanced** | Runtime payload info + Runtime error flag (edytowalny!) + Query preview JSON |

### 2.5 Sortowanie (`source.sortField`)

Dostępne: `title`, `slug`, `status`, `pricing.amount`, `stock.state`, `createdAt`, `updatedAt`, `publishedAt`

### 2.6 Niespójność limitów

- Schema: `limit` min=1, max=12
- `normalizeCommerceWidgetSource`: klampuje do 1–48 (niezgodność z schematem)

---

## 3. Zidentyfikowane problemy — analiza kodu (przed testami Playwright)

### 3.1 Braki konfiguracyjne (BF)

#### BF-01 — Brak możliwości ukrycia wiersza Price i Stock
**Priorytet:** Wysoki
**Opis:** W tablicy `metrics` wiersze `price` i `stock` mają `visible: true` hardcoded bez możliwości wyłączenia. Użytkownik nie może ukryć ceny ani stanu magazynowego z tabeli porównawczej.
**Lokalizacja:** `productCompare.tsx:333-370`

#### BF-02 — Brak zdjęcia produktu w nagłówku kolumny
**Priorytet:** Wysoki
**Opis:** `CommerceWidgetRuntimeCompareRow` nie zawiera pola `imageUrl` ani `primaryMediaId`. Tabela porównawcza nie pokazuje zdjęć produktów — standardowy element UI porównywarki produktów (użytkownik potrzebuje zdjęcia żeby wiedzieć co porównuje).
**Lokalizacja:** `commerceWidgetShared.ts:40-49`, `productCompare.tsx:404-415`

#### BF-03 — Brak nagłówka sekcji (title/description nad tabelą)
**Priorytet:** Wysoki
**Opis:** Model `ProductCompareData` nie zawiera pól `title` ani `description` sekcji. Widget nie ma możliwości wyświetlenia nagłówka (np. "Compare our products") nad tabelą porównawczą. Standardowy element layoutu sekcji.

#### BF-04 — Brak wyboru konkretnych produktów po ID
**Priorytet:** Wysoki
**Opis:** Source pozwala filtrować przez `collectionIds`, `search`, `status`. Nie ma możliwości wybrania konkretnych produktów po ID (`productIds[]`). Jeśli użytkownik chce porównać dokładnie 3 wybrane produkty (np. "Model A", "Model B", "Model C"), musi polegać na wyszukiwaniu lub filtrach — bez gwarancji że te produkty zostaną zwrócone.

#### BF-05 — Brak pola opisu/excerpt produktu jako wiersz
**Priorytet:** Średni
**Opis:** Runtime row nie zawiera pola `excerpt`/`description`. Brak możliwości wyświetlenia krótkiego opisu produktu jako jednego z wierszy porównania — standard w porównywarkach produktów e-commerce.

#### BF-06 — Brak wyróżnienia ("featured") kolumny produktu
**Priorytet:** Średni
**Opis:** Widget nie obsługuje wyróżnienia jednego produktu jako "polecany" lub "bestseller". Brak możliwości nadania jednej kolumnie innego koloru nagłówka, obramowania lub etykiety.

#### BF-07 — Brak linku do strony produktu z nazwy produktu
**Priorytet:** Średni
**Opis:** Tytuły produktów w nagłówku tabeli (`<th>`) są statycznym tekstem — nie są linkowane do strony produktu. Widget nie konfiguruje `href` dla tytułów produktów ani nie dostarcza możliwości dodania CTA per produkt.

#### BF-08 — Brak tylko jednego wariantu layoutu
**Priorytet:** Średni
**Opis:** Widget ma tylko jeden wariant `matrix`. Brak wariantów alternatywnych takich jak:
- `cards` — produkty jako karty obok siebie (pionowe, bez tabeli)
- `compact` — uproszczona tabela z mniejszą ilością padding
- `horizontal` — atrybuty jako kolumny, produkty jako wiersze (odwrócona tabela)

#### BF-09 — Brak konfiguracji nagłówka kolumny "Attribute"
**Priorytet:** Niski
**Opis:** Pierwsza kolumna tabeli ma hardcoded nagłówek "Attribute" (`productCompare.tsx:406`). Brak możliwości zmiany tej etykiety na np. "Feature", "Specification" lub własny tekst.

#### BF-10 — Brak "Add to cart" / CTA per produkt
**Priorytet:** Średni
**Opis:** Widget nie oferuje żadnego CTA pod każdym produktem (np. "Kup teraz", "Dodaj do koszyka"). Tabela jest czysto informacyjna — użytkownik nie może podjąć akcji zakupowej bezpośrednio z widgetu.

#### BF-11 — Brak formatowania walut per region/lokalizacja
**Priorytet:** Niski
**Opis:** `formatCommerceMoney` jest hardcoded na `en-US` locale. Brak możliwości konfiguracji locale per widget lub per strona. Cena $1,234.50 wyświetli się zawsze w formacie US.
**Lokalizacja:** `commerceWidgetShared.ts:172-185`

#### BF-12 — Brak sticky header tabeli
**Priorytet:** Średni
**Opis:** Przy porównaniu wielu produktów na urządzeniach mobilnych (overflow-x-auto) lub przy długiej liście atrybutów, nagłówek tabeli z nazwami produktów nie jest sticky — użytkownik traci kontekst który produkt jest w której kolumnie podczas przewijania.

#### BF-13 — Brak obsługi statusu magazynowego "Backorder" w labelu
**Priorytet:** Niski
**Opis:** `commerceStockLabelMap` mapuje `backorder` → `"Backorder"`, ale brak możliwości kustomizacji etykiety dla backorder (tylko `stock` label jest konfigurowalny, a on mapuje się do wiersza "Stock state", nie rozróżnia stanów).

#### BF-14 — Brak opcji formatowania liczby (quantity display)
**Priorytet:** Niski
**Opis:** `stockQuantity` jest renderowany jako surowy `String(row.stockQuantity)`. Brak możliwości formatowania (np. "999+" dla dużych ilości, "Limited" dla małych, ukrycia dokładnej liczby).

#### BF-15 — Limit produktów (max 12) niespójny z normalizeCommerceWidgetSource (max 48)
**Priorytet:** Wysoki
**Opis:** Schema JSON waliduje `limit` max=12, ale `normalizeCommerceWidgetSource` klampuje do 1–48. Przy programowym ustawieniu `limit: 20` — schema odrzuci payload jako invalid, ale normalizacja przyjmie 20. Niespójność może prowadzić do trudnych do debugowania błędów.
**Lokalizacja:** `productCompare.tsx:149`, `commerceWidgetShared.ts:139`

### 3.2 Problemy UX edytora (UX)

#### UX-01 — Visual Editor nie zawiera labels `quantity` i `slug`
**Priorytet:** Wysoki
**Opis:** Model `labels` zawiera 5 pól: `price`, `compareAt`, `stock`, `quantity`, `slug`. W `ProductCompareVisualEditor` sekcja Labels eksponuje tylko 3 z nich: `price`, `compareAt`, `stock`. Pola `quantity` i `slug` nie mają kontrolek edycji mimo że są widoczne w tabeli (gdy `showStockQuantity=true` i `showSlug=true`).
**Lokalizacja:** `ProductCompareEditors.tsx:192-231`

#### UX-02 — Wizard Editor zawiera sekcję Surfaces (zaawansowana)
**Priorytet:** Średni
**Opis:** Wizard Editor (uproszczony tryb dla początkujących) zawiera `SurfaceFields` z 5 inputami koloru (`tableBackground`, `tableBorderColor`, `headerBackground`, `emptyBackground`, `emptyBorderColor`). To jest zbyt zaawansowane dla kroku Wizard — powinno być wyłącznie w Visual lub Advanced.
**Lokalizacja:** `ProductCompareEditors.tsx:136`

#### UX-03 — Advanced Editor udostępnia edytowalny "Runtime error flag"
**Priorytet:** Wysoki
**Opis:** Pole `resolved.error` jest prezentowane jako edytowalny input w Advanced Editorze ("Runtime error flag"). Użytkownik może ręcznie wpisać tekst błędu — co sprawi że widget pokaże błąd bez prawdziwego problemu. To pole powinno być read-only (wyświetlane jako monit).
**Lokalizacja:** `ProductCompareEditors.tsx:281-293`

#### UX-04 — Query preview JSON w Advanced zbyt surowe
**Priorytet:** Niski
**Opis:** Sekcja "Query preview" w Advanced pokazuje surowy JSON zapytania do resolvers. Dla użytkownika bez znajomości API, ta informacja nie niesie wartości. Brak opisu co oznaczają poszczególne klucze.
**Lokalizacja:** `ProductCompareEditors.tsx:295-302`

#### UX-05 — Brak informacji o liczbie produktów w edytorze
**Priorytet:** Wysoki
**Opis:** Advanced Editor pokazuje "Resolved rows: N · Total: N" tylko w sekcji Runtime payload. W Wizard i Visual Editorze brak wskazówki ile produktów aktualnie spełnia kryteria source. Użytkownik nie wie czy jego filtry zwracają 0, 3, czy 12 produktów bez przełączenia na Advanced tab.

#### UX-06 — Brak Limit guidance przy zmianie limitu
**Priorytet:** Niski
**Opis:** Wizard zawiera sekcję "Limit guidance" z informacją że 2-5 produktów jest optymalnych. Ale ta wskazówka nie reaguje dynamicznie — gdy użytkownik ustawi limit=12, info nadal brzmi tak samo i nie ostrzega że tabela będzie nieczytelna na mobile.

#### UX-07 — Source filters (status, search) nie mają placeholderów ani opisów
**Priorytet:** Niski
**Opis:** `CommerceSourceFields` renderuje pola bez contextual help: brak opisu co oznacza "status" filter, brak przykładu dla "search", brak wyjaśnienia że `collectionIds` to IDs a nie nazwy kolekcji.

#### UX-08 — Brak możliwości ponownego wymuszenia resolve (refresh)
**Priorytet:** Wysoki
**Opis:** Dane produktów są hydratowane przez runtime resolver przy renderowaniu SSR. W edytorze admin nie ma przycisku "Refresh / Re-resolve" który wymusiłby ponowne pobranie danych po zmianie filtrów. Edytor może pokazywać nieaktualne dane produktów z poprzedniego resolve.

### 3.3 Problemy dostępności (A)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | `<table>` bez `<caption>` | WCAG 1.3.1 | Wysoki |
| A2 | `<th>` (kolumny produktów) bez `scope="col"` | WCAG 1.3.1 | Wysoki |
| A3 | `<th>` (Attribute column) bez `scope="col"` | WCAG 1.3.1 | Wysoki |
| A4 | `<section>` bez `aria-label` lub `aria-labelledby` | WCAG 1.3.6 | Średni |
| A5 | `data-widget="product-compare"` — poprawny data attr, bez wpływu na a11y | — | ✓ OK |
| A6 | Brak `role="img"` ani `alt` dla ewentualnych zdjęć produktów | WCAG 1.1.1 | Wysoki (przy BF-02) |
| A7 | Error banner (amber) — brak `role="alert"` | WCAG 4.1.3 | Wysoki |
| A8 | Empty state `<p>` bez semantycznego oznaczenia roli | WCAG 1.3.1 | Niski |
| A9 | Overflow-x-auto container — brak `tabindex="0"` dla nawigacji klawiaturą | WCAG 2.1.1 | Wysoki |

---

## 4. Wyniki testów Playwright — Admin UI

### 4.1 Konfiguracja testu

| Parametr | Wartość |
|----------|---------|
| URL admin | http://localhost:5173/admin |
| Login | admin test account (redacted) |
| Strona testowa | TEST-PRODUCT-COMPARE-0516 |
| UUID strony | `0819cd19-ca10-4485-9566-ca0f80c93459` |
| Slug front | `/test-product-compare-0516` |

### 4.2 Wizard editor

| Test | Wynik |
|------|-------|
| Dodanie widgetu do strony | ✓ Działa |
| Source: Limit spinbutton (zmiana 3→5) | ✓ Działa |
| Source: Search textbox | ✓ Dostępny (placeholder: "title or slug") |
| Source: Collections — brak kolekcji | ⚠ "No commerce collections are available yet." — fallback textbox dostępny |
| Source: Sort field combobox | ✓ Dostępny (domyślnie: Title) |
| Source: Sort direction combobox | ✓ Dostępny (domyślnie: Ascending) |
| Source: Status filter (draft/published/archived checkboxes) | ✓ Dostępny |
| Limit guidance info (dynamiczna aktualizacja) | ✓ Aktualizuje się przy zmianie limitu |
| Limit guidance przy limit > 5 | ⚠ Brak ostrzeżenia — UX-06 confirmed |
| Limit max — spinbutton `max` attr | ✗ `max=48` zamiast `12` — BF-15 confirmed |
| Wpisanie limit=13 (ponad schema max=12) | ✗ UI przyjmuje 13, brak walidacji — BF-15 confirmed |
| Brak wskaźnika dopasowanych produktów | ✗ UX-05 confirmed |
| Surfaces: 5 pól kolorów w Wizard | ⚠ Za zaawansowane dla kroku Wizard — UX-02 confirmed |
| Surfaces: Table background + Clear | ✓ Działa |
| Surfaces: Table border + Clear | ✓ Działa |
| Surfaces: Header background + Clear | ✓ Działa |
| Surfaces: Empty background + Clear | ✓ Działa |
| Surfaces: Empty border + Clear | ✓ Działa |

### 4.3 Visual editor

| Test | Wynik |
|------|-------|
| Przejście przez "Continue to layout and styling" | ✓ Działa |
| Wariant selector: "Matrix" wybrany / "Selected" badge | ✓ Działa |
| Toggle "Show compare-at price" (uncheck) | ✓ Działa (checkbox reaguje) |
| Toggle "Show stock quantity" | ✓ Działa |
| Toggle "Show slug" (enable) | ✓ Działa |
| Live update canvas przy toggle zmianie | ✓ Działa (empty state — nie weryfikowalne z produktami w canvas) |
| Labels sekcja — widoczne pola | ⚠ Tylko 3 z 5: Price, Compare at, Stock — brak Quantity i Slug |
| Label "Quantity" i "Slug" niedostępne | ✗ UX-01 confirmed |
| Label Price — edit na "Cena" | ✓ Działa |
| Empty state title — live update w canvas | ✓ Działa (canvas pokazuje "Brak produktów do porównania") |
| Empty state description — edit | ✓ Działa |
| Surfaces (kolory) w Visual — duplikacja z Wizard | ⚠ UX-02 confirmed |

### 4.4 Advanced editor

| Test | Wynik |
|------|-------|
| "Resolved rows: 0 · Total: 0" — admin canvas nie resolve | ✓ Wyświetla 0 (expected) |
| Runtime error flag — edytowalny | ✗ UX-03 confirmed — można wpisać fałszywy błąd |
| Wpisanie testowego błędu → error banner w canvas | ✓ Banner pojawia się natychmiast |
| Error banner `role="alert"` | ✗ A7 confirmed — `role=null` |
| Query preview JSON — aktualny | ✓ Pokazuje poprawny limit=3, sort by title asc |
| Query preview czytelny bez kontekstu | ⚠ UX-04 — surowy JSON bez opisów |

### 4.5 Canvas preview

| Test | Wynik |
|------|-------|
| Empty state render ("No products to compare") | ✓ Działa |
| Empty state tytuł/opis edytowalny i live | ✓ Działa |
| Tabela z produktami w canvas admin | ✗ Canvas zawsze pokazuje empty state — UX-08 confirmed |
| Error banner render (amber) | ✓ Pojawia się po wpisaniu błędu w Advanced |

---

## 5. Wyniki testów Playwright — Frontend (localhost:3000)

### 5.1 Produkt testowy

Widget na froncie załadował **1 produkt**: "Alpha Widget Pro"

| Atrybut | Wartość |
|---------|---------|
| Tytuł | Alpha Widget Pro |
| Cena | $19,900.00 |
| Compare at | $24,900.00 |
| Stan magazynowy | In stock |
| Ilość | 15 |

### 5.2 Zgodność admin preview ↔ frontend

| Element | Admin Preview | Frontend | Status |
|---------|--------------|----------|--------|
| Tabela z produktami | ✗ Pusta (empty state) | ✓ Widoczna z danymi | **RÓŻNICA** — produkcyjny SSR vs brak resolve w edytorze |
| Empty state | ✓ Widoczny | ✗ Nie widoczny (jest produkt) | Zgodne (normalny stan) |
| Error banner | ✓ Testowo wyświetlony | — | Nie testowany na froncie |
| Style (kolory) | Domyślne | Domyślne | Zgodne |
| Tytuł produktu w `<th>` | — | Statyczny tekst (bez linka) | ✗ BF-07 confirmed |

**Główna różnica admin↔frontend:** Admin canvas zawsze pokazuje empty state ponieważ runtime resolver działa wyłącznie podczas SSR (renderowanie po stronie serwera). Nie jest to bug — to architektoniczne ograniczenie, ale poważny problem UX (UX-08): edytor jest ślepym narzędziem bez podglądu realnych danych.

### 5.3 Wyniki accessibility — frontend

| ID | Element | Stan | Wynik |
|----|---------|------|-------|
| A1 | `<table>` — `<caption>` | `hasCaption: false` | ✗ Brak |
| A2 | `<th>` produktów — `scope="col"` | `thScopes: [null, null]` | ✗ Brak |
| A3 | `<th>` "Attribute" — `scope="col"` | `thScopes: [null, null]` | ✗ Brak |
| A4 | `<section>` — `aria-label` | `sectionAriaLabel: null` | ✗ Brak |
| A7 | Error banner — `role="alert"` | `role: null` (DOM) | ✗ Brak |
| A9 | Overflow container — `tabindex="0"` | `overflowTabindex: null` | ✗ Brak |

### 5.4 Dodatkowe obserwacje

- Jedynym błędem konsoli na froncie jest `404 /favicon.ico` — niezwiązany z widgetem
- Tabela renderuje się poprawnie HTML-owo (`min-w-full text-sm`, `overflow-x-auto` wrapper)
- Tytuł produktu w `<th>` to zwykły tekst — brak linku do strony produktu (BF-07 confirmed)
- Na mobile (375px) tabela z 1 produktem nie wymaga scrollowania — ale z 3+ produktami overflow będzie niezbędny

---

## 6. Podsumowanie — macierz priorytetów (stan po analizie kodu)

### Krytyczne braki funkcjonalne

| ID | Opis | Priorytet |
|----|------|-----------|
| BF-02 | Brak zdjęcia produktu w kolumnie nagłówka | Wysoki |
| BF-03 | Brak nagłówka sekcji (title/description) | Wysoki |
| BF-04 | Brak wyboru produktów po ID (productIds[]) | Wysoki |
| BF-01 | Brak możliwości ukrycia wiersza Price i Stock | Wysoki |
| BF-15 | Niespójność limitu schema (12) vs normalize (48) | Wysoki |

### Pilne problemy UX

| ID | Opis | Priorytet |
|----|------|-----------|
| UX-01 | Labels `quantity` i `slug` niedostępne w Visual Editorze | Wysoki |
| UX-03 | Edytowalny "Runtime error flag" — powinien być read-only | Wysoki |
| UX-05 | Brak wskaźnika liczby produktów w Wizard/Visual | Wysoki |
| UX-08 | Brak refresh/re-resolve w edytorze | Wysoki |

### Braki funkcjonalne (drugorzędne)

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-07 | Średni | Brak linku do strony produktu |
| BF-06 | Średni | Brak wyróżnienia "featured" kolumny |
| BF-10 | Średni | Brak CTA "Add to cart" per produkt |
| BF-08 | Średni | Tylko jeden wariant layoutu |
| BF-12 | Średni | Brak sticky header tabeli |
| BF-05 | Średni | Brak excerpt/description produktu w rows |
| BF-09 | Niski | Hardcoded "Attribute" column header |
| BF-11 | Niski | Hardcoded locale `en-US` dla walut |
| BF-13 | Niski | Brak kustomizacji "Backorder" label |
| BF-14 | Niski | Brak formatowania quantity display |

### Problemy dostępności

| ID | Priorytet | Opis |
|----|-----------|------|
| A1 | Wysoki | `<table>` bez `<caption>` |
| A2 | Wysoki | `<th>` bez `scope="col"` |
| A7 | Wysoki | Error banner bez `role="alert"` |
| A9 | Wysoki | Scrollowalny kontener bez `tabindex="0"` |
| A4 | Średni | `<section>` bez `aria-label` |

---

## 7. Szczegółowe obserwacje Playwright — kluczowe problemy

### 7.1 Admin canvas zawsze puste — produkt widoczny tylko na froncie (UX-08 + architektura)

**Obserwacja:** Admin canvas pokazuje permanentnie: "No products to compare". Frontend po opublikowaniu wyświetlił poprawną tabelę z produktem "Alpha Widget Pro".

**Przyczyna:** Runtime resolver (`hydrateProductCompareRuntimeData`) uruchamia się wyłącznie podczas SSR w `publicSite.tsx`. Admin canvas renderuje komponent `ProductCompareBlock` bezpośrednio z danymi edytora — bez wywołania resolvers. Pole `resolved.rows` jest zawsze puste w edytorze.

**Skutek dla użytkownika:** Nie ma możliwości podglądu jak widget wygląda z prawdziwymi produktami przed publikacją. Edytor jest "ślepym narzędziem".

---

### 7.2 Limit spinbutton max=48 zamiast max=12 (BF-15)

**Obserwacja:**
```
Spinbutton min/max: {"min":"1","max":"48","value":"13"}
Schema JSON: limit { type: "number", minimum: 1, maximum: 12 }
```
UI akceptuje limit=13 bez żadnego błędu lub ostrzeżenia. `normalizeCommerceWidgetSource` klampuje do 48. JSON schema validation odrzuciłaby 13, ale spinbutton pozwala wpisać tę wartość.

---

### 7.3 Labels: Quantity i Slug niedostępne w Visual Editorze (UX-01)

**Obserwacja:** Sekcja Labels w Visual Editorze zawiera wyłącznie:
- Price
- Compare at
- Stock

Brakuje:
- **Quantity** — etykieta dla wiersza ilości (toggle `showStockQuantity=true` włącza ten wiersz)
- **Slug** — etykieta dla wiersza slugu (toggle `showSlug=true` włącza ten wiersz)

Użytkownik może włączyć te wiersze ale nie może zmienić ich etykiet z edytora Visual.

---

### 7.4 Runtime error flag edytowalny (UX-03)

**Obserwacja:** W Advanced Editorze, pole "Runtime error flag" jest aktywnym `<input>`. Wpisanie wartości powoduje natychmiastowe pojawienie się bannera błędu w canvas:
```
Commerce runtime warning: Test error: commerce resolver unavailable
```
Pole jest elementem UI, który nie powinien być edytowalny przez content managera — mógłby wprowadzać fałszywy komunikat o błędzie.

---

### 7.5 Tabela accessibility — 4 z 4 problemów potwierdzone

Wynik JavaScript DOM audit na froncie:
```json
{
  "hasCaption": false,
  "thScopes": [null, null],
  "sectionAriaLabel": null,
  "overflowTabindex": null
}
```
| Problem | Wynik testu |
|---------|-------------|
| A1: `<table>` bez `<caption>` | ✗ Potwierdzony |
| A2+A3: `<th>` bez `scope="col"` | ✗ Potwierdzony (oba th: null) |
| A4: `<section>` bez `aria-label` | ✗ Potwierdzony |
| A9: Overflow bez `tabindex="0"` | ✗ Potwierdzony |

---

### 7.6 Tytuł produktu w `<th>` — nie jest linkiem (BF-07)

**Obserwacja z HTML:**
```html
<th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/75">
  Alpha Widget Pro
</th>
```
Tytuł to statyczny tekst, nie `<a href>`. Użytkownik nie może kliknąć na produkt w tabeli porównawczej.

---

## 8. Statystyki — finalne

| Kategoria | Liczba |
|-----------|--------|
| Braki funkcjonalne (BF) | 15 |
| Problemy UX edytora (UX) | 8 |
| Problemy dostępności (A) | 9 |
| **Łącznie** | **32** |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `product-compare-01-page-created.png` | Nowo utworzona strona testowa |
| `product-compare-02-wizard-editor.png` | Wizard editor z widgetem dodanym |
| `product-compare-03-visual-editor.png` | Visual editor — toggles i labels |
| `product-compare-04-toggles-test.png` | Stan po wyłączeniu compare-at i włączeniu slug |
| `product-compare-05-advanced-editor.png` | Advanced editor — Runtime error flag wpisany |
| `product-compare-06-empty-state.png` | Canvas po wyczyszczeniu błędu — empty state |
| `product-compare-07-admin-published.png` | Admin po opublikowaniu strony |
| `product-compare-08-frontend.png` | Frontend — tabela z "Alpha Widget Pro" |
| `product-compare-09-admin-empty-vs-frontend.png` | Admin canvas vs frontend — różnica widoczności produktów |
| `product-compare-10-frontend-mobile.png` | Frontend na mobile 375px |
| `product-compare-11-visual-labels-missing.png` | Visual editor — brakujące labels Quantity i Slug |
| `product-compare-12-advanced-editor-2.png` | Advanced editor — Resolved rows: 0, Query preview |

---

*Raport generowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*
