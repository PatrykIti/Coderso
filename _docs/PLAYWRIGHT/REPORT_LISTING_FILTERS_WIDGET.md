# REPORT: Listing Filters Widget

> Status: **W TOKU** | Data: 2026-05-16 | Autor: Claude Code

---

## 1. Podsumowanie

Widget `listing-filters` służy do renderowania panelu filtrów runtime dla listing queries. Wyświetla facety (checkbox, radio, range, date-range, taxonomy, sort) w formularzu synchronizowanym przez URL, który odświeża powiązane bloki listingowe bez przeładowania strony. Widget jest ściśle sprzężony z systemem listing queries — bez podłączonego zapytania wyświetla jedynie placeholder.

---

## 2. Analiza kodu (statyczna)

### 2.1 Pliki

| Plik | Rola |
|------|------|
| `core/widgets/core/listingFilters.tsx` | Typy, schemat, domyślne, `ListingFiltersBlock`, `normalizeListingFiltersData` |
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Edytory: Wizard, Visual, Advanced |
| `core/services/search/filterContract.ts` | Typy faset, operatory, tokeny runtime, `normalizeListingFacetConfigs` |
| `core/widgets/core/listingRuntimeScript.ts` | Klient JS (IIFE) odpowiadający za sync URL ↔ form i AJAX refresh |
| `core/admin/ui/listings/ListingFiltersPage.tsx` | Strona admin do testowania tokenów runtime (nie edytor widgetu) |
| `tests/vitest/widgets/listingFilters.test.tsx` | Testy jednostkowe komponentu |

### 2.2 Schemat konfiguracji

**Powiązanie (`source`):**
- `listingQueryId`: string UUID — wymagane do uruchomienia filtrów

**UI tekstowy:**
- `title`: string (default: `"Filter results"`)
- `description`: string (default: `"Narrow down listing results with reusable facets."`)
- `searchLabel`: string (default: `"Search"`)
- `searchPlaceholder`: string (default: `"Search results..."`)
- `applyLabel`: string (default: `"Apply filters"`)

**Zachowanie:**
- `autoApply`: boolean — automatyczne submit przy zmianie wartości kontrolki (default: `true`)
- `showSearch`: boolean — pole wyszukiwania full-text (default: `true`)

**Faset (`facets[]`, max 24):**
- `id`: string (tokenizowany)
- `kind`: `"checkbox"` | `"radio"` | `"taxonomy"` | `"range"` | `"date-range"` | `"sort"`
- `label`: string
- `field`: string (ścieżka pola w danych, wymagana gdy kind ≠ `sort`)
- `op`: jeden z 12 operatorów (eq, neq, in, nin, contains, startsWith, gt, gte, lt, lte, between, exists)
- `options[]`: `{value, label}` dla checkbox/radio/taxonomy
- `sortOptions[]`: `{value, label, field, dir}` dla sort

**Styl (`style`):**
- `frameBackground`: CSS value (default: `color-mix(in srgb, var(--color-bg) 80%, transparent)`)
- `frameBorderColor`: CSS value (default: `var(--color-border)`)
- `actionBackground`: CSS value (default: `var(--color-primary)`)

**Resolved (SSR runtime):**
- `listingQueryId`: string
- `metrics[]`: ListingFacetMetric — dane z serwera (count, active state, range min/max)
- `searchQuery`: string — aktualna wartość wyszukiwania z URL
- `rejectedTokens[]`: tokeny odrzucone przez serwer
- `error`: string

**Warianty:** tylko `default` — jeden wariant bez alternatyw

### 2.3 Tokeny runtime URL

Namespace: `lq.<listingQueryId>.<token>`

| Token | Typ | Opis |
|-------|-----|------|
| `__q` | search | Full-text wyszukiwanie |
| `__sort` | sort | Sortowanie: `field:dir` |
| `__page` | page | Paginacja |
| `<field>.<operator>` | facet | Filtr pola, np. `status.eq=published` |

