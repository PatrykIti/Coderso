# RAPORT: Listing Filters Widget — audyt stanu bieżącego (UI admina + front)

> **Status:** Zakończony — domknięcie luk (rodziny opcji + niuanse koloru)
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-listing-filters-gap-close` (izolowana od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admina (fixture):** „Contract Test - listing-filters" — ID `f9435704-9702-45f5-92b1-22711c7fb0ad`
> **Route publiczny:** http://localhost:3000/test-listing-filters-0516

> Uwaga metodologiczna: w tym przebiegu **nie** robiłem zrzutów PNG. Korzystałem
> z accessibility-snapshotów Playwright (pliki `.yml`) oraz inspekcji DOM/JS (`eval`).
> Auto-zapisane pliki snapshotów to wyłącznie **lokalne etykiety przechwyceń**
> (ignorowane przez Git, niewymagane jako evidence w repo). Color-picker sterowałem
> przez „React-zgodne" zdarzenia (natywny setter `value` + `input`/`change`), co
> pozwoliło zweryfikować to, co poprzednio uchodziło za nieautomatyzowalne (patrz §3.5).

> Uwaga o zakresie: strona admina (fixture `f9435704…`) oraz route publiczny
> (`test-listing-filters-0516`, query `22f2ad81…`) to **odrębne strony**.
> Moje edycje w edytorze admina to zmiany w wersji roboczej (draft) i **nie były
> publikowane** (przy nawigacji pojawił się dialog `beforeunload` o niezapisanych
> zmianach — odrzucony bez zapisu). Nie wpłynęły one na route publiczny. Zachowanie
> runtime na froncie testowałem na wcześniej opublikowanej konfiguracji tej strony.

> **Co nowego względem poprzedniej wersji raportu:** wcześniej przetestowano facet
> `checkbox` + `sort`. Ten przebieg **domyka pozostałe rodziny facetów i ich opcje
> prezentacji**, których fixture wcześniej nie ćwiczył: `range` (tryb wejścia + krok),
> `date-range` (tryb dat), `radio`, `taxonomy` (tryb opcji + nota o zagnieżdżaniu),
> a także **operatory dla każdego kind** oraz **realne sterowanie swatchem koloru**.

---

## 1. Przegląd widgetu

**Typ:** `listing-filters` — „Listing Filters"
**Opis:** Faceted runtime filters for listing query widgets.
**Kategoria:** content · **Moduł:** `listings` (wymaga `listings`) · **Złożoność:** composite · **Audience:** intermediate
**Warianty (4):** `default`, `horizontal`, `sidebar`, `drawer`
**Limity schematu:** facets max 24 · options/facet max 120 · sortOptions/facet max 20

Widget renderuje panel filtrów (facetów) powiązany z **jednym** źródłem listing query.
Filtry synchronizują się z adresem URL (parametry GET o nazwach `lq.<queryId>.<token>`),
a wyniki rozwiązuje SSR przy renderze publicznym. Sam widget nie wyświetla listy
wyników — steruje osobnym widgetem listingu przez stan w URL.

**Pliki źródłowe:**
- `core/widgets/core/listingFilters.tsx` — renderer (`ListingFiltersBlock`, `ListingFacetControl`), typy, normalizacja, schema, kontrakt edytora, defaults
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` — edytory Wizard / Visual / Advanced (2592 linie)
- `core/admin/ui/widgets/editors/SharedColorControl.tsx` — wspólny kontroler koloru (swatch + status + Clear)
- `core/services/search/filterContract.ts` — typy facetów, operatory (`listingFilterOperatorsByKind`), normalizacja, tokenizacja
- `core/widgets/core/listingRuntimeScript.ts` — klientowy skrypt runtime (auto-apply, sync URL)

### 1.1 Model danych (skrót)

