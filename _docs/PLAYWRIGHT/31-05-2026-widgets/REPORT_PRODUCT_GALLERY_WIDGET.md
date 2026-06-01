# RAPORT: Product Gallery Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Product Gallery`
> **Admin page id:** `2f91fa71-f18c-40a6-9881-8aa9ccc55931`
> **Public route:** `/audit-31-05-product-gallery`
> **Playwright session:** `codex-31-05-ui-product-gallery`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem
`product-gallery`. Efekt sprawdzano w admin live preview przez
`data-product-gallery-*`, kolejnosc kart, conditional controls, read-only
Advanced summaries oraz publiczny SSR pod
`http://localhost:3000/audit-31-05-product-gallery`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Publiczny route pozostal w baseline query z trzema fixture produktami i bez
skonfigurowanej sciezki detalu produktu.

## Pokrycie UI

Przetestowane:

- Wizard: limit, search, collections, status filters, sort field/direction,
  min/max price, stale preview, `Refresh products`,
- Visual: Cards/Compact variants, header + accessible name, card field toggles,
  CTA label/style/hidden state, manual curation + order, more-products action,
  page destination picker, empty state copy, card/empty colors set/clear,
  columns and card style,
- Advanced: product behavior, source summary, preview status, surface summary,
  contract summary, read-only contract,
- public SSR baseline,
- targeted Bun/Vitest suites for renderer, editor, preview route, shared
  commerce controls and public renderer.

## Fixture danych

Lokalne commerce API mialo 3 produkty i 2 kolekcje:

- `Fixture Garden Suite` — `36e164b8-bd47-4b29-ad99-b4ddf8cc2fbb`, `$159.00`,
  in stock,
- `Fixture Urban Loft` — `86b4e190-b7b6-45f4-845f-bef9f6125190`, `$299.00`,
  backorder,
- `Fixture Starter Home` — `0f9d3f51-a4bb-4ad0-8604-12dddfb69729`, `$199.00`,
  in stock,
- collections: `Fixture Homes`, `Fixture Lofts`.