Skrypt kliencki (`listingRuntimeScript.ts`) zarządza:
- Odczytem wartości formularza
- Budowaniem URL z tokenami
- AJAX fetch z headerem `x-nextless-runtime: listing`
- Patch DOM: zastępuje bloki `[data-listing-block-id]` nowymi fragmentami HTML
- Obsługą przycisku Browser Back (`popstate`)

---

## 3. Braki funkcjonalne i błędy UX (analiza kodu)

### 3.1 Braki konfiguracyjne

| # | Problem | Opis | Priorytet |
|---|---------|------|-----------|
| B-01 | **Jeden wariant bez alternatyw layoutu** | Widget ma tylko `default` — brak wariantu `horizontal` (filtry w wierszu nad listą), `sidebar` (sticky boczny panel) czy `drawer` (filtr wysuwany). Typowe wzorce UX przy szerszych listingach wymagają ułożenia filtrów poziomo lub w bocznym panelu. | Wysoki |
| B-02 | **Brak kontrolki paginacji** | Token `__page` istnieje w filterContract, jest obsługiwany przez skrypt kliencki, ale nie ma żadnego komponentu paginacji ani kontrolki strony w widgecie. Użytkownik nie może przejść do kolejnej strony wyników. | Wysoki |
| B-03 | **Brak wskaźnika aktywnych filtrów** | Widget nie wyświetla liczby aktywnych filtrów, tagów aktywnych wyborów ani przycisku "Clear all". Użytkownik nie widzi stanu filtrowania i nie może jednym kliknięciem wyczyścić wszystkich filtrów. | Wysoki |
| B-04 | **Brak obsługi zagnieżdżonej taksonomii** | `kind: "taxonomy"` traktuje opcje identycznie jak `checkbox` — nie ma hierarchii poziomów, indentacji ani tree-select dla taksonomii z rodzic-dziecko. | Średni |
| B-05 | **Range input jako text — brak dedykowanego slidera** | `kind: "range"` renderuje zwykłe pole tekstowe z placeholderem `"min,max"`. Brak wizualnego suwaka (`<input type="range">`), brak osobnych pól min/max — użytkownik musi wpisać zakres w nieprzyjaznym formacie `min,max`. | Wysoki |
| B-06 | **Date-range jako text — brak date picker** | `kind: "date-range"` renderuje pole tekstowe z placeholderem `"YYYY-MM-DD,YYYY-MM-DD"`. Brak kalendarza ani natywnego `<input type="date">`. | Wysoki |
| B-07 | **Brak kontrolki multi-select z wyszukiwaniem** | Dla dużych zestawów opcji (np. lista krajów, kategorie) checkbox/radio są niepraktyczne. Brak wariantu `select` z wyszukiwaniem i multi-select. | Średni |
| B-08 | **Brak stanu ładowania przy AJAX refresh** | Skrypt kliencki wykonuje fetch i podmienia DOM, ale nie ma żadnego wskaźnika ładowania — widoczna zmiana pojawia się nagle, bez przejścia. | Średni |
| B-09 | **Brak obsługi błędu sieci w skrypcie klienckim** | Gdy fetch kończy się błędem HTTP, skrypt robi `window.location.assign()` — pełne przeładowanie strony. Brak komunikatu błędu w UI. | Średni |
| B-10 | **Brak opcji "Collapsible" dla fasetów** | Na urządzeniach mobilnych lista facetów może być bardzo długa. Brak opcji zwijanego/rozkładalnego panelu dla każdego facetu. | Średni |
| B-11 | **Brak obsługi `__page` reset przy zmianie filtrów** | Gdy użytkownik zmienia filtr, numer strony powinien się resetować do 1. Skrypt kliencki tego nie robi — jeśli użytkownik był na stronie 3 i zmienił filtr, wysyła `__page=3` z nowym filtrem, co może zwracać pustą stronę. | Wysoki |
| B-12 | **Brak konfiguracji max width widgetu** | Widget zawsze renderuje się w `max-w-6xl`. Brak opcji konfiguracji szerokości (narrow, full, custom). | Niski |

