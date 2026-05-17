# REPORT: Listing Filters Widget

> Status: **UKOŃCZONY** | Data: 2026-05-16 | Autor: Claude Code

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

> Status: **UKOŃCZONY** | Strona testowa: `TEST-LISTING-FILTERS-0516` (ID: `c5fe0a98-1090-4a42-80f6-23f294f44a5e`)

### 4.1 Środowisko
- Admin URL: `http://localhost:5173/admin`
- Strona testowa: `TEST-LISTING-FILTERS-0516` (dedykowana, nowo tworzona)
- Sesja playwright: `listing-filters` (izolowana)
- Listing query dostępna w systemie: `House Projects Catalog Query a3f06199` (ID: `22f2ad81-9e2f-4c6f-bdf6-8bff33549b6f`)

### 4.2 Wizard Editor

**Co widziałem:**
- Sekcja "Listing query": combobox z jedną dostępną opcją — `House Projects Catalog Query a3f06199` (poprawnie ładuje przez API)
- Pierwsze otwarcie edytora: komunikat "Not authenticated" zamiast listy queries — **błąd 401 Unauthorized** na `/admin/api/listings/queries` (bug sesji admin po nawigacji)
- Po ponownym logowaniu: API działa, queries ładują się prawidłowo
- Sekcja "Runtime behavior": wszystkie pola widoczne i edytowalne (title, description, labels, toggles)
- Sekcja "Surface": 3 pola stylu z przyciskami "Clear" — poprawna spójność z innymi widgetami

**Problemy:**
- **Bug sesji (nowy)**: API `/admin/api/listings/queries` zwraca 401 przy pierwszym otwarciu edytora tuż po zalogowaniu — komponent `useListingQueries()` wywołuje `listListingQueriesCached({ force: true })` ale sesja cookie nie jest jeszcze aktywna w kontekście API. Użytkownik widzi "Not authenticated" zamiast listy.
- **E-09 (potwierdzone)**: Brak wyraźnego komunikatu "Wybierz query, aby aktywować filtr" — jest tylko mały opis sekcji "Bind facets to a single listing query source."
- **E-07 (potwierdzone)**: Wizard Editor nie zawiera FacetsEditor — użytkownik musi przejść do Visual, żeby zarządzać facetami

### 4.3 Visual Editor

**Co widziałem:**
- Sekcja wariantów: tylko jeden wariant `Default`, przycisk "Add variant preset"
- Sekcja "Facet controls": Facet 1 (Sort) — id: `sort`, kind: Sort, textarea z sortOptions w formacie `value|label|field|dir`
- Przycisk "Add facet": **klikalny, ale nie dodaje facetu** — żadna wizualna reakcja, żaden komunikat błędu

**KRYTYCZNY BUG (T-01 / E-01 potwierdzony):**
- Kliknięcie "Add facet" tworzy wewnętrznie `{id: "facet-2", kind: "checkbox", field: "", op: "in"}` ale `normalizeListingFacetConfigs` natychmiast odrzuca facet bo `field` jest pusty (`if (kind !== "sort" && !field) return`)
- **Skutek**: Nie można dodać żadnego nieSortowego facetu przez UI — checkbox/radio/range/date-range/taxonomy znikają natychmiast
- **Zmiana kind facetu sortowego na inny**: Analogicznie niemożliwa — sortowy facet nie ma `field`, po zmianie kind na checkbox, normalizacja odrzuca go, facet wraca do Sort
- **Jedyne co działa**: Edycja istniejącego Sort facetu (sortOptions textarea)

**Screenshot:** `listing-filters-05-visual-editor.png`, `listing-filters-06-facet-kind-dropdown.png`

### 4.4 Advanced Editor

**Co widziałem:**
- Facet controls: ten sam co w Visual (Sort facet z sortOptions)
- Runtime payload (read-only textarea): `{ "resolved": { "listingQueryId": "", "metrics": [], "rejectedTokens": [] } }` — ZAWSZE pusty, bo SSR nie uruchomił się w kontekście edytora
- Contract section: informacja o `listingFiltersDefaults` — tylko tekst, brak linku do dokumentacji
- Layout: Container/Padding/Margin — tokeny globalne widgetu
- Visibility: Desktop/Tablet/Mobile toggles — wszystkie włączone

**Screenshot:** `listing-filters-07-advanced-editor.png`

### 4.5 Canvas (podgląd w edytorze)

