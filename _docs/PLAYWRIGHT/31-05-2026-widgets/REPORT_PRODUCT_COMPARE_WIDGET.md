# RAPORT: Product Compare Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Product Compare`
> **Admin page id:** `28b1a403-1c06-4eee-8880-6696d63605bd`
> **Public route:** `/audit-31-05-product-compare`
> **Playwright sessions:** `codex-31-05-ui-product-compare`, `codex-31-05-ui-product-compare-variants`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem
`product-compare`. Efekt sprawdzano w admin live preview przez
`data-product-compare-*`, tabele/wiersze/karty, conditional controls,
read-only Advanced summaries oraz publiczny SSR pod
`http://localhost:3000/audit-31-05-product-compare`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Publiczny route pozostal w baseline query z trzema fixture produktami.

## Pokrycie UI

Przetestowane:

- Wizard: limit, search, collections, status filters, sort field/direction,
  backend preview refresh przez aktywny setup flow,
- Visual: Matrix/Compact/Cards variants, exact selected products + order,
  section title/description/caption, caption visibility, attribute rows,
  labels, product image/link/CTA toggles, money locale, compact quantity,
  featured product, sticky header, empty state, table/header/empty colors
  set/clear,
- Advanced: preview status + refresh action, source summary, surface summary,
  contract summary, read-only contract,
- public SSR baseline,
- targeted Bun/Vitest suites for renderer, editor, preview client/route,
  commerce runtime and public renderer.

## Fixture danych

Lokalne commerce API mialo 3 produkty i 2 kolekcje:

- `Fixture Garden Suite` — `36e164b8-bd47-4b29-ad99-b4ddf8cc2fbb`, `$159.00`,
  quantity `1`, in stock,
- `Fixture Starter Home` — `0f9d3f51-a4bb-4ad0-8604-12dddfb69729`, `$199.00`,
  quantity `3`, in stock,
- `Fixture Urban Loft` — `86b4e190-b7b6-45f4-845f-bef9f6125190`, `$299.00`,
  quantity `8`, backorder,
- collections: `Fixture Homes`, `Fixture Lofts`.