### 3.2 Błędy UX w edytorze admin

| # | Problem | Opis | Priorytet |
|---|---------|------|-----------|
| E-01 | **Facet ID edytowany przez użytkownika — ryzyko kolizji** | Pole `id` facetu jest edytowalnym polem tekstowym. Duplikaty ID są cicho ignorowane przez `normalizeListingFacetConfigs` (seen Set), co prowadzi do zniknięcia fasetów bez wyjaśnienia. | Wysoki |
| E-02 | **Facet "field" to free-text bez autocomplete** | Pole `Field path (example: tags)` to zwykły Input. Użytkownik musi znać dokładną nazwę pola w strukturze danych listing query. Brak dropdownu z dostępnymi polami. | Wysoki |
| E-03 | **Operator nieodpowiedni do wybranego kind** | Dropdown operatorów wyświetla wszystkie 12 opcji niezależnie od wybranego `kind`. Np. dla `range` jedynym sensownym operatorem jest `between`, ale użytkownik może wybrać `startsWith` — brak walidacji ani filtrowania. | Wysoki |
| E-04 | **Tekst opcji facetu — format `value|label` nieintuicyjny** | Textarea do wpisywania opcji checkbox/radio używa formatu `value|label\n`. Brak wizualnego edytora par klucz-wartość, brak inline walidacji błędów parsowania. | Średni |
| E-05 | **Tekst sortOptions — format z 4 polami oddzielonymi `\|`** | Format `value|label|field|dir` jest jeszcze bardziej skomplikowany. Błąd w którymkolwiek polu powoduje ciche odrzucenie całej linii przez `parseSortOptions`. | Wysoki |
| E-06 | **Brak podglądu renderowanego facetu** | Edytor nie pokazuje jak wygląda skonfigurowany facet przed zapisem. Użytkownik nie widzi czy checkbox/radio jest poprawnie skonfigurowane. | Średni |
| E-07 | **Wizard Editor nie zawiera FacetsEditor** | `ListingFiltersWizardEditor` eksponuje tylko `ListingQuerySelect`, `RuntimeBehavior` i `SurfaceEditor` — brak zarządzania facetami w najprostszym trybie edycji. Użytkownik musi przełączyć się na Visual, żeby w ogóle dodać faset. | Wysoki |
| E-08 | **Brak color picker dla pól stylu** | Pola `frameBackground`, `frameBorderColor`, `actionBackground` to zwykłe Inputy tekstowe. Brak pickera kolorów. | Niski |
| E-09 | **Brak komunikatu gdy listingQueryId jest pusty** | Gdy `listingQueryId` jest puste (nowy widget), edytor nie wskazuje jasno, że trzeba najpierw wybrać zapytanie listingowe — jedynym sygnałem jest płytki opis sekcji. | Średni |
| E-10 | **Runtime payload snapshot tylko w Advanced** | `RuntimeSnapshot` (JSON read-only z `resolved`) jest dostępny wyłącznie w Advanced edytorze. Redaktor w trybie Wizard i Visual nie ma dostępu do informacji diagnostycznych (np. `error`, `rejectedTokens`). | Średni |
| E-11 | **Brak walidacji ID facetu w edytorze** | Edytor nie sprawdza duplikatów ID, spacji, znaków specjalnych. `normalizeListingFacetConfigs` tokenizuje ID (lowercase, `-` zamiast spacji), ale edytor wyświetla oryginalną wartość — rozbieżność między tym co widzi użytkownik a tym co jest zapisywane. | Średni |
| E-12 | **"Apply filters" button zawsze widoczny przy autoApply=true** | Gdy `autoApply` jest włączone, przycisk "Apply filters" i tak jest renderowany. Pojawia się informacja "Updates automatically when values change", ale przycisk submit jest zbędny i może wprowadzać w błąd (użytkownik może nie wiedzieć czy wciskać przycisk czy czekać). | Niski |