| Sekcja | Pola |
|--------|------|
| **źródło** | `listingQueryId` |
| **copy/behavior** | `title`, `description`, `searchLabel`, `searchPlaceholder`, `applyLabel`, `showSearch`, `autoApply` |
| **facets[]** | `id`, `kind` (taxonomy/checkbox/radio/range/date-range/sort), `label`, `field`, `op`, `options[]`, `sortOptions[]`, `presentation{}` |
| **facets[].presentation** | `controlMode` (checkbox/taxonomy), `rangeInputMode` + `rangeStep` (range), `dateInputMode` (date-range) |
| **layout** | `maxWidth` (narrow/content/wide/full), `stickySidebar`, `collapsibleFacets`, `defaultCollapsed` |
| **style** | `frameBackground`, `frameBorderColor`, `actionBackground` (wszystkie clearable) |
| **resolved** (read-only, SSR) | `listingQueryId`, `metrics[]`, `searchQuery`, `rejectedTokens[]`, `error` |

### 1.2 Podział odpowiedzialności trybów (model „ownership")

- **Wizard** = setup: wybór źródła (listing query) + tworzenie facetów (kind, field, operator, opcje sortowania). Klucze techniczne (`id`/value) są „support-owned" (read-only, generowane automatycznie).
- **Visual** = codzienna edycja: wariant, layout, copy/labels, kolory, prezentacja facetów (etykiety, kolejność, tryb opcji/zakresu/dat). Pola kind/field/operator są tu read-only.
- **Advanced** = wyłącznie diagnostyka read-only dla supportu.

---

## 2. Co faktycznie przetestowano (ten przebieg)

Sesja `claude-29-05-listing-filters-gap-close`. Logowanie do admina: ✓ (konto `patryk.ciechanski@patrykiti.pl`).
W Wizardzie wybrano realne query **„House Projects Catalog Query 517544d2"** i dodano
**Facet 2**, który przeprowadziłem kolejno przez kind `range → date-range → radio → taxonomy`,
za każdym razem sprawdzając operatory, render kanwy oraz kontrolki prezentacji w Visualu.

| Obszar | Zakres testu (✓ = przetestowane w tym przebiegu) |
|--------|--------------|
| Wizard — kind | dropdown „Facet kind": **wszystkie 6** wartości (Checkbox, Radio, Taxonomy, Range, Date range, Sort) ✓ |
| Wizard — operatory per kind | checkbox, **radio ✓**, **taxonomy ✓**, **range ✓**, **date-range ✓**, sort (brak) ✓ |
| Wizard — pola | wybór `data.areaM2` (range), `updatedAt` (date-range), `data.projectStatus` (radio/taxonomy) ✓ |
| Visual — prezentacja range | **Range mode** (Inputs only / Inputs + sliders) + **Range step** ✓ |
| Visual — prezentacja date-range | **Date input mode** (Native date fields / Text fallback) ✓ |
| Visual — prezentacja taxonomy | **Option mode** (Inline / Searchable) + nota o `parentValue` ✓ |
| Visual — kolory (swatch) | **realne sterowanie color-pickerem** (React-zgodne zdarzenia) + Clear ✓ |
| Front (runtime) | re-weryfikacja: variant/query/auto-apply, sort→URL, SSR round-trip, konsola ✓ |

Z poprzednich przebiegów (potwierdzone, niezmienione): pełny setup checkbox+sort,
4 warianty, max width, collapsible/default collapsed/sticky, copy/labels, show search,
auto-apply, reorder, etykiety, Advanced (4 sekcje read-only), front: search, panel
aktywnych filtrów, „Clear all", odrzucanie tokenów URL, mobile 375px.

Metoda weryfikacji: każdą zmianę w edytorze konfrontowałem z podglądem na kanwie
admina (`data-listing-widget`, atrybuty `step`/`type`, klasy, inline-style, znaczniki
`data-listing-*`) oraz — na froncie — z realnym DOM, URL i odpowiedzią SSR po reloadzie.

---

## 3. Co DZIAŁA (potwierdzone)

### 3.1 Wizard — kind i operatory (rozszerzone)