**KRYTYCZNY BUG (T-04 potwierdzony — nowy rodzaj błędu):**
- Canvas ZAWSZE wyświetla placeholder "Select a listing query in widget settings to enable runtime filters."
- **NAWET PO ZAPISANIU** strony z poprawnie skonfigurowanym `listingQueryId`
- **NAWET PO PEŁNYM RELOADU** strony edytora
- **Przyczyna (znaleziona w kodzie)**:
  ```js
  // listingFilters.tsx
  const listingQueryId = resolveOptionalText(
    normalized.resolved?.listingQueryId ?? normalized.listingQueryId
  );
  ```
  Operator `??` (nullish coalescing) działa tylko dla `null`/`undefined`. `normalized.resolved?.listingQueryId` to `""` (pusty string, bo `resolveText` zawsze zwraca string). `"" ?? fallback` → `""` (nie fallbackuje!). Potem `resolveOptionalText("")` → `undefined`. Widget zawsze widzi `undefined` jako listingQueryId.
- **Fix**: zamienić `??` na `||`: `normalized.resolved?.listingQueryId || normalized.listingQueryId`
- **Skutek UX**: Redaktor nigdy nie widzi podglądu widgetu w canvas — jedyne co widzi to placeholder. Widget jest efektywnie blind w admin preview.

**Screenshot:** `listing-filters-08-canvas-after-save.png`, `listing-filters-09-published-canvas-state.png`

---

## 5. Testowanie na froncie (localhost:3000)

> Status: **UKOŃCZONY** | Strona: `/test-listing-filters-0516`

### 5.1 Środowisko testowe
- Frontend URL: `http://localhost:3000/test-listing-filters-0516`
- Widget: `listing-filters`, query: `House Projects Catalog Query` (22f2ad81...)
- Strona opublikowana

### 5.2 Renderowanie widgetu

**Co widziałem:**
- Widget renderuje się poprawnie na froncie — SSR rozwiązuje `listingQueryId` poprawnie
- Wyświetla: tytuł "Filter results", opis, pole Search, combobox Sort z opcjami, przycisk "Apply filters"
- Informacja "Updates automatically when values change." widoczna przy przycisku (autoApply=true)
- `data-listing-widget="listing-filters"`, `data-listing-query-id="22f2ad81-..."` ustawione prawidłowo
- `data-listing-auto-apply="1"` — autoApply aktywne

**Screenshot:** `listing-filters-10-frontend-widget.png`, `listing-filters-15-frontend-clean.png`

### 5.3 Testy interakcji

**Auto-apply (Sort):**
- Zmiana sort dropdown → automatycznie buduje URL: `?lq.22f2ad81....__sort=updatedAt:desc`
- Działa poprawnie ✓

**Auto-apply (Search):**
- Wpisanie tekstu + Tab (blur) → URL aktualizuje się: `?lq.22f2ad81....__q=test`
- Działa poprawnie ✓

**Kombinacja Sort + Search:**
- Oba tokeny w URL: `?lq.22f2ad81....__q=test&lq.22f2ad81....__sort=updatedAt:desc`
- Działa poprawnie ✓

**Browser Back (popstate):**
- Powrót do poprzedniego URL przywraca poprzedni stan filtrów
- Sort combobox poprawnie wraca do "Default order"
- Działa poprawnie ✓

**Screenshot:** `listing-filters-11-frontend-auto-apply.png`, `listing-filters-12-frontend-search-active.png`, `listing-filters-13-frontend-combined-filters.png`, `listing-filters-14-frontend-popstate-back.png`

### 5.4 Dostępność (accessibility audit)

**Wyniki audytu kontrolek formularza:**
```json
[
  { "tag": "INPUT", "type": "text", "token": "__q", "id": "none", "hasAriaLabel": false, "hasLabelFor": false },
  { "tag": "SELECT", "type": "select-one", "token": "__sort", "id": "none", "hasAriaLabel": false, "hasLabelFor": false }
]
```

- Brak `id` na elementach INPUT/SELECT — potwierdza T-06
- Brak `aria-label` na elementach — potwierdza T-05
- Asocjacja label-control tylko przez wrapping `<label>` (implicit, nie explicit)
- Brak `aria-label` na `<form>`, `<section>` i `<button type="submit">` — potwierdza T-08

---

## 6. Porównanie Admin vs Frontend

> Status: **UKOŃCZONY**

### 6.1 Diagram przepływu danych