Brak bylo media assets i brak `link.basePath`, wiec karta produktu oraz CTA
poprawnie pozostaly non-clickable z markerem `missing-route`.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-product-gallery` | Nie dotyczy admin. | HTTP 200; `count=3`, `total=3`, `curation=query`, `pagination=none`, `route-state=missing-route`, `cta-state=hidden_missing_route`, `view-all-state=disabled`, `aria-label="Product gallery"`, 3 produkty. | Dziala | `ProductGalleryBlock` renderuje fallback accessible name i deterministic data markers. | Brak. |
| Admin initial preview | Otwarta strona i zaznaczony blok | Root `count=3`, `total=3`, `curation=query`, `viewAllState=disabled`; Visual ma preview ready, 3 columns, 4 theme-default surfaces. | Public baseline taki sam query, ale bez zmian z admin sesji. | Dziala | Default source query resolve'uje seeded commerce fixture. | Brak. |
| Wizard: limit / search / collections / status / sort / price | Limit `2`, search `loft`, obie kolekcje, wszystkie statusy, sort `Title A-Z`, cena `150-400` | Przed refresh root zostal stary, editor pokazal `Preview needs refresh`; po refresh `count=1`, item `Fixture Urban Loft`. | Nie publikowano tej zmiany. | Dziala | Wizard mutuje source i price filters, a preview resolver aktualizuje `resolved` dopiero po refresh. | Brak. |
| Wizard: restore query | Search wyczyszczony, limit `8`, refresh | Root `count=3`, order `Garden / Starter / Urban`, preview ready; sort `Title, A to Z` pozostaje aktywny. | Nie publikowano tej zmiany. | Dziala | Sort zostal jawnie ustawiony i determinuje kolejnosc po restore. | Brak. |
| Variants | `Compact`, potem `Cards` | Grid class zmienia gap `gap-3` w Compact i wraca do `gap-4` w Cards; count i query bez zmian. | Public baseline `Cards`. | Dziala | Visual owns `variant`; renderer mapuje wariant na spacing kart. | Brak. |
| Header + a11y | Wpisano `31-05 Product Gallery Audit` i opis | Root przechodzi z `aria-label` na `aria-labelledby="product-gallery-audit-31-05-product-gallery-title"`; renderuje `h2`. | Public baseline bez headera, `aria-label="Product gallery"`. | Dziala | Renderer ustawia labelledby tylko przy `header.title`. | Brak. |
| Card fields | Wylaczono/wlaczono excerpt, price, stock; wlaczono status badge | Controls przyjmuja stan bez bledu; po restore podglad pokazuje pelne pola produktow. | Nie publikowano tej zmiany. | Dziala | `fields.showExcerpt/showPrice/showStock/showStatus` sa Visual-owned i renderowane per card. | Brak. |
| CTA label/style | Label `View audit product`, style `Button`, potem style `None` | Przy braku `basePath` linki pozostaja spanami, `linkCount=0`; `cta-state` zmienia sie na `disabled_by_author` gdy style `none`. | Public baseline `hidden_missing_route`. | Dziala | `resolveProductGalleryRouteState` rozroznia hidden missing route vs author-disabled CTA. | Brak. |
| Manual curation | `Choose products`; wybrano Starter i Garden; przesunieto kolejnosc | Root `curation=manual`, `count=2`, order `Garden / Starter`; preview ready. | Nie publikowano tej zmiany. | Dziala | Visual selected product list zapisuje `curation.productIds` i zachowuje kolejnosc. | Brak. |
| Powrot manual -> query | `Use source query`, refresh | Root wraca do `curation=query`, `count=3`, order query. | Nie publikowano tej zmiany. | Dziala rendererowo, ale Advanced myli diagnostyke | `productIds` pozostaja zapisane jako nieaktywny stan zgodnie z non-destructive UI, ale Advanced pokazuje je jak aktywne. | Patrz `PG-31-05-01`. |
| More products link: selected page | `More products action=view-all`; wybrano istniejaca strone; refresh | Root `pagination=view-all`, ale `viewAllState=all_products_visible`, bo widoczne sa wszystkie 3 z 3 produktow; editor pokazuje guidance `all_products_visible`. | Nie publikowano tej zmiany. | Dziala | Renderer ukrywa link, gdy destination istnieje, ale nie ma wiecej produktow poza pokazanymi. | Brak. |
| More products link: missing destination | Wyczyszczono page destination | Root `viewAllState=missing_destination`; guidance mowi, ze link jest ukryty do czasu wyboru strony. | Nie publikowano tej zmiany. | Dziala | `resolveProductGalleryViewAllState` wymaga safe `viewAllHref`. | Brak. |
| Empty state | Search `zzzznomatch`, refresh; title `No audit products`, opis custom | Root `count=0`, `total=0`, brak gridu, `role=status`, tekst custom empty state i more-products missing-destination guidance. | Nie publikowano tej zmiany. | Dziala | Empty branch bierze `emptyState.title/description` i dalej raportuje pagination diagnostics. | Brak. |
| Card/empty colors | Ustawiono card background/border i empty background/border | Editor pokazuje `selectedColorCount=4`; po clear `selectedColorCount=0`, `themeDefaultCount=4`; root style wraca do pustego stringa. | Nie publikowano tej zmiany. | Dziala | Shared color control zapisuje clearable style values, renderer kompaktuje style. | Brak. |
| Presentation: columns/card style | `2 columns` + `Minimal`, potem `4 columns` + `Outlined` | Grid `md:grid-cols-2`, potem `md:grid-cols-2 xl:grid-cols-4`; card border wraca przy Outlined; editor preview columns `2 -> 4`. | Nie publikowano tej zmiany. | Dziala | `style.columns` i `style.cardStyle` mapuja sie na fixed class maps. | Brak. |
| Advanced read-only | Klik `Advanced` | Sekcje: product behavior, source summary, preview status, surface summary, contract summary + builder summaries; `writableControls=0`, tylko `Refresh products` jako form control. | Nie dotyczy. | Dziala | Advanced nie ma write controls dla configu; refresh preview jest dozwolonym diagnostic action. | Brak. |
| Advanced source summary | Po finalnym stanie query | Pokazuje limit `8`, search `None`, 2 collections, 3 status filters, sort `Title, A to Z`, preview ready `3/3`. | Nie dotyczy. | Dziala | Source summary czyta aktywny query state. | Brak. |
| Advanced product behavior | Po powrocie z manual curation do query | Pokazuje `Source mode: Query results`, ale tez `Selected products: 2 products`. | Nie dotyczy. | Nie dziala jako diagnostyka | Dwa wybrane produkty sa juz nieaktywne w query mode; runtime ich nie uzywa. | Patrz `PG-31-05-01`. |

## Znaleziska do poprawy

### PG-31-05-01 — Advanced raportuje nieaktywne wybrane produkty jako aktywne

**Objaw:** po wybraniu recznej kuracji (`Starter Home`, `Garden Suite`) i
powrocie do `Use source query`, renderer poprawnie wraca do `curation=query` i
pokazuje 3 produkty z query. Panel Advanced pokazuje jednak jednoczesnie:

- `Source mode: Query results`,
- `Selected products: 2 products`.

To jest mylace, bo `curation.productIds` jest wtedy zapisanym, nieaktywnym
stanem manualnego trybu, a nie aktywnym filtrem ani aktywna selekcja.

**Dlaczego:** Visual switch zachowuje `curation.productIds` przy zmianie trybu
(`ProductGalleryEditors.tsx:939-952`) przez `updateCuration`
(`ProductGalleryEditors.tsx:185-196`). To jest sensowne i non-destructive.
Problem jest w Advanced: summary row zawsze liczy
`normalized.curation.productIds.length`, niezaleznie od `curation.mode`
(`ProductGalleryEditors.tsx:1095-1103`).

**Jak naprawic:**

1. W `ProductGalleryAdvancedEditor` pokazac `Selected products` jako aktywne
   tylko gdy `normalized.curation?.mode === "manual"`.
2. Dla `query` z zachowanymi `productIds` pokazac jawny tekst typu
   `Saved manual selection: 2 products (inactive in query mode)` albo
   `Not used in query mode`.
3. Dodac regresje w
   `tests/vitest/ui/product-gallery-editor-wave.test.tsx`: wybrac manual,
   zaznaczyc produkty, wrocic na query, wejsc w Advanced i sprawdzic, ze
   aktywna diagnostyka nie mowi `Selected products 2 products` bez informacji
   o nieaktywnosci.

## Public baseline

`curl http://localhost:3000/audit-31-05-product-gallery` zwrocil HTTP 200 i SSR
HTML z:

