# RAPORT: Product Table Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Product Table`
> **Admin page id:** `759a41bc-a08b-432f-b43b-0ea07a41be67`
> **Public route:** `/audit-31-05-product-table`
> **Playwright session:** `codex-31-05-ui-product-table`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem
`product-table`. Efekt sprawdzano w admin live preview przez
`data-product-table-*`, naglowki/wiersze tabeli, conditional public controls,
read-only Advanced summary oraz publiczny SSR pod
`http://localhost:3000/audit-31-05-product-table`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Publiczny route pozostal w baseline query z trzema fixture produktami.

## Pokrycie UI

Przetestowane:

- Wizard: limit/search/source collections/status filters, sort field/direction,
  restore source, populated preview i empty state,
- Visual: wariant, density, row treatment, max width, alignment, typography,
  hover/sticky header, section header, wszystkie kolumny i labels, public
  search/filter/sort/pagination controls, export, money locale/display,
  linked column/action, empty copy, surface colors set/clear,
- Advanced: runtime status, source/query summary, read-only contract,
- public SSR baseline,
- targeted Bun/Vitest suites for renderer, editor, preview client/route,
  runtime pagination, shared commerce runtime and public renderer.

## Fixture danych

Lokalne commerce API mialo 3 produkty i 2 kolekcje:

- `Fixture Garden Suite` - `$159.00`, compare `$179.00`, published, in stock
  quantity `1`, collections `2`,
- `Fixture Urban Loft` - `$299.00`, compare `$349.00`, published, backorder
  quantity `8`, collections `1`,
- `Fixture Starter Home` - `$199.00`, compare `$249.00`, published, in stock
  quantity `3`, collections `1`,
- collections: `Fixture Homes`, `Fixture Lofts`.

