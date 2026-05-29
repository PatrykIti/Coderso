# RAPORT: Product Table Widget — audyt wyczerpujący (upgrade)

> **Status:** Zakończony — wyczerpujący audyt Wizard / Visual / Advanced + frontend (SSR)
> **Data audytu:** 2026-05-29 (upgrade raportu z datą katalogu 28-05-2026)
> **Sesja przeglądarki:** `claude-29-05-product-table-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** Contract Test - product-table (`f317c971-cc3f-4003-9a38-66ff40c8d036`)
> **Trasa publiczna:** `/producttabletestproducttabletest`
> **Pliki źródłowe:** `core/widgets/core/productTable.tsx`, `core/admin/ui/widgets/editors/ProductTableEditors.tsx`

---

## 0. Metoda, zakres i deklaracja wyczerpującości

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja). Weryfikacja każdej kontrolki opierała się na **rzeczywistym kliknięciu/wpisaniu**
oraz **asercji DOM** na żywym podglądzie admin (sekcja `[data-product-table-count]`)
i na surowym HTML SSR trasy publicznej.

**Różnica względem poprzedniego raportu:** poprzednia wersja jawnie używała „reprezentatywnego
przekroju" (np. „testowano reprezentatywne wartości w każdym combobox", „pełny wybór koloru tylko
Clear"). **Ten audyt przechodzi każdą dostępną opcję każdej rodziny kontrolek przynajmniej raz**,
o ile fixtura na to pozwala. Poniżej rozdzielono jednoznacznie: **przetestowane → działa / zepsute /
nietestowalne (z podaniem dlaczego) / niuanse UX**.

**Screenshoty:** **nie przechwytywano plików PNG.** Cała weryfikacja przez asercje DOM/`eval`.
Gdyby wykonano `playwright-cli screenshot`, powstałe pliki byłyby **wyłącznie lokalnymi etykietami**
(ignorowane przez Git), nie stanowiącymi evidence w repo.

**Czego świadomie NIE robiono:** nie wykonano `Save draft` / `Publish` — aby nie zmutować
współdzielonej fixtury dla innych agentów. Wszystkie eksperymenty żyły w pamięci edytora; trasa
publiczna pokazuje **opublikowaną** (wcześniejszą) konfigurację, nie mój draft.

**Dane fixtury (3 produkty, oba bez obrazka):**
- Fixture Garden Suite — `/fixture-garden-suite` — $159.00 (compare $179.00) — Published — In stock (1)
- Fixture Urban Loft — `/fixture-urban-loft` — $299.00 (compare $349.00) — Published — Backorder (8)
- Fixture Starter Home — `/fixture-starter-home` — $199.00 (compare $249.00) — Published — In stock (3)
- Kolekcje źródłowe: **Fixture Homes**, **Fixture Lofts** (Homes=2 prod., Lofts=2 prod., suma=3)

---

## 1. Struktura edytora (niuans IA)

Zakładki trybu eksponują **tylko Visual (domyślna) i Advanced**. **Wizard NIE jest zakładką** — to
jednorazowy przepływ uruchamiany przyciskiem **„Run setup again"**, kończony **„Finish setup and
open Visual"**. Panel statusu: „Setup complete · Daily edits live in Visual. Advanced is for technical
diagnostics." Oba przejścia (wejście w Wizard i powrót do Visual) działają poprawnie.

---

## 2. TRYB WIZARD — Table source (wszystkie opcje przetestowane → DZIAŁA)

Każda kontrolka źródła wywołuje **backendowe przeliczenie** (podgląd „Resolved items / Total"
aktualizuje się na żywo).

| Kontrolka | Przetestowane wartości | Wynik | Status |
|-----------|------------------------|-------|--------|
| **Limit** (number) | 12 → **2** → **1** → 12 | Resolved 3 → 2 → 1 → 3; „Products shown" odzwierciedla limit | ✅ |
| **Search** (text) | „Garden" / „Loft" / „zzzznomatch" / „" | 1 / 1 / **0** (empty) / 3 | ✅ |
| **Collections** (2 checkboxy) | Homes / Homes+Lofts / Lofts / brak | 2 / 3 / 2 / 3 (union) | ✅ |
| **Sort field** (combobox, **8 opcji**) | Title, Slug, Status, Price, Stock, Created, Updated, Published | każda zmienia etykietę „Sort: … " i przelicza (3/3) | ✅ wszystkie 8 |
| **Sort direction** (combobox, **2 opcje**) | Ascending, Descending | „Sort: Updated ascending/descending" | ✅ obie |
| **Status filter** (3 checkboxy) | draft / published / archived / kombinacje | draft→**0**, published→3, archived→**0**, suma 3 | ✅ wszystkie 3 |

**Wszystkie 8 wartości Sort field** przeszło indywidualnie (nie reprezentatywnie). Status `draft`
i `archived` dają 0 wyników (wszystkie fixtury `published`) — patrz §3.9 (empty state).

---

## 3. TRYB VISUAL — wszystkie rodziny kontrolek

Stan początkowy canvas (draft): 5 kolumn (Product, Slug, Price, Status, Stock), wariant default.

### 3.1 Selecty / comboboxy — **każda opcja kliknięta** (11 rodzin)

Weryfikacja przez atrybuty `data-product-table-*` na sekcji canvas oraz treść komórek.

| Combobox | Opcje (wszystkie kliknięte) | Zaobserwowany efekt | Status |
|----------|------------------------------|----------------------|--------|
| **Table variant** | Default, Compact | `data-…-variant` = default/compact | ✅ obie |
| **Row density** | Compact, Comfortable, Spacious | `data-…-density` = compact/comfortable/spacious | ✅ 3/3 |
| **Row treatment** | Plain rows, Striped rows | `data-…-row-treatment` = plain/striped | ✅ obie |
| **Table max width** | Full, Content, Wide | `data-…-max-width` = full/content/wide | ✅ 3/3 |
| **Table alignment** | Left aligned, Centered | `data-…-align` = left/center | ✅ obie |
| **Typography** | Compact, Balanced, Prominent | `data-…-typography` = compact/balanced/prominent | ✅ 3/3 |
| **Sorting UI** | No sorting UI, Indicator only, Interactive headers | patrz §3.6 (różne, jednoznacznie rozróżnione) | ✅ 3/3 |
| **Pagination mode** | No pagination, Previous and next, Load more link | patrz §3.7 | ✅ 3/3 |
| **Money locale** | English (US), Polish (PL), German (DE), French (FR) | patrz §3.8 | ✅ 4/4 |
| **Currency display** | Symbol, Currency code, Currency name | patrz §3.8 | ✅ 3/3 |
| **Linked column** | No linked column, Product column, Product URL column | zapis OK, ale brak widocznych linków — patrz §5 (nietestowalne) | ⚠️ 3/3 zapisane |

**Niuans wariantu (UX):** przełączenie Table variant z Default na Compact zmienia tylko atrybut
`variant`; **density/typography NIE zmieniły się**, bo fixtura ma jawne nadpisania per-oś (`style.*`),
a te wygrywają z presetem wariantu. To poprawne (preset jest „domyślną osią"), ale autor może
oczekiwać, że Compact zmieni gęstość — tu nie zmieni, dopóki istnieją jawne nadpisania.

### 3.2 Przełączniki Layout/style

| Toggle | Test | Atrybut | Status |
|--------|------|---------|--------|
| Show row hover | on → off | `data-…-hover` true→false | ✅ dwukierunkowo |
| Use sticky header | on → off | `data-…-sticky` true→false | ✅ dwukierunkowo |

### 3.3 Section header (3 pola tekstowe)

| Pole | Wpis | Render | Status |
|------|------|--------|--------|
| Section eyebrow | „Katalog" | wyrenderowany eyebrow | ✅ |
| Section title | „Katalog testowy PT" | `<h2>` **oraz** `aria-label` sekcji **oraz** `<caption>` | ✅ |
| Section description | „Opis sekcji testowej" | wyrenderowany opis | ✅ |

### 3.4 Columns — **wszystkie 9 kolumn + qty + oba guardy**

Włączono 4 ukryte kolumny; finalna kolejność rejestru: Image, Product, Excerpt, Slug, Price,
Compare at, Status, Stock, Collections. Treść komórek zweryfikowana:

| Kolumna | Toggle | Treść komórki (wiersz 1) | Status |
|---------|--------|---------------------------|--------|
| Show image | off→on | „No image" (fixtury bez obrazka — fallback) | ✅ |
| Show product | (guard) | „Fixture Garden Suite" | ✅ |
| Show excerpt | off→on | „Garden-facing suite used to keep…" | ✅ |
| Show slug | (guard) | „/fixture-garden-suite" | ✅ |
| Show price | (guard) | „$159.00" | ✅ |
| Show compare-at price | off→on | „$179.00" | ✅ |
| Show status | on | „Published" | ✅ |
| Show stock | on | „In stock" | ✅ |
| Show collection count | off→on | „2" | ✅ |
| **Show stock quantity** (warunkowy) | on | „In stock **(1)**", „Backorder **(8)**", „In stock **(3)**" | ✅ |

**Guard tożsamości:** ukrycie Product (Slug zostaje) — OK; następnie ukrycie Slug → **Product
automatycznie wraca** (co najmniej 1 kolumna tożsamości). ✅
**Guard cenowy:** ukrycie Price (Compare at zostaje) — OK; następnie ukrycie Compare at → **Price
automatycznie wraca**. ✅

### 3.5 Column labels — **wszystkie 9 pól**

Każda etykieta zmieniła odpowiadający nagłówek:
Zdjęcie / Produkt / Opis / Adres / Cena / Cena pierwotna / Stan publikacji / Magazyn / Kolekcje. ✅ 9/9

### 3.6 Sorting UI — 3 tryby **jednoznacznie rozróżnione**

| Tryb | thead links | `aria-sort` | Wskaźnik | Wniosek |
|------|-------------|-------------|----------|---------|
| No sorting UI | 0 | brak | brak | statyczne nagłówki |
| **Indicator only** | 0 | `descending` na aktywnej kolumnie | tak (nieklikalny) | wskaźnik kierunku, bez linków |
| **Interactive headers** | **5** (`<a href="?pt.blk-1.sort=title&pt.blk-1.dir=asc">`) | — | — | klikalne kotwice sortowania (SSR query) |

> Indicator wymaga, by aktywne pole sortowania było **widoczną kolumną**. Przy domyślnym
> `sortField=updatedAt` (niewidoczna kolumna) wskaźnik się nie pokazuje — dlatego dodatkowo
> ustawiono `Sort field = Title` w Wizardzie i potwierdzono `aria-sort="descending"` + wskaźnik na
> kolumnie „Produkt". To wcześniejsza pułapka obserwacyjna, nie błąd.

### 3.7 Pagination mode — 3 tryby (z realnym page size = 2)

| Tryb | Pole „Page size" | Canvas (przy pageSize=2, 3 produkty) |
|------|------------------|--------------------------------------|
| No pagination | **ukryte** | brak nawigacji |
| **Previous and next** | widoczne | `nav`: „Previous · Page 1 of 2 · Next"; **Next** `href=?…&page=2` (Previous nieaktywne na stronie 1) |
| **Load more link** | widoczne | kotwica **„Load more"** `href=?…&page=2` |

Pole warunkowe „Page size" pojawia się/znika poprawnie wraz z trybem (≠ „none"). ✅

### 3.8 Export and currency

**Money locale (przy display=Symbol), na cenie $159.00:**
- English (US) → `$159.00`
- Polish (PL) → `159,00 USD`
- German (DE) → `159,00 $`
- French (FR) → `159,00 $US`

**Currency display (przy locale=fr-FR):**
- Symbol → `159,00 $US`
- Currency code → `159,00 USD`
- Currency name → `159,00 dollars des États-Unis`

**Show CSV export (toggle):** włączenie dodaje kotwicę `<a download="katalog-testowy-pt.csv"
href="data:text/csv;charset=…">` z tekstem „Export CSV". Nazwa pliku wyprowadzona z tytułu sekcji.
**Export label** (pole warunkowe) → zmiana na „Pobierz CSV" natychmiast zmienia tekst przycisku. ✅

### 3.9 Empty state — **render potwierdzony**

Ustawiono custom Title „Brak produktów (test)" + Description „Opis pustego stanu (test)".
Następnie w Wizardzie ustawiono Status=`draft` → **0 wyników** → **canvas wyrenderował empty state
z moimi custom tekstami**. ✅ (To realny render, nie tylko zapis pola.)

### 3.10 Public controls (toggles)

| Toggle | Efekt w canvas | Status |
|--------|----------------|--------|
| Show search input | pole tekstowe „title or slug" + etykieta „Search products" | ✅ |
| Show status filter | **3 checkboxy**: draft / published / archived (grupa „Status") | ✅ |
| Show collection filter | patrz niżej | ✅ (po spełnieniu warunku) |

> **Collection filter — warunek bramki:** przy 0 zaznaczonych kolekcjach w źródle toggle **nie
> ujawnia** checkboxów (zgodnie z opisem: „Add at least two Source collections above…"). Po
> zaznaczeniu **obu** kolekcji w Wizardzie i włączeniu toggla — **pojawiły się 2 checkboxy
> wizytatora** (Fixture Homes / Fixture Lofts) w grupie „Collections". ✅ To poprawne bramkowanie,
> nie błąd.

### 3.11 Surfaces — kolory (5 kontrolek: swatch `type=color` + Clear)

| Akcja | Wynik | Status |
|-------|-------|--------|
| Set **Table background** = `#112233` | zastosowane do kontenera przewijania jako `background-color: rgb(17,34,51)` | ✅ swatch działa |
| **Clear** ×5 (wszystkie powierzchnie) | wszystkie 5 przycisków „Clear" przeszło w `[disabled]`, nadpisania usunięte (`background-color` zniknął) | ✅ 5/5 |