- **Dropdown „Facet kind"** wystawia komplet 6 rodzajów: Checkbox, Radio, Taxonomy, Range, Date range, Sort.
- **Operatory zależne od kind** — potwierdzone klikalnie, zgodne z `listingFilterOperatorsByKind`:

  | Kind | Operatory w UI | Domyślny | Zgodność z kontraktem |
  |------|----------------|----------|------------------------|
  | checkbox | Contains any / Contains none / Equals / Not equals | Contains any (`in`) | ✓ `in, nin, eq, neq` |
  | **radio** | Equals / Not equals | Equals (`eq`) | ✓ `eq, neq` |
  | **taxonomy** | Contains any / Contains none / Equals | Contains any (`in`) | ✓ `in, nin, eq` |
  | **range** | Between / Greater than / Greater or equal / Lower than / Lower or equal | Between (`between`) | ✓ `between, gt, gte, lt, lte` |
  | **date-range** | Between / Greater than / Greater or equal / Lower than / Lower or equal | Between (`between`) | ✓ `between, gt, gte, lt, lte` |
  | sort | — (komunikat „Sort does not use filter operators.") | — | ✓ `[]` |

- **Pole (Listing field)** — po wyborze query lista kandydatów realna (`id, title, slug, status, updatedAt, data.summary, data.areaM2, data.rooms, data.bathrooms, data.floors, data.priceFrom, data.location, data.projectStatus`, …). Po wyborze pola znika walidacja „Choose a listing field for this facet." Wybrane pole **utrzymuje się przy zmianie kind** (np. `data.projectStatus` przetrwało radio→taxonomy).
- **„Finish setup and open Visual"** / **„Run setup again"** — przełączanie Wizard↔Visual zachowuje stan facetów w sesji.

### 3.2 Visual — prezentacja facet RANGE (nowo zweryfikowane)

Dla facetu `range` (pole `data.areaM2`):
- **Kanwa po setupie** renderuje fieldset z **Min/Max (`<input type=number>`) + Min slider/Max slider (`<input type=range>`)** — domyślny tryb `inputs-slider`.
- **Range mode** (select w Visualu): domyślnie „Inputs + sliders". Przełączenie na **„Inputs only"** → na kanwie **znikają oba slidery** (zostają tylko pola Min/Max). Powrót na „Inputs + sliders" → slidery wracają.
- **Range step** (pole liczbowe): wpisanie `25` → atrybut `step="25"` **propaguje się jednocześnie** na pola liczbowe Min/Max **oraz** na slidery (potwierdzone przez `getAttribute('step')` na obu).

### 3.3 Visual — prezentacja facet DATE-RANGE (nowo zweryfikowane)

Dla facetu `date-range` (pole `updatedAt`):
- **Tryb domyślny „Native date fields"** → kanwa renderuje **dwa `<input type="date">`** (From / To) — typ pola potwierdzony przez `el.type === "date"`.
- **Date input mode** → „Text fallback": kanwa zwija się do **jednego pola tekstowego** z placeholderem **`YYYY-MM-DD,YYYY-MM-DD`** (potwierdzone: w widgetcie pozostaje search + 1 input tekstowy, brak pól date).

### 3.4 Visual — facet RADIO i TAXONOMY (nowo zweryfikowane)

- **Radio:**
  - Operatory `eq/neq` (patrz §3.1).
  - Renderer publiczny (kanwa główna) tworzy **pusty `<fieldset>`** (0 `input[type=radio]`), bo opcje są support-owned (brak „Add option" w UI — patrz L1).
  - **Własny podgląd Wizarda per-facet** pokazuje jednak **disabled radio + tekst pomocniczy** „Add radio options to preview this facet." — czyli w setupie pustka jest objaśniona (inaczej niż na kanwie głównej, patrz L2).
- **Taxonomy:**
  - Operatory `in/nin/eq` (patrz §3.1).
  - Renderuje się jako **lista checkboxów** (multi-select). Podgląd Wizarda: dwa disabled checkboxy „Add taxonomy options to preview this facet."
  - **Option mode** (Visual) — **ten sam** select co dla checkbox (Inline list / Searchable list). Dla taxonomy obok pojawia się **dedykowana nota** (disabled): „Use parent values on option rows to build nested taxonomy levels." (dla checkbox tekst jest inny: „Inline checkbox list…" / „Search box is shown above the checkbox list.").
  - Przełączenie Option mode → **„Searchable list"**: na kanwie pojawia się `fieldset[data-listing-searchable-options]` **oraz** input `[data-listing-option-search]` (po 1 szt., potwierdzone przez DOM). Mechanizm identyczny jak dla checkbox.

### 3.5 Visual — kolory powierzchni (swatch — N1 ROZWIĄZANE)

Sekcja „Filter surface": trzy kontrolki koloru — **Frame background**, **Frame border**, **Action background** — każda zbudowana na `SharedColorControl` z `showValueInput={false}`, czyli **bez pola tekstowego na wartość CSS**: dostępny jest tylko **natywny `<input type="color">` (swatch)**, chip statusu i przycisk **Clear**.

- **Realny zapis koloru ze swatcha — DZIAŁA.** Wysterowanie swatcha „Frame background" zdarzeniami zgodnymi z React (natywny setter `value` + `input`/`change`) na `#ff0000`:
  - kanwa: inline-style ramki zmienił się na **`background-color: rgb(255, 0, 0)`**,
  - chip statusu: **„Theme default" → „Selected color"**,
  - przycisk **Clear** stał się **aktywny** (wcześniej disabled).
- **Clear — DZIAŁA.** Po kliknięciu Clear z kanwy **znika `background-color`** (powrót do theme default — zostaje samo `border-color: var(--color-border)`), chip wraca do „Theme default", Clear ponownie disabled.
- Spójne dla wszystkich trzech pól koloru (każde ma osobny swatch + Clear). W odróżnieniu od widgetu Contact (gdzie `borderColor` nie miał Clear) — tu Clear jest komplet.

> To **silniejsze evidence** niż w poprzedniej wersji: wcześniejszy „N1" (rzekoma
> niemożność zapisu koloru) okazał się **artefaktem automatyzacji** — naiwne ustawienie
> `.value` nie aktywuje value-trackera React. Po wysłaniu poprawnych zdarzeń swatch
> zapisuje wartość i kanwa reaguje. **To nie był bug widgetu.**

### 3.6 Visual — pozostałe (potwierdzone wcześniej, bez zmian)

- **4 warianty** (Default/Horizontal/Sidebar/Drawer) — `drawer` jako `<details>/<summary>` „Filters panel"; warunkowe toggle: Sticky sidebar tylko `sidebar`, Default collapsed tylko `drawer` lub przy Collapsible facets.
- **Max width** — klasa kontenera: narrow=`max-w-3xl`, content=`max-w-5xl`, wide=`max-w-6xl`, full=`max-w-none`.
- **Collapsible facets** + **Default collapsed** — opakowanie facetów w `<details>/<summary>`.
- **Title / Description / Search label / Search placeholder / Apply label** — edycja reaktywna na kanwie.
- **Show search field**, **Auto apply changes** (ON → „Updates automatically…", OFF → przycisk „Apply filters") — działają.
- **Reorder (Up/Down)**, **edycja etykiety facetu**, **etykiety opcji sortowania** — działają.

### 3.7 Advanced (read-only)

Wszystkie 4 sekcje renderują się poprawnie i odzwierciedlają stan: Source and facets
summary, Runtime diagnostics, Runtime status („No resolved facet metrics yet" poza SSR),
Contract summary (opis ownership). Brak edytowalnych kontrolek — zgodnie z założeniem.

### 3.8 Front (runtime, route publiczny) — re-weryfikacja 2026-05-29

Opublikowana konfiguracja route'a (niezmieniona): wariant `default`, query `22f2ad81-9e2f-4c6f-bdf6-8bff33549b6f`, **tylko facet Sort + pole Search**, `autoApply=1`, 0 checkboxów/radio.

- **Struktura DOM** — `data-listing-runtime-form`, `data-listing-auto-apply="1"`, region statusu, skrypt runtime — obecne.
- **Nazewnictwo parametrów** — `lq.<queryId>.__q` (search), `lq.<queryId>.__sort` (sort). Sort `<select>` **ma** `name`.
- **Sort (auto-apply)** — wybór „Newest first" → URL `?lq.22f2ad81….__sort=updatedAt%3Adesc` natychmiast.
- **SSR round-trip** — po reloadzie select **utrzymuje** `updatedAt:desc` z URL (render serwerowy odbija stan URL).
- **Konsola** — 0 errorów, 0 warningów.
- Wcześniej potwierdzone (bez zmian): search→URL, panel „1 active filter" + chip „Search: …", „Clear all", odrzucanie nieprawidłowych tokenów („Ignored invalid filter parameters."), mobile 375px.

---

## 4. Czego NIE udało się jednoznacznie potwierdzić / ograniczenia

### 4.1 Ograniczenia funkcjonalne (rzeczywiste luki użyteczności)

| # | Problem | Obszar |
|---|---------|--------|
| L1 | **Brak możliwości dodania opcji dla facetów checkbox/radio/taxonomy z poziomu UI.** Sekcja „Options" pokazuje „Option values are support-owned until runtime metrics can suggest safe values." i **nie ma „Add option"**. W setupie można jedynie *usunąć* istniejącą opcję. Skutek: facet checkbox/radio/taxonomy utworzony w kreatorze ma 0 opcji; renderer publiczny pokazuje pusty `<fieldset>` (sama legenda). Opcje wypełnia dopiero runtime-metrics SSR. | Wizard / renderer |
| L2 | **Pusty facet na kanwie głównej admina jest mylący** — facet bez opcji pokazuje tylko nagłówek; renderer główny **nie** dodaje noty „opcje pojawią się w runtime". (Uwaga: *podgląd Wizarda per-facet* **ma** taką notę — np. „Add radio/taxonomy options to preview this facet." — więc problem dotyczy renderera głównego, nie kreatora.) | Renderer (admin preview) |
| L3 | **Sort select bez czytelnej etykiety pustego wyboru** poza „Default order" — drobne, działa, ale brak komunikatu, że „Default order" = brak sortu. | Renderer |