Brak bylo obrazow produktu i realnej product detail route w resolved rows, wiec
`Show image`, `Linked column` i `Show action` mogly zostac potwierdzone tylko do
poziomu poprawnej degradacji: `No image`, brak unsafe/broken anchors i pusty
action cell `-`.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-product-table` | Nie dotyczy admin. | HTTP 200; `data-widget="product-table"`, `count=3`, `page=1`, `variant=default`, `density=comfortable`, 5 default columns, 3 produkty. | Dziala | `ProductTableBlock` renderuje deterministic markers i fallback `aria-label="Product table"`. | Brak. |
| Admin initial preview | Otwarta strona i zaznaczony blok | Visual ma preview ready `Resolved items: 3 · Total: 3`; root `count=3`, columns Product/Slug/Price/Status/Stock. | Public baseline taki sam query. | Dziala | Backend preview hydratuje commerce fixture przez Product Table preview client. | Brak. |
| Wizard search | Search `loft` | Preview `count=1`, tylko `Fixture Urban Loft`, cena `$299.00`, stock `Backorder`. | Nie publikowano tej zmiany. | Dziala | Source search trafia do backend preview resolvera. | Brak. |
| Wizard empty query | Status `draft` przy source collections | Preview `count=0`; pokazuje public controls shell z Collections i empty copy `No products available / Publish products or adjust source query.` | Nie publikowano tej zmiany. | Dziala | Status filter realnie zawedza query do 0 produktow, empty branch zachowuje public filters. | Brak. |
| Wizard restore + sort | Restore published source, sort `Price descending` | Preview `count=3`; order `Urban / Starter / Garden`; Price header ma `aria-sort="descending"`. | Nie publikowano tej zmiany. | Dziala | Sort field/direction sa source-owned i mapuja sie na runtime order oraz `aria-sort`. | Brak. |
| Layout and style | `compact`, density `spacious`, rows `striped`, typography `prominent`, width `content`, align `center`, hover/sticky ON | Root markers: `variant=compact`, `density=spacious`, `row-treatment=striped`, `typography=prominent`, `max-width=content`, `align=center`, `hover=true`, `sticky=true`. | Public baseline bez zmian. | Dziala | Visual style enums mapuja sie na bounded data markers/classes. | Brak. |
| Section header + a11y | Title `31-05 Product Table Audit`, description custom | Root accessible name przechodzi na title; table dalej ma caption fallback flow. | Public baseline `aria-label="Product table"`. | Dziala | Renderer uzywa `header.title` jako preferowanego accessible label. | Brak. |
| Columns expanded | Wlaczono Image, Excerpt, Compare at, Collections; stock quantity zostal widoczny | 9 columns: Image/Product/Excerpt/Slug/Price/Compare at/Status/Stock/Collections; rows maja `No image`, excerpt, compare price i collection count. | Nie publikowano tej zmiany. | Dziala | Shared `productTableColumns` registry i field normalizer zachowuja guarded column model. | Brak. |
| Column labels | Zmieniono Product, Price, Stock, Collections labels | Headers pokazaly `Audit product`, `Audit price`, `Audit stock`, `Audit collections`. | Nie publikowano tej zmiany. | Dziala | Labels sa Visual-owned i renderowane z normalized label map. | Brak. |
| Public controls: search/sort/paged | Search ON, collection filter ON, sorting `interactive`, pagination `paged`, page size `2` | Search input widoczny, Collections fieldset widoczny po source collections, 5 sort links, Price `aria-sort=descending`; preview summary `Previous and next`. | Nie publikowano tej zmiany. | Dziala | Renderer buduje block-scoped query keys i linki sort/pagination. | Brak. |
| Public controls: load more | Pagination `load-more` | Preview summary zmienia sie na `Load more link`; data nadal `count=3` w admin preview. | Nie publikowano tej zmiany. | Dziala | `controls.pagination` rozroznia paged vs load-more branch. | Brak. |
| Export + money format | Locale `pl-PL`, display `code`, export ON, label `Download audit CSV` | Prices `299,00 USD / 199,00 USD`; export link `Download audit CSV` z `download="31-05-product-table-audit.csv"`. | Nie publikowano tej zmiany. | Dziala | Money formatter bierze bounded locale/display, CSV filename pochodzi z header title. | Brak. |
| Links and actions | Linked column/action ON | Przy braku safe `productHref` linki cial tabeli pozostaly niewyrenderowane (`bodyLinkCount=0`), action cells `-`; sort/export links nadal istnieja. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Renderer suppressuje unsafe/missing product links zamiast produkowac broken anchors. | Dodac fixture z product detail route do pelnego browser proof. |
| Surface colors set | Ustawiono 5 surface colors | Editor `selectedColorCount=5`; scroll region `background-color: rgb(248, 250, 252); border-color: rgb(203, 213, 225)`. | Nie publikowano tej zmiany. | Dziala | Shared color control zapisuje clearable style values; renderer kompaktuje inline styles. | Brak. |
| Surface colors clear | Clear dla wszystkich 5 powierzchni | Editor `themeDefaultCount=5`, `selectedColorCount=0`; scroll region wraca do pustego style. | Nie publikowano tej zmiany. | Dziala | `clearStyle` usuwa override'y i pozwala wrocic do theme defaults. | Brak. |
| Empty state custom | Search `zzzznomatch`, custom title/description | Root `count=0`; `No audit products / Adjust table filters for this audit.`; search/collections/status controls zostaja widoczne. | Nie publikowano tej zmiany. | Dziala | Empty branch bierze `emptyState.*` i nie usuwa public controls. | Brak. |
| Advanced read-only | Klik `Advanced` | Sekcje: runtime status, query summary, shared block layout/visibility summary; inputs/selects/textarea dla configu `0`; refresh preview jako diagnostic action. | Nie dotyczy. | Dziala | Advanced renderuje `ReadonlyWidgetSummaryRow` i nie wystawia raw JSON payloadow. | Brak. |
| Advanced visitor controls: no source collections | W Visual wlaczono `Show collection filter`, ale source nie mial jeszcze dostepnych kolekcji | Public controls nie pokazaly `Collections` fieldset (`fieldsets=[]`), ale Advanced pokazal `Visitor controls: Collection filters`. | Nie dotyczy. | Nie dziala jako diagnostyka | Renderer bramkuje collection filter przez `availableCollections.length > 1`, a Advanced czyta tylko zapisany toggle. | Patrz `PT-31-05-01`. |

## Znaleziska do poprawy

### PT-31-05-01 - Advanced raportuje Collection filters jako aktywne, gdy renderer je ukrywa bez dostepnych kolekcji

**Objaw:** w Visual wlaczono `Show collection filter` zanim source query
udostepnilo kolekcje. Admin preview/public renderer nie pokazal grupy
`Collections` (`fieldsets=[]`), co jest poprawne: bez minimum dwoch
dostepnych kolekcji visitor filter bylby pusty albo mylacy. Po przejsciu do
Advanced query summary pokazal jednak:

- `Collection scope: All available collections`,
- `Visitor controls: Collection filters`,
- `Page size: Pagination disabled`.

To wyglada jak aktywna kontrolka widoczna dla odwiedzajacego, mimo ze runtime
jej nie renderuje.

**Dlaczego:** runtime branch liczy widocznosc kontrolki z realnej dostepnosci
opcji:

- `controls.showCollectionFilter && availableCollections.length > 1`
  w `core/widgets/core/productTable.tsx:2141-2144`.

Advanced summary buduje `Visitor controls` tylko z saved toggles:

- `controls.showCollectionFilter ? "Collection filters" : null`
  w `core/admin/ui/widgets/editors/ProductTableEditors.tsx:543-579`.

Przez to Advanced myli saved intent z aktywnym public runtime state.

**Jak naprawic:**

1. Rozszerzyc `summarizeProductTableSource` o runtime availability z
   `normalized.resolved?.runtime.availableCollections` i
   `availableStatuses`.
2. Dla wlaczonych, ale niewidocznych filtrkow pokazac jawny status typu
   `Collection filters saved, inactive until at least two collections resolve`.
3. Zachowac saved toggle w diagnostyce, ale nie nazywac go aktywna visitor
   control bez warunku runtime.
4. Dodac regresje w `tests/vitest/ui/product-table-editor-wave.test.tsx`:
   Advanced z `controls.showCollectionFilter=true` i pustym
   `resolved.runtime.availableCollections` nie moze raportowac samego
   `Collection filters` bez informacji o nieaktywnosci.

## Public baseline

`curl http://localhost:3000/audit-31-05-product-table` zwrocil HTTP 200 i SSR
HTML z:

- `data-widget="product-table"`,
- `data-product-table-count="3"`,
- `data-product-table-page="1"`,
- `data-product-table-variant="default"`,
- `data-product-table-density="comfortable"`,
- `data-product-table-row-treatment="plain"`,
- `data-product-table-typography="balanced"`,
- `data-product-table-max-width="full"`,
- `data-product-table-align="left"`,
- `data-product-table-hover="false"`,
- `data-product-table-sticky="false"`,
- `aria-label="Product table"`,
- scroll region `data-product-table-scroll-region="table"`,
- columns: `Product`, `Slug`, `Price`, `Status`, `Stock`,
- products: `Fixture Garden Suite`, `Fixture Urban Loft`,
  `Fixture Starter Home`.

## Ograniczenia fixture

- Brak image URLs, wiec image column potwierdzono przez fallback `No image`,
  nie przez realne `img`.
- Brak safe `productHref` w admin resolved rows, wiec linked product/slug
  cells i action CTA poprawnie zdegradowaly do tekstu/pustego action cell.
- Brak produktu `draft`/`archived` w public-ready fixture, wiec status filters
  dla tych wartosci potwierdzono przez empty state.
- Admin console mial jeden powtarzalny app-level `404`, bez widget-owned crash.

## Kod-owner

- `core/widgets/core/productTable.tsx`
  - schema/defaults i controls: okolice linii 150-430,
  - normalizacja controls/style/source: okolice linii 820-930,
  - renderer/public controls gate: okolice linii 2130-2154,
  - public controls form/sort/pagination/export: okolice linii 2156-2350.
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
  - preview state orchestration: okolice linii 390-470,
  - Advanced source summary bug: okolice linii 543-579,
  - Visual public controls: okolice linii 600-640,
  - Advanced readonly rows: okolice linii 1190-1252.
- `tests/vitest/ui/product-table-editor-wave.test.tsx`
  - najlepsze miejsce na regresje Advanced inactive collection filter:
    okolice linii 780-850.
- `tests/vitest/widgets/productTable.test.tsx`
  - renderer/domain coverage.
- `tests/integration/routes/productTablePreview.test.ts`
  - internal preview route and error mapping coverage.
- `tests/integration/runtime/product-table-runtime-pagination.test.ts`
  - public SSR query/pagination/sort/filter coverage.

## Rekomendacje

1. Naprawic `PT-31-05-01` jako Advanced diagnostics fix bez zmiany runtime
   renderera.
2. Dodac commerce fixture z safe product detail route i obrazami, zeby browser
   pass potwierdzal product cell links, slug links, action CTA, `target/rel` i
   image alt.
3. Rozszerzyc Advanced summary o rozroznienie `saved control` vs `visible
   visitor control` takze dla status filter, bo status fieldset rowniez zalezy
   od `availableStatuses.length > 1`.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-product-table run-code --filename .tmp/playwright-product-table-compact.js` - passed.
- Admin console po przebiegu: `Errors: 1`, `Warnings: 0`; blad:
  `Failed to load resource: the server responded with a status of 404 (Not Found)`.
  Nie zostal powiazany z Product Table jako widget-owned crash.
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx` - passed, 24 tests.
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx` - passed, 6 tests.
- `bun run test:vitest -- tests/vitest/admin/productTablePreviewClient.test.ts` - passed, 1 test.
- `bun test ./tests/integration/routes/productTablePreview.test.ts` - passed, 2 tests.
- `bun test ./tests/integration/runtime/product-table-runtime-pagination.test.ts` - passed, 2 tests.
- `bun test ./tests/unit/commerce/commerceWidgetRuntime.test.ts` - passed, 9 tests.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` - passed, 16 tests.
- `curl http://localhost:3000/audit-31-05-product-table` - HTTP 200, public baseline query.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