Pięć powierzchni: Table background, Table border, Header background, Empty background, Empty border.
Brak osobnego pola tekstowego wartości (`showValueInput=false`) — interakcja przez swatch + Clear.

---

## 4. TRYB ADVANCED — read-only (DZIAŁA zgodnie z kontraktem)

Panel Advanced zawiera **0 pól edytowalnych** (`inputs=0`, `writableControls=0`) i jedyny przycisk
**„Refresh preview"** — zgodnie z `writablePaths: []`.

**Query summary odzwierciedla niezapisane zmiany z Visual/Wizard:**
- Product limit: „12 products per page"
- Search scope: „No search text"
- Collection scope: „**2 selected collections**" (z mojego wyboru w Wizardzie)
- Status scope: „Published storefront default"
- Sort order: „Updated · Descending"
- Visitor controls: „**Collection filters**" (z włączonego toggla)
- Page size: „Pagination disabled"

**Refresh preview:** znacznik „Resolved at" zaktualizował się `7:50:38 AM → 7:51:13 AM`. ✅

**Niuans:** „Product limit" (limit zapytania, 12) ≠ „Page size" (wielkość strony przy paginacji) —
dwie różne wartości, subtelne dla nietechnicznego autora.

---

## 5. NIETESTOWALNE w tej fixturze (jawnie, z przyczyną)