```
Admin Canvas (edytor)
  └── ZAWSZE pokazuje placeholder (bug ?? vs || w resolveOptionalText fallback)
  └── Nieużywalny do podglądu — blokuje feedback dla redaktora

Admin Preview Dialog
  └── NIE TESTOWANO (widget nie jest dostępny przez Preview w tym stanie)

Frontend (localhost:3000)
  └── SSR rozwiązuje listingQueryId poprawnie
  └── Widget renderuje się i działa w pełni
```

### 6.2 Tabela porównawcza

| Aspekt | Admin Canvas | Frontend |
|--------|-------------|----------|
| Placeholder gdy brak query | ✓ Pokazuje | ✓ Pokazuje |
| Widżet z query | ✗ Nadal placeholder (bug) | ✓ Działa |
| Tytuł/opis widoczny | ✗ (placeholder) | ✓ |
| Search field | ✗ (placeholder) | ✓ |
| Sort combobox | ✗ (placeholder) | ✓ |
| Auto-apply URL sync | ✗ (nie testowalne) | ✓ |
| Browser Back | ✗ | ✓ |
| Data-atrybuty w DOM | ✓ (data-listing-query-id="") | ✓ (poprawne UUID) |

### 6.3 Rozbieżności i ich przyczyny

**Admin Canvas ≠ Frontend (krytyczna rozbieżność):**
- **Przyczyna**: Bug `??` vs `||` w `normalizeListingFiltersData` przy odczycie `listingQueryId`. Admin canvas używa `ListingFiltersBlock` bezpośrednio z `data` widgetu, gdzie `resolved.listingQueryId` jest `""` (empty string, nie null). Operator `??` nie fallbackuje na `listingQueryId`.
- **Frontend**: SSR uruchamia resolver który wypełnia `resolved.listingQueryId` poprawnym UUID — canvas nie ma tego problemu.
- **Fix**: Zmienić `??` na `||` w lini:
  ```ts
  const listingQueryId = resolveOptionalText(
    normalized.resolved?.listingQueryId ?? normalized.listingQueryId
  );
  ```

---

## 7. Wnioski i Rekomendacje

### 7.1 Priorytety napraw (po testach)

**Krytyczne (blokują podstawowe użycie):**

1. **Bug `??` → `||` w canvas** (nowy, znaleziony w testach): Admin canvas ZAWSZE pokazuje placeholder zamiast widgetu. Fix jednoliniowy: `??` → `||`. Blokuje cały feedback redaktora.

2. **Niemożność dodania facetu** (T-01/E-01 potwierdzone): "Add facet" tworzy checkbox z pustym `field`, normalizacja odrzuca go natychmiast, żadnego komunikatu błędu. **Użytkownik nie może dodać żadnego facetu innego niż Sort przez UI.** Fix: pozwolić polu `field` być pustym w edytorze (pomijać normalizację dla stanów edycji in-progress) LUB walidować i pokazywać komunikat.