### 3.3 Potencjalne błędy techniczne

| # | Problem | Opis |
|---|---------|------|
| T-01 | **`normalizeListingFacetConfigs` odrzuca facety bez `field`** | Każdy facet niebędący `sort` z pustym lub brakującym `field` jest cicho pomijany (linia 149 filterContract.ts: `if (kind !== "sort" && !field) return`). Brak jakiegokolwiek feedbacku dla użytkownika. |
| T-02 | **Skrypt kliencki emitowany jako `dangerouslySetInnerHTML`** | `<script dangerouslySetInnerHTML={{ __html: getListingRuntimeClientScript() }} />` — ryzyko XSS jeśli kontent skryptu kiedykolwiek zależy od danych użytkownika. Obecnie bezpieczne (statyczny IIFE), ale wzorzec jest ostrzegawczy. |
| T-03 | **Guard `window.__nextlessListingRuntimeClient` nie obsługuje HMR** | W trybie developerskim z Hot Module Replacement, skrypt nie uruchomi się ponownie po hot-reload (guard zapobiega re-inicjalizacji). Formy po HMR mogą stracić listenery. |
| T-04 | **`defaultValue` zamiast `value` w kontrolkach** | Wszystkie kontrolki (`input`, `select`, `checkbox`, `radio`) używają `defaultValue`/`defaultChecked` zamiast `value`/`checked`. React traktuje je jako uncontrolled — dane ze stanu serwera nie będą reaktywne po stronie klienta (SSR → CSR hydration). |
| T-05 | **Brak ARIA dla grupy radio/checkbox** | `fieldset` z `legend` to poprawna semantyka, ale brak `aria-describedby` dla pola count (np. "8 results"). Screen reader użytkownik nie słyszy powiązania między etykietą a liczbą wyników. |
| T-06 | **Brak `id` na elementach kontrolek** | Nie ma `id` na `input` elementach i powiązanego `htmlFor` na `label` — technicznie `label` zawiera `input` więc asocjacja istnieje, ale nie jest to explicit label-for pattern. |
| T-07 | **Count `0` wyświetlany dla opcji bez danych** | Gdy `resolved.metrics` jest puste, `buildFallbackMetric()` buduje opcje z `count: 0`. Widget wyświetla "0" obok każdej opcji — to mylące (0 wyników czy niezaładowane dane?). |
| T-08 | **`applyLabel` button brak `aria-label`** | Przycisk submit nie ma aria-label opisującego jego cel w kontekście listy. Screen reader powie tylko tekst przycisku bez kontekstu którego listing query dotyczy. |
| T-09 | **Brak reset page przy filteringu (B-11 implikacja)** | Skrypt kliencki `syncListingFormToUrl` nie czyści `__page` tokenu przy submit. Przy zmianie filtrów strona zostaje na bieżącym numerze co może zwrócić pustą stronę wyników. |

---

## 4. Testowanie w przeglądarce (Admin UI)

> Status: **W TOKU**

### 4.1 Środowisko
- Admin URL: `http://localhost:5173/admin`
- Strona testowa: `TEST-LISTING-FILTERS-0516` (dedykowana, nowo tworzona)
- Sesja playwright: izolowana, nowa strona w Pages

---

## 5. Testowanie na froncie (localhost:3000)

> Status: **W TOKU**

---

## 6. Porównanie Admin vs Frontend

> Status: **W TOKU**

---

## 7. Wnioski i Rekomendacje

> Status: **W TOKU — uzupełniany po testach**

---

_Raport wstępny (analiza kodu). Uzupełniany po testach w przeglądarce._