### 4.2 Niezweryfikowane (ograniczenia narzędzia/zakresu — NIE oznaczają błędu)

| # | Co | Dlaczego nie potwierdzono |
|---|----|--------------------------|
| N2 | **Front: facety inne niż Sort + search, z realnymi metrykami runtime, oraz warianty inne niż `default`.** Opublikowana konfiguracja route'a ma tylko facet Sort. Nowe rodziny (range/date-range/radio/taxonomy) ćwiczyłem **wyłącznie w adminie (draft)** — nie zostały opublikowane, więc render checkbox/radio/taxonomy/range/date-range z liczbami (`count`) z metryk SSR oraz warianty `horizontal/sidebar/drawer` na froncie pozostają niezweryfikowane na żywo. | Publikacja zmieniłaby live route — celowo pominięta (poza zakresem audytu). |
| N3 | **Trwałość zmian admina po zapisie/reloadzie.** Nie klikałem „Save draft"/„Publish" (przy nawigacji dialog `beforeunload` odrzucony). Potwierdziłem trwałość *w sesji* (reaktywność + zachowanie stanu przy Wizard↔Visual), ale **nie** weryfikowałem persystencji do bazy ani po reloadzie strony admina. | Zapis modyfikowałby fixture/draft — celowo pominięty. |
| N4 | **Zagnieżdżenie taxonomy (wcięcia `parentValue`/depth).** Renderer wspiera hierarchię (`flattenTaxonomyOptions` → `paddingInlineStart`), ale **nie da się dodać opcji z `parentValue` z UI** (pochodna L1). Nota „Use parent values on option rows…" potwierdzona, ale samego zagnieżdżenia z realnymi danymi nie zademonstrowano. | Zależne od L1 (opcje support-owned). |