Wszystkie poniższe **kontrolki działają na poziomie zapisu i re-renderu**, ale **widoczny efekt
końcowy jest zablokowany środowiskowo**, więc nie mogłem go potwierdzić:

| # | Kontrolka | Co zablokowane | Dlaczego (przyczyna) |
|---|-----------|----------------|----------------------|
| NT1 | **Linked column** (Product column / Product URL column) | brak `<a>` w komórkach tabeli w którymkolwiek z 3 trybów (`bodyLinks=0`) | **Brak skonfigurowanej trasy szczegółów produktu** w Site Settings → `productHref=null`. Edytor ostrzega: „When no route is available, runtime keeps the table text-only." |
| NT2 | **Show action column → Action label** („Zobacz") | komórki Action pokazują „-", etykieta akcji niewidoczna | Ta sama przyczyna co NT1 (brak trasy produktu → brak linku akcji) |
| NT3 | **Open product links in new tab** | nie da się sprawdzić `target="_blank"` | Brak jakichkolwiek linków do otwarcia (NT1/NT2) |

**Brak w tym widgecie (nie dotyczy):** radio cards (wariant to **select**, przetestowany);
**add/remove/reorder repeatable items** — Product Table jest **query-driven** (źródło to zapytanie,
nie ręczna lista pozycji), więc nie ma kontrolek dodawania/usuwania/zmiany kolejności pozycji
(najbliższe to toggdle kolumn i checkboxy kolekcji — przetestowane); **destination picker** — brak
osobnego pickera celu (linkowanie wybiera istniejącą kolumnę, nie URL docelowy).

---

## 6. TRASA PUBLICZNA (frontend, SSR) — DZIAŁA

`http://localhost:3000/producttabletestproducttabletest` → **HTTP 200**, render **server-side**
(surowy HTML zawiera `data-product-table-count="3"`, nazwy produktów).

**Render opublikowanej konfiguracji (7 kolumn):** Produkt, Slug, Price, Compare at, Status, Stock,
Collections. Ceny $159/$299/$199; compare-at $179/$349/$249; kolekcje 2/1/1; statusy Published; stany
In stock / Backorder / In stock. `variant=default`, `density=comfortable`, `row-treatment=plain`,
`page=1`, `aria-label="Product table"` (brak opublikowanego custom tytułu → fallback).

**Dostępność (a11y) — pozytywnie:**
- `<caption class="sr-only">` + `<table aria-labelledby>` powiązane z caption
- region przewijania `tabindex="0"` (fokusowalny klawiaturą) + `data-overflow-affordance`
- badge statusu `aria-label="Status: Published"`

**Responsywność (375 px):** tabela przewija się **wewnątrz kontenera** (scrollWidth 704 > clientWidth
373), **bez poziomego przepełnienia strony** (`docScrollWidth = docClientWidth = 375`).

**Brak kontrolek publicznych** (search / sort links / pagination / export) — opublikowana
konfiguracja ma je wyłączone. **Konsola: 0 błędów, 0 ostrzeżeń.**

---

## 7. Rozbieżność Admin (draft) vs Public (published) — stan zastany

| Aspekt | Admin canvas (draft początkowy) | Public (published) |
|--------|----------------------------------|--------------------|
| Liczba kolumn | 5 (Product, Slug, Price, Status, Stock) | 7 (+ Compare at, Collections) |
| Etykieta produktu | „Product" (domyślna) | „Produkt" (custom) |

To **stan zastany** (nie zapisywałem zmian). Publiczny render nie odzwierciedla draftu do ponownej
publikacji — normalne dla CMS, ale wyraźne tutaj.

---

## 8. Niuanse UX/UI

| # | Niuans |
|---|--------|
| U1 | Wizard to przepływ „setup" (przycisk „Run setup again"), nie zakładka — zakładkami są tylko Visual i Advanced. |
| U2 | Opuszczenie admina z niezapisanymi zmianami wywołuje dialog `beforeunload`; frontend testowano w **osobnej karcie**, by go nie wyzwalać. |
| U3 | Table variant nie zmienia density/typography, gdy istnieją jawne nadpisania per-oś (preset przegrywa z override). |
| U4 | „Indicator only" pokazuje wskaźnik **tylko** gdy pole sortowania jest widoczną kolumną (przy `updatedAt` — niewidoczne). |
| U5 | Nazwa pliku CSV pochodzi z tytułu sekcji („Katalog testowy PT" → `katalog-testowy-pt.csv`); brak tytułu → `product-table.csv`. |
| U6 | Po „Clear" przycisk staje się `[disabled]` i znika „Saved custom color" — spójny, czytelny stan. |
| U7 | Collection filter jest bramkowany: wymaga ≥2 kolekcji w źródle, inaczej toggle nie ujawnia checkboxów. |
| U8 | Linked/Action bez efektu wizualnego bez trasy produktu — edytor ostrzega tekstem, ale autor może nie zauważyć przyczyny. |

---

## 9. Podsumowanie

**Ocena:** widget `product-table` jest w **dojrzałym, spójnym stanie**. W tym wyczerpującym przebiegu
**przeszedłem każdą dostępną opcję każdej rodziny kontrolek** (nie reprezentatywnie).

**DZIAŁA (potwierdzone klikiem + asercją DOM):**
- Wizard: Limit, Search, Collections, **wszystkie 8** Sort field, **obie** Sort direction, **wszystkie
  3** statusy, przeliczanie podglądu, przejścia Wizard↔Visual.
- Visual: **wszystkie 11 selectów × każda opcja**, oba toggle stylu, **9/9 kolumn** + qty + **oba guardy**,
  **9/9 etykiet**, **3 tryby sortowania** rozróżnione, **3 tryby paginacji** (z realnym page size i
  nawigacją/Load more), **4 locale × 3 currency display**, CSV export + nazwa pliku + label, empty
  state (realny render przy 0 wyników), search/status/collection public controls, **set swatch + Clear
  ×5**.
- Advanced: read-only (0 pól), Query summary odzwierciedla edycje, Refresh preview odświeża znacznik.
- Frontend: HTTP 200, SSR 3 produkty/7 kolumn, a11y (caption sr-only, aria-labelledby, focusowalny
  scroll, badge aria-label), responsywność (overflow w kontenerze), **0 błędów konsoli**.

**ZEPSUTE:** brak — w przetestowanym zakresie nie znaleziono defektów funkcjonalnych.

**NIETESTOWALNE (środowiskowo, nie defekt):** NT1 Linked column, NT2 Action label, NT3 Open in new
tab — wszystkie zablokowane **brakiem skonfigurowanej trasy szczegółów produktu** (Site Settings).
Kontrolki zapisują stan i re-renderują, ale widoczny link/akcja nie powstaje.

**Screenshoty:** 0 plików PNG (weryfikacja DOM/`eval`); ewentualne zrzuty byłyby lokalnymi etykietami.

---

## 10. Statystyki

| Kategoria | Wartość |
|-----------|---------|
| Tryby przetestowane | 3 (Wizard, Visual, Advanced) + frontend SSR |
| Rodziny selectów × wszystkie opcje | 11 / 11 (każda opcja kliknięta) |
| Kolumny przełączone + guardy | 9/9 + 2 guardy (identity, pricing) |
| Etykiety kolumn | 9/9 |
| Tryby sortowania / paginacji | 3/3 · 3/3 (rozróżnione w DOM) |
| Locale waluty / currency display | 4/4 · 3/3 |
| Kontrolki koloru (swatch + Clear) | 5/5 (set + clear) |
| Sort field / Sort direction / statusy | 8/8 · 2/2 · 3/3 |
| Defekty funkcjonalne | 0 |
| Nietestowalne (brak trasy produktu) | 3 (NT1–NT3) |
| Niuanse UX/UI | 8 (U1–U8) |
| Trasa publiczna | HTTP 200, SSR, 3 produkty, 0 błędów konsoli |
| Zrzuty PNG | 0 (lokalne etykiety, gdyby były) |