3. **Zmiana kind facetu Sort → inny** (powiązane z #2): Sortowy facet nie ma `field`, zmiana kind na checkbox powoduje jego natychmiastowe zniknięcie. Fix: przy zmianie kind ustaw `field` na pusty string i pokaż walidację zamiast cicho odrzucać.

4. **Bug sesji: 401 na API listings/queries** (nowy, znaleziony w testach): Pierwsze otwarcie edytora po zalogowaniu zwraca 401 z API. Redaktor widzi "Not authenticated" w dropdown — musi przeładować. Fix: retry logic lub opóźnienie wywołania API do momentu stabilizacji sesji.

**Ważne (ograniczają szeroki zakres konfiguracji):**

5. **B-05/B-06 — Range/Date-range jako text input**: Użytkownik musi wpisać `min,max` lub `YYYY-MM-DD,YYYY-MM-DD` w pole tekstowe. Brak slidera i date picker blokuje zastosowanie dla normalnych redaktorów.

6. **B-02 — Brak paginacji**: Token `__page` istnieje w kontrakcje ale nie ma żadnej kontrolki paginacji w widgecie. Listing filters bez paginacji jest niepełny.

7. **B-03 — Brak wskaźnika aktywnych filtrów**: Brak licznika aktywnych filtrów, tagów wyborów, przycisku "Clear all". Użytkownik nie wie jakie filtry są aktywne bez czytania URL.

8. **B-11 — Brak reset `__page` przy zmianie filtrów**: Skrypt nie zeruje `__page` przy submit filtrów. Krytyczne dla paginowanych list.

9. **B-01 — Tylko jeden wariant (`default`)**: Brak `horizontal` (filtry w wierszu), `sidebar` (sticky panel), `drawer` (mobilny). Wszystkie typowe wzorce UX dla listingów są nieobsługiwane.

**UX informacyjne:**

10. **E-07 (potwierdzone)**: Wizard nie zawiera FacetsEditor — redaktor musi przełączyć się na Visual, żeby dodać facety. Należy dodać FacetsEditor do Wizard lub wyraźnie kierować do Visual tab.

11. **E-04 (potwierdzone)**: Tekst opcji/sortOptions w formacie `value|label` / `value|label|field|dir` — nieintuicyjny, bez walidacji inline. Brak wizualnego edytora par.

12. **E-12 (potwierdzone)**: Przycisk "Apply filters" widoczny przy `autoApply=true` z opisem "Updates automatically" — zbędny przycisk i myląca informacja obok niego.

13. **T-07 (potwierdzone)**: Count `0` dla każdej opcji gdy metrics nie są załadowane — mylące (zero wyników vs dane niezaładowane).

**Dostępność:**

14. **T-05/T-06/T-08 (potwierdzone)**: Brak `id` na kontrolkach, brak `aria-label`, brak `aria-label` na form i button submit. Nieakceptowalne dla zastosowań wymagających WCAG 2.1 AA.

### 7.2 Podsumowanie stanu jakości

| Obszar | Ocena | Komentarz |
|--------|-------|-----------|
| Funkcjonalność core (frontend) | ✅ Działa | SSR, URL sync, popstate — wszystko poprawne |
| Admin Canvas Preview | ❌ Zepsuty | Zawsze placeholder (bug `??` vs `||`) |
| Wizard Editor | ⚠️ Niekompletny | Brak FacetsEditor, bug sesji 401 |
| Visual Editor | ❌ Krytyczny bug | Nie można dodać facetu (normalizacja odrzuca puste field) |
| Advanced Editor | ⚠️ Ograniczony | Runtime payload zawsze pusty, sortOptions format nieintuicyjny |
| Zakres konfiguracyjny | ⚠️ Wąski | Tylko Sort facet działa przez UI; brak Range slider/date picker/pagination/wariantów |
| Dostępność | ⚠️ Luki | Brak id/aria-label na kontrolkach |
| Admin ↔ Frontend spójność | ❌ Rozbieżność | Canvas pokazuje placeholder, frontend działa prawidłowo |

---

## 8. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `listing-filters-01-canvas-empty-state.png` | Canvas z placeholderem (brak listingQueryId) |
| `listing-filters-02-wizard-editor.png` | Wizard Editor - pełny widok |
| `listing-filters-03-wizard-editor-dropdown.png` | Dropdown listing query z dostępnymi opcjami |
| `listing-filters-04-wizard-query-selected.png` | Po wybraniu query — canvas nadal placeholder |
| `listing-filters-05-visual-editor.png` | Visual Editor z sekcją Facet controls |
| `listing-filters-06-facet-kind-dropdown.png` | Dropdown rodzaju facetu (6 opcji) |
| `listing-filters-07-advanced-editor.png` | Advanced Editor - runtime payload i contract |
| `listing-filters-08-canvas-after-save.png` | Canvas po zapisaniu — nadal placeholder |
| `listing-filters-09-published-canvas-state.png` | Canvas po publikacji — nadal placeholder |
| `listing-filters-10-frontend-widget.png` | Frontend: widget działa prawidłowo po SSR |
| `listing-filters-11-frontend-auto-apply.png` | Frontend: auto-apply URL sync po zmianie sort |
| `listing-filters-12-frontend-search-active.png` | Frontend: search pole aktualizuje URL |
| `listing-filters-13-frontend-combined-filters.png` | Frontend: połączony search + sort w URL |
| `listing-filters-14-frontend-popstate-back.png` | Frontend: Browser Back przywraca poprzedni stan |
| `listing-filters-15-frontend-clean.png` | Frontend: czysty widok widgetu |

---

_Raport ukończony po pełnym cyklu testów: analiza kodu + testy Admin UI + testy Frontend + porównanie._

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Listing Filters is classification only.
  Widget-owned follow-up scope continues through the `TASK-273` family.
- Shared rows that match existing TASK-256 truthful-control or accessibility
  mechanisms remain referenced by `TASK-256-07` and `TASK-256-08`.