Brak bylo product detail route i obrazow produktu w resolved rows, wiec
wlaczenie `Show product images`, `Link product titles` i `CTA mode=View product`
nie moglo wyrenderowac realnych `img` ani `a`. Renderer poprawnie zdegradowal
te opcje do tekstu.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-product-compare` | Nie dotyczy admin. | HTTP 200; `data-widget="product-compare"`, `count=3`, `aria-label="Product comparison"`, matrix `text-sm`, caption `sr-only`, 4 default rows. | Dziala | `ProductCompareBlock` renderuje deterministic marker i fallback caption/a11y. | Brak. |
| Admin initial preview | Otwarta strona i zaznaczony blok | Visual ma 10 widget sections + shared block layout/visibility; root `count=3`, matrix, produkty Garden/Starter/Urban, ceny/stock/quantity. | Public baseline taki sam query. | Dziala | Preview hydratowany backend-owned commerce fixture. | Brak. |
| Wizard initial | `Run setup again` | Wizard ma `comparison-source` i `limit-guidance`; controls: limit/search/collections/sort/status; preview zostaje populated `3`. | Nie publikowano tej zmiany. | Dziala | Wizard owns query setup; curation jest wyraznie przeniesiona do Visual. | Brak. |
| Wizard search | Search `loft` | Preview `count=1`, header tylko `Fixture Urban Loft`, rows `$299 / $349 / Backorder / 8`. | Nie publikowano tej zmiany. | Dziala | Source search trafia do backend preview resolvera. | Brak. |
| Wizard conflicting filters | Collection `Fixture Homes`, status `draft`, sort `Price desc` przy search `loft` | Query preview przechodzi w empty: `No products to compare`. | Nie publikowano tej zmiany. | Dziala | Filtry realnie zawedzaja query do 0 produktow. | Brak. |
| Variants on populated data | Osobny replay: Matrix -> Compact -> Cards -> Matrix na baseline query | Compact zmienia table class `text-sm -> text-xs`; Cards usuwa table i renderuje 3 `article[data-product-id]`; Matrix wraca do table. | Public baseline matrix. | Dziala | `variant` jest Visual-owned i mapuje sie na trzy render branches. | Brak. |
| Section copy + caption | Title `31-05 Product Compare Audit`, opis, caption, `Hide caption visually` OFF | Root przechodzi na `aria-labelledby`, renderuje `h2`; caption staje sie widoczny (`px-3 py-2...`). | Nie publikowano tej zmiany. | Dziala | Section copy zapisuje `section.*`; renderer uzywa `headingId` i caption class. | Brak. |
| Attribute rows | Wlaczono slug/excerpt, ukryto price i przywrocono price | Po query restore populated table ma rows: `Audit price`, `Compare at`, `Stock`, `Audit quantity`, `Slug`, `Excerpt`. | Nie publikowano tej zmiany. | Dziala | `updateRowVisibility` mutuje `rows`, a normalizer trzyma legacy `fields` w sync. | Brak. |
| Labels | Zmieniono attribute header, price, quantity, backorder | Populated table pokazuje `Audit attribute`, `Audit price`, `Audit quantity`; Urban stock pokazuje `Ships soon`. | Nie publikowano tej zmiany. | Dziala | Label fallbacks sa bounded i renderer czyta normalized labels. | Brak. |
| Product columns: images/title links/CTA | Wlaczono images, linked titles, `CTA mode=View product`, label `Inspect product` | Przy productHref/image null root dalej ma `linkCount=0`, `imgCount=0`; editor pokazuje guidance o Site Settings/detail route. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Renderer wymaga safe relative `productHref` i `imageUrl`; bez nich degraduje do tekstu. | Dodac fixture z product detail route i obrazami do pelnego browser proof. |
| Formatting | Locale `Polish (Poland)`, quantity `Compact threshold`, limit `2` | Prices `159,00 USD / 199,00 USD / 299,00 USD`; quantity `1 / 2+ / 2+`. | Nie publikowano tej zmiany. | Dziala | `formatCommerceMoney` i `formatProductCompareQuantity` czytaja bounded format enum. | Brak. |
| Layout | Featured `Fixture Urban Loft`, sticky header ON | Urban kolumna ma `Featured` i klasy emerald; sticky header daje `sticky left-0 top-0 z-20` / sticky th. | Nie publikowano tej zmiany. | Dziala | `resolveFeaturedProductId` zabezpiecza id, sticky dziala tylko matrix/compact. | Brak. |
| Exact selected products | Wybrano Starter + Garden przy aktywnych konfliktowych query filters | Root `count=2`, order `Starter / Garden`, mimo ze query filters same dawaly `0`. | Nie publikowano tej zmiany. | Dziala rendererowo | `source.productIds` tworzy exact selected set i ignoruje query filters. | Brak dla renderera; patrz `PC-31-05-01` dla Advanced. |
| Empty state | Usunieto selected products przy konfliktowych filtrach, ustawiono custom title/description | Root `count=0`, `role=status`, tekst `No audit comparisons / Adjust compare filters for this audit.` | Nie publikowano tej zmiany. | Dziala | Empty branch bierze `emptyState.*` i aria-live. | Brak. |
| Surfaces | Ustawiono 5 kolorow: table bg/border, header bg, empty bg/border | Editor `selectedColorCount=5`; table scroll region ma `background-color: rgb(248,250,252); border-color: rgb(203,213,225)`. | Nie publikowano tej zmiany. | Dziala | SharedColorControl zapisuje swatch-only values; renderer kompaktuje style. | Brak. |
| Clear surfaces | Clear dla wszystkich 5 kolorow | Editor `themeDefaultCount=5`; table style wraca do pustego stringa i legacy theme classes. | Nie publikowano tej zmiany. | Dziala | `clearStyle` usuwa klucze z `style` zamiast zapisywac sentinel. | Brak. |
| Advanced read-only | Klik `Advanced` | Sekcje: preview status, source summary, surface summary, contract summary + builder summaries; `writableControls=0`; refresh jest jedynym action. | Nie dotyczy. | Dziala | Advanced sklada `ReadonlyWidgetSummaryRow`, bez write controls. | Brak. |
| Advanced source summary: query | Po restore do query | Pokazuje `Source mode: Query results`, `Product limit: 3 products`, `Search: None`, `Collections: No collection filter`, `Status: Public-ready default`, `Sort: Title, A to Z`. | Nie dotyczy. | Dziala | Summary zgadza sie z aktywnym query state. | Brak. |
| Advanced source summary: exact selected set | Przy `source.productIds` + zapisanych query filters | Pokazuje `Source mode: 2 selected products in manual order`, ale tez `Search: Configured`, `Collections: 1 collection selected`, `Status filters: 1 status filter selected`; tylko Sort jest oznaczony jako ignored. | Nie dotyczy. | Nie dziala jako diagnostyka | Runtime ignoruje search/collections/status przy productIds, wiec Advanced sugeruje aktywne filtry, ktore nie uczestnicza w resolverze. | Patrz `PC-31-05-01`. |

## Znaleziska do poprawy

### PC-31-05-01 — Advanced raportuje ignorowane query filters jako aktywne przy exact selected products

**Objaw:** UI celowo ustawil query, ktore daje `0` wynikow:

- `search=loft`,
- `collection=Fixture Homes`,
- `status=draft`,
- `sort=Price desc`.

Po wybraniu w Visual konkretnych produktow (`Starter Home`, `Garden Suite`)
renderer poprawnie pokazal `count=2` w kolejnosci manualnej. Advanced pokazal
jednak:

- `Source mode: 2 selected products in manual order`,
- `Product limit: 2 products`,
- `Search: Configured`,
- `Collections: 1 collection selected`,
- `Status filters: 1 status filter selected`,
- `Sort: Ignored while selected products are used`.

To jest niespojne: sort jest oznaczony jako ignorowany, ale search,
collections i status wygladaja jak aktywne, mimo ze exact selected set je
pomija.

**Dlaczego:** `buildProductCompareQueryInput` przy `productIds.length > 0`
zwraca `filters: []` i `pagination.limit = productIds.length`
(`core/widgets/core/productCompare.tsx:812-833`). Advanced `QuerySummarySection`
ma warunek dla source mode i sortu, ale Search/Collections/Status zawsze czytaja
surowy normalized source (`ProductCompareEditors.tsx:426-458`).

**Jak naprawic:**

1. W `QuerySummarySection` wprowadzic helper typu
   `const usesSelectedProducts = selectedCount > 0`.
2. Dla `usesSelectedProducts` opisac Search/Collections/Status jako
   `Ignored while selected products are used` albo
   `Saved query filter (inactive in selected-products mode)`.
3. Zostawic wartosci query widoczne tylko jako nieaktywne, zeby autor nie
   stracil informacji o zapisanym stanie.
4. Dodac regresje w
   `tests/vitest/ui/product-compare-editor-wave.test.tsx`: ustawic
   `source.productIds`, `source.search`, `source.collectionIds`,
   `source.status`, wyrenderowac Advanced i sprawdzic, ze Search/Collections/
   Status nie sa opisane jako aktywne bez informacji o ignorowaniu.

## Public baseline

`curl http://localhost:3000/audit-31-05-product-compare` zwrocil HTTP 200 i SSR
HTML z:

- `data-widget="product-compare"`,
- `data-product-compare-count="3"`,
- `aria-label="Product comparison"`,
- scroll region `data-product-compare-scroll-region="table"`,
- table class `min-w-full text-sm`,
- caption `Product comparison` z `sr-only`,
- products: `Fixture Garden Suite`, `Fixture Starter Home`, `Fixture Urban Loft`,
- rows: `Price`, `Compare at`, `Stock`, `Quantity`,
- `linkCount=0`, `imgCount=0`.

## Ograniczenia fixture

- Brak product detail route i `productHref`, wiec title links i CTA nie mogly
  przejsc do safe-link branch.
- Brak image URLs, wiec `Show product images` nie moglo wyrenderowac obrazow.
- Brak produktu `out_of_stock`, wiec label `Out-of-stock` nie mial widocznej
  komorki do potwierdzenia browserowo.
- Glowny przebieg kliknal warianty w stanie empty po celowo konfliktowych
  filtrach; osobny replay `codex-31-05-ui-product-compare-variants` potwierdzil
  Matrix/Compact/Cards na populated query.

## Kod-owner

- `core/widgets/core/productCompare.tsx`
  - schema/defaults/contract: okolice linii 15-335,
  - normalizacja rows/labels/format/header/section: okolice linii 650-810,
  - exact selected product query semantics: okolice linii 812-833,
  - renderer table/cards/empty/a11y: okolice linii 836-1228.
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
  - preview status card: okolice linii 358-410,
  - Advanced source summary bug: okolice linii 426-458,
  - Wizard preservation of `source.productIds`: okolice linii 511-520,
  - Visual controls: okolice linii 560-970.
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
  - najlepsze miejsce na regresje Advanced inactive query filters: okolice
    linii 265-380.
- `tests/vitest/widgets/productCompare.test.tsx`
  - renderer/domain coverage, including exact selected product query stripping.
- `tests/integration/routes/productComparePreview.test.ts`
  - internal preview route and error mapping coverage.

## Rekomendacje

1. Naprawic `PC-31-05-01` w Advanced bez zmiany renderer/runtime query
   semantics.
2. Dodac commerce fixture z product detail route, safe `productHref`, obrazami i
   minimum jednym `out_of_stock` produktem.
3. Przy kolejnym browser pass dopisac visible proof dla product title links,
   CTA, image alt i out-of-stock label.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-product-compare run-code --filename .tmp/playwright-product-compare-compact.js` — passed.
- `playwright-cli -s=codex-31-05-ui-product-compare-variants run-code --filename .tmp/playwright-product-compare-variants.js` — passed.
- Admin console po glownym przebiegu: `Errors: 1`, `Warnings: 0`; blad:
  `Failed to load resource: the server responded with a status of 404 (Not Found)`.
  Nie zostal powiazany z Product Compare jako widget-owned crash.
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx` — passed, 8 tests.
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx` — passed, 4 tests.
- `bun run test:vitest -- tests/vitest/ui/product-compare-admin-preview.test.tsx` — passed, 1 test.
- `bun run test:vitest -- tests/vitest/admin/productComparePreviewClient.test.ts` — passed, 1 test.
- `bun test ./tests/integration/routes/productComparePreview.test.ts` — passed, 2 tests.
- `bun test ./tests/unit/commerce/commerceWidgetRuntime.test.ts` — passed, 9 tests.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` — passed, 16 tests.
- `curl http://localhost:3000/audit-31-05-product-compare` — HTTP 200, public baseline matrix.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