> **Domknięte względem poprzedniej wersji:** dawne „N1" (zapis koloru przez swatch)
> zostało **rozwiązane** i przeniesione do §3.5 jako działające. Range/date-range/radio/taxonomy
> presentation oraz operatory per kind — przeniesione z luk do §3 (potwierdzone).

---

## 5. Niuanse UX/UI

- **U1 — Wejście do Wizarda jest nieoczywiste.** Edytor otwiera się w Visualu (zakładki Visual/Advanced). Tryb Wizard nie jest zakładką — uruchamia go przycisk **„Run setup again"** przy statusie „Setup complete".
- **U2 — Swatch koloru pokazuje fallback dla wartości motywu.** Pola domyślnie trzymają CSS-y (`color-mix(in srgb, var(--color-bg) 80%, transparent)`, `var(--color-border)`, `var(--color-primary)`), których natywny `<input type=color>` nie potrafi pokazać (wyświetla fallbacki #ffffff/#d4d4d8/#2563eb). Chip „Theme default/Selected color/Saved custom color" + nota łagodzą to, ale **brak pola tekstowego** (`showValueInput=false`) oznacza, że autor nie może wpisać dowolnego CSS — tylko wybrać kolor z pickera lub Clear.
- **U3 — Komunikaty „support-owned" są techniczne.** „Option values are support-owned…", „A custom field binding is already configured by support…" — język operacyjny, mało przyjazny dla autora treści.
- **U4 — „Sort by" przy braku query** pokazuje „Custom field configured by support" (disabled); po wyborze query wartość wraca do realnego pola.
- **U5 — Reorder tylko Up/Down** — brak drag&drop dla facetów i opcji.
- **U6 — Pusty facet bez wyjaśnienia na kanwie głównej (patrz L2).** Dotyczy renderera głównego; podgląd Wizarda objaśnia pustkę.
- **U7 — Brak collapse sekcji edytora Visual** — przy wielu facetach panel robi się długi.
- **U8 — Czytelny podział ownership (pozytyw).** „Wizard=setup / Visual=codzienne / Advanced=diagnostyka" — konsekwentny i dobrze opisany (Contract summary). Pola read-only jasno komunikują własność supportu.
- **U9 — Spójność kontrolek prezentacji per kind (pozytyw).** Każdy kind dostaje *tylko* właściwe mu kontrolki: checkbox/taxonomy → Option mode; range → Range mode + Range step; date-range → Date input mode; radio/sort → brak dodatkowych. Brak „martwych" pól nie pasujących do kind.

---

## 6. Dostępność (front)

| # | Obserwacja |
|---|-----------|
| A1 | `<section data-listing-widget>` **bez** `aria-label`/`aria-labelledby` — kontener filtra bez dostępnej nazwy. |
| A2 | `<form data-listing-runtime-form>` **bez** `aria-label`. |
| A3 | Input search **bez** `id` i **bez** `autocomplete`. Etykietowanie działa przez wrapper `<label><span>Search</span><input></label>` (asocjacja implicytna), ale brak jawnego `id`/`for`. |
| A4 | Sort `<select>` **ma** `name` (poprawnie — wymagane do GET). |
| A5 | Drawer/Collapsible używają natywnych `<details>/<summary>` — dobra, dostępna baza (działa bez JS). |
| A6 | Swatche koloru w adminie mają `aria-label` („Frame background swatch" itd.) — pozytyw dla edytora. |

---

## 7. Admin (podgląd) vs Front (runtime) — porównanie

| Aspekt | Admin preview | Front (SSR + runtime) | Zgodność |
|--------|---------------|------------------------|----------|
| Render wariantu `default` | ✓ | ✓ | ✓ |
| Title/description/labels | ✓ reaktywne | ✓ (opublikowane) | ✓ |
| Auto-apply (tekst vs przycisk) | ✓ | ✓ (auto-apply=1) | ✓ |
| Sort select | ✓ podgląd (disabled w setup) | ✓ działa, sync URL + SSR round-trip | ✓ |
| Search | ✓ podgląd | ✓ działa, sync URL | ✓ |
| Facet range (Min/Max + slidery, step) | ✓ (kanwa reaguje na Range mode/step) | niezweryfikowane (N2) | — |
| Facet date-range (date vs text fallback) | ✓ (kanwa reaguje na Date input mode) | niezweryfikowane (N2) | — |
| Facet radio / taxonomy (Option mode, searchable) | ✓ (kanwa reaguje) | niezweryfikowane (N2) | — |
| Kolory powierzchni (swatch + Clear) | ✓ (inline-style reaguje) | (kolory dziedziczone do SSR — nie testowane na żywo) | — |
| Panel aktywnych filtrów + Clear all | n/d (brak SSR) | ✓ | — |
| Odrzucanie tokenów URL | n/d (brak SSR) | ✓ | — |
| `resolved.metrics` (opcje z danych, `count`) | ✗ puste | niezweryfikowane na tym route (N2) | — |

**Wniosek:** zachowania wspólne (warianty/copy/auto-apply/sort) zgodne między adminem
a frontem. Wszystkie **rodziny facetów i ich kontrolki prezentacji** działają w podglądzie
admina (kanwa reaguje na każdą zmianę). Render facetów z realnymi opcjami/`count` zależy
od metryk SSR i wymaga opublikowanej konfiguracji z tymi facetami — czego na obecnym
route (tylko Sort) nie ma (N2).

---

## 8. Podsumowanie

**Stan ogólny: widget działa solidnie; po domknięciu luk potwierdzono komplet rodzin
facetów i ich opcji prezentacji oraz realne sterowanie kolorem.**

Względem poprzedniej wersji raportu:

1. **Range** — Range mode (Inputs only / Inputs + sliders) i Range step (`step` na inputach i sliderach) — **działają**.
2. **Date-range** — Date input mode (Native date fields / Text fallback, przełączanie 2×`date` ↔ 1×text) — **działa**.
3. **Radio** — operatory `eq/neq`, render pustego fieldsetu (L1) + objaśnienie w podglądzie Wizarda — **działa**.
4. **Taxonomy** — operatory `in/nin/eq`, render jako checkboxy, Option mode + nota o `parentValue`, tryb Searchable na kanwie — **działa**.
5. **Operatory per kind** — komplet zgodny z `listingFilterOperatorsByKind` — **potwierdzone**.
6. **Swatch koloru (dawny N1)** — **rozwiązane**: zapis koloru i Clear działają; poprzedni problem to artefakt automatyzacji.

Utrzymane zastrzeżenia:

- **L1 (istotne):** brak dodawania opcji checkbox/radio/taxonomy z UI — facet pozostaje pusty do czasu metryk runtime; na kanwie głównej wygląda jak błąd (L2).
- **N2/N3/N4:** na froncie nie zweryfikowano nowych rodzin facetów ani wariantów innych niż `default` (brak publikacji), persystencji po zapisie, oraz zagnieżdżenia taxonomy (pochodna L1).
- Drobne luki dostępności (brak `aria-label` na section/form, brak `id`/`autocomplete` na search) i techniczny język komunikatów „support-owned".

### Macierz priorytetów (na podstawie tego audytu)

| # | Pozycja | Priorytet |
|---|---------|-----------|
| L1 | Brak dodawania opcji checkbox/radio/taxonomy w UI | WYSOKI |
| L2 | Pusty facet bez wyjaśnienia na kanwie głównej | ŚREDNI |
| A1–A3 | aria-label section/form, id/autocomplete search | ŚREDNI |
| U2 | Brak pola tekstowego koloru; swatch pokazuje fallback dla wartości motywu | NISKI |
| U1 | Nieoczywiste wejście do Wizarda („Run setup again") | NISKI |
| U3 | Techniczny język komunikatów „support-owned" | NISKI |
| U7 | Brak collapse sekcji Visual | NISKI |

---

## 9. Statystyki audytu

| Kategoria | Liczba |
|-----------|--------|
| Rodzaje facetów zweryfikowane (kind) | 6/6 (checkbox, radio, taxonomy, range, date-range, sort) |
| Zestawy operatorów per kind potwierdzone | 6/6 |
| Potwierdzone działające funkcje (Wizard) | 9 |
| Potwierdzone działające funkcje (Visual) | 17 (w tym range×2, date-range×1, taxonomy×1, kolory×3) |
| Potwierdzone działające funkcje (Advanced) | 4 sekcje read-only |
| Potwierdzone działające funkcje (Front/runtime) | 9 |
| Ograniczenia funkcjonalne (L) | 3 |
| Niezweryfikowane (N) | 3 (N2, N3, N4) — dawny N1 rozwiązany |
| Niuanse UX (U) | 9 |
| Luki / uwagi dostępności (A) | 6 |