- `aria-label="Product gallery"`,
- `data-product-gallery-count="3"`,
- `data-product-gallery-total="3"`,
- `data-product-gallery-curation="query"`,
- `data-product-gallery-pagination="none"`,
- `data-product-gallery-route-state="missing-route"`,
- `data-product-gallery-cta-state="hidden_missing_route"`,
- `data-product-gallery-view-all-state="disabled"`,
- 3x `data-product-gallery-card-link="missing-route"`,
- product IDs: `Garden Suite`, `Urban Loft`, `Starter Home`.

## Ograniczenia fixture

- Brak media assets, wiec nie potwierdzono realnego renderu obrazow produktu w
  browser pass. Renderer marker `imgCount=0` jest zgodny z fixture.
- Brak `link.basePath`, wiec linki kart i CTA nie mogly przejsc do `ready`.
  Zweryfikowano poprawne stany `missing-route`, `hidden_missing_route` i
  `disabled_by_author`.
- More-products link z wybrana strona nie mogl byc widoczny przy finalnym
  query `3/3`, bo wszystkie produkty byly juz pokazane. Zweryfikowano stan
  `all_products_visible`; dla pelnego visible link potrzebny jest total > shown.

## Kod-owner

- `core/widgets/core/productGallery.tsx`
  - editor contract ownership: okolice linii 152-305,
  - defaults i domain shape: okolice linii 22-150,
  - route/view-all state i DOM markers: okolice linii 867-925,
  - route guidance/card render: okolice linii 960-1148.
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
  - non-destructive curation update: okolice linii 185-196,
  - Visual product selection control: okolice linii 932-968,
  - Advanced product behavior summary bug: okolice linii 1089-1103.
- `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  - najlepsze miejsce na regresje manual -> query -> Advanced diagnostics:
    okolice linii 323-395.
- `tests/vitest/widgets/productGallery.test.tsx`
  - renderer/domain coverage.
- `tests/integration/routes/productGalleryPreview.test.ts`
  - internal preview route validation and payload rejection.

## Rekomendacje

1. Naprawic `PG-31-05-01` jako maly UI diagnostics fix bez zmiany renderera.
2. Dodac commerce fixture z obrazami produktu i skonfigurowanym safe
   `link.basePath`, zeby browser pass potwierdzal link ready, target/rel i
   image alt/aspect branch.
3. Dodac fixture z `total > shown` dla `view-all`, zeby potwierdzic realny
   widoczny link, nie tylko `all_products_visible` i `missing_destination`.
4. Zbadac app-level console 404, jesli powtarza sie w kolejnych widgetach.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-product-gallery run-code --filename .tmp/playwright-product-gallery-compact.js` — passed.
- Admin console po przebiegu: `Errors: 1`, `Warnings: 0`; blad:
  `Failed to load resource: the server responded with a status of 404 (Not Found)`.
  Nie zostal powiazany z Product Gallery jako widget-owned crash.
- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx` — passed, 11 tests.
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx` — passed, 6 tests.
- `bun run test:vitest -- tests/vitest/ui/product-gallery-admin-preview.test.tsx` — passed, 4 tests.
- `bun run test:vitest -- tests/vitest/ui/commerce-widget-editor-shared.test.tsx` — passed, 4 tests.
- `bun test ./tests/integration/routes/productGalleryPreview.test.ts` — passed, 2 tests.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` — passed, 16 tests.
- `curl http://localhost:3000/audit-31-05-product-gallery` — HTTP 200, public baseline query.
- Pierwszy lokalny test command zostal odpalony z blednym `cwd` i zwrocil
  `Script not found "test:vitest"` przed uruchomieniem suite; powyzsze wyniki
  sa z poprawionych komend z repo root.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
