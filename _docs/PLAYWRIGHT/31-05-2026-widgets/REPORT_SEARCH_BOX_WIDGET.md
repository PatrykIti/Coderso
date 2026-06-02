# RAPORT: Search Box Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Search Box`
> **Admin page id:** `e3a796ef-4b0b-4ec2-b025-c1cba70b94ce`
> **Public route:** `/audit-31-05-search-box`
> **Playwright sessions:** `search-box-31`, `search-box-adv-31`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem `search-box`.
Poniewaz publiczny fixture startuje jako `listing` bez `listingQueryId`, skrypt
Playwright utworzyl tymczasowy listing query przez admin API, wybral go w
Wizard, sprawdzil runtime shell w live preview i usunal query na koncu
przebiegu.

Po UI pass wykonano audyt kodu i drugi niezalezny przeglad subagentem. Claude
nie byl dostepny w tym srodowisku z powodu `401`, wiec raport nie udaje
walidacji przez Claude.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Publiczny route pozostal baseline placeholderem bez `listingQueryId`.

## Pokrycie UI

Przetestowane:

- Wizard: `listing`, `global`, `route-submit`, listing query picker, global
  source toggles, route-submit page picker,
- Visual: title, description, placeholder, submit label, display mode,
  `autoApply`, frame/action colors set/clear,
- Advanced: runtime diagnostics/status/contract summary i read-only contract,
- public SSR baseline placeholder,
- targeted Vitest suites dla renderer/editor/runtime-script/public-renderer.

## Fixture danych

Tymczasowy listing query:

- source: `posts`,
- `sourceConfig.includeDrafts=true`,
- fields: `id`, `title`, `slug`, `status`, `updatedAt`,
- sort: `updatedAt desc`.

Skrypt usunal query po audycie (`DELETE /admin/api/listings/queries/:id` -
HTTP 200). Search Box jest kontrolka wyszukiwania, wiec ten fixture potwierdzal
aktywny runtime form i tokeny query, nie liste wynikow.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-search-box` | Nie dotyczy admin. | HTTP 200; `data-listing-widget="search-box"`, `data-listing-query-id=""`, `aria-labelledby`, `h3.sr-only`, brak formy. | Dziala jako placeholder | Default data nie ma `listingQueryId`, wiec renderer fail-closed pokazuje konfiguracje. | Brak dla widgetu; fixture moze dostac opublikowany query, jesli chcemy public runtime proof. |
| Initial placeholder | Otwarta strona i zaznaczony blok | Placeholder `listing`, `displayMode=full`, zero form, zero script, Visual pokazuje 3 `Theme default` swatche. | Taki sam placeholder. | Dziala | Placeholder branch ma stabilne `aria-labelledby` i `data-listing-block-id`. | Brak. |
| Listing query picker | `Run setup again`, wybrano tymczasowy query | Root ma `data-listing-query-id=<query>`, `data-listing-runtime-form=1`, `autoApply=1`, `inputName=lq.<query>.__q`, script runtime `1`. | Nie publikowano draftu. | Dziala | Wizard owns `listingQueryId`; renderer uzywa `buildListingRuntimeParamName` i `listingRuntimeTokens.search`. | Brak. |
| Copy fields | Visual: title, description, placeholder, submit label | Preview aktualizuje heading, helper copy, placeholder i button label; input label zmienia sie na `<title> query`. | Nie publikowano draftu. | Dziala | Visual owns `title`, `description`, `placeholder`, `submitLabel`; renderer buduje stabilne label/id. | Brak. |
| Compact listing | Visual: `displayMode=compact` | `data-search-box-display-mode="compact"`, helper description znika, input/button row zostaje w kompaktowym ukladzie; test renderer potwierdza `max-w-3xl` i `space-y-2`. | Nie publikowano draftu. | Dziala | `listingMaxWidthClass`, `shellGapClass` i ukrycie opisu sa zalezne od `compact`. | Brak. |
| Auto apply | Toggle OFF/ON w listing | OFF: `data-listing-auto-apply=0`, hint znika, button nadal jest. ON: `data-listing-auto-apply=1`, hint wraca, button nadal jest. | Nie publikowano draftu. | Dziala | W Search Box przycisk submit istnieje takze przy auto apply, wiec `Action background` ma widoczny cel. | Brak. |
| Action background | Ustawiono `#dc2626`, potem wlaczono auto apply | Button dostaje `background-color: rgb(220, 38, 38)` zarowno przy auto apply OFF, jak i ON. | Nie publikowano draftu. | Dziala | Renderer zawsze renderuje listing submit button i stosuje `actionStyle`. | Brak. |
| Frame colors + clear | Ustawiono frame background/border i wyczyszczono wszystkie kolory | Kolory ustawione w preview; po Clear editor pokazuje `No inline color` dla trzech pol, a shell nie ma inline frame/action styles. | Nie publikowano draftu. | Dziala | `SharedColorControl` dostaje `treatAsThemeDefaultValues`, a clear usuwa clearable style values. | Brak. |
| Global mode | Wizard: `Global public search` | Root ma `data-global-search-form=1`, `action=/api/search`, input `name=q`, results shell, source checkboxes. | Nie publikowano draftu. | Dziala | Global branch renderuje endpoint i source inputs, ale endpoint nie jest zwyklym polem autora. | Brak. |
| Global source toggles | Pages OFF, Entries OFF, Posts ON | Live `.checked`: pages false, entries false, posts true. Atrybuty DOM `checked` sa nieistotnie stale, ale widoczny stan kontrolki jest poprawny. | Nie publikowano draftu. | Dziala | Po TASK-343-20 checkboxy sa kontrolowane przez React preview. | Brak. |
| Global compact | Visual: `displayMode=compact` po zmianie na global | Root zostaje global, helper description ukryty, editor ukrywa `autoApply` i pokazuje tekst o global sources. | Nie publikowano draftu. | Dziala | Visual interaction renderuje `autoApply` tylko dla `listing`, global dostaje opis nieedytowalny. | Brak. |
| Route submit default | Wizard: `Route submit search` | Root ma `data-search-box-mode="route-submit"`, `targetRoute=/search`, `queryParam=q`, form `method=get`, `action=/search`, input `name=q`. | Nie publikowano draftu. | Dziala | `targetRoute` i `queryParam` sa normalizowane tylko dla `route-submit`. | Brak. |
| Route submit page picker | Wybrano `Audit 31-05 Search Box` | `targetRoute=/audit-31-05-search-box`, `action=/audit-31-05-search-box`; Wizard ma shared `LinkDestinationField`. | Nie publikowano draftu. | Dziala | Route-submit Wizard owns `targetRoute`; page picker mapuje published page na route. | Brak. |
| Route action color | Visual: `Action background=#16a34a` | Route-submit button dostaje `background-color: rgb(22, 163, 74)`. | Nie publikowano draftu. | Dziala | Route-submit branch stosuje ten sam `actionStyle` na submit button. | Brak. |
| Advanced read-only | Klik `Advanced` | Sekcje diagnostics/status/summary; `writableControls=0`, brak raw technical inputs. | Nie dotyczy. | Dziala | Advanced uzywa `ReadonlyWidgetSummaryRow` i nie wystawia kontrolek mutujacych. | Brak. |
| Advanced route rows poza route-submit | Advanced w `listing` i `global` | Pokazuje `Active routing` dla efektywnej galezi runtime i nie renderuje `Results page` ani `Search term routing`. Route-submit nadal pokazuje te rows. | Nie dotyczy. | Dziala po TASK-389 | `normalizeSearchBoxData` dodaje `targetRoute/queryParam` tylko dla `route-submit`, a Advanced renderuje route-only rows tylko dla tego trybu. | Brak. |

## Znaleziska do poprawy

### SB-31-05-01 - Advanced pokazuje route-submit diagnostyke jako aktywna w trybach `listing` i `global`

**Status po TASK-389:** naprawione 2026-06-02. Advanced pokazuje teraz
read-only row `Active routing`, ktory nazywa efektywna galaz runtime:
`Listing runtime search token`, `Global public search endpoint with q parameter`
albo `Route-submit page routing`. Rows `Results page` i
`Search term routing` sa renderowane tylko dla `mode="route-submit"`.

**Objaw:** w Advanced dla domyslnego `listing` placeholdera i dla `global`
search widoczne sa rows:

- `Results page` -> `Default search results page`,
- `Search term routing` -> `Standard search term routing`.

W tych trybach runtime ich nie uzywa. Listing uzywa `listingQueryId` i
parametru `lq.<queryId>.__q`; global uzywa `endpoint=/api/search` i input
`name=q`. `targetRoute` oraz `queryParam` sa runtime-aktywne dopiero w
`route-submit`.

**Dlaczego:** normalizacja zapisuje `targetRoute` i `queryParam` tylko dla
`mode === "route-submit"`:

- `core/widgets/core/searchBox.tsx:249-253`.

Renderer tez dzieli runtime na osobne galezie:

- `listing`: `core/widgets/core/searchBox.tsx:323-416`,
- `route-submit`: `core/widgets/core/searchBox.tsx:420-470`,
- `global`: `core/widgets/core/searchBox.tsx:480-563`.

Advanced natomiast bezwarunkowo renderuje rows `Results page` i
`Search term routing`:

- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx:674-684`.

**Jak naprawic:**

1. W `SearchBoxAdvancedEditor` policzyc `const mode = normalized.mode ?? "listing"`.
2. Dla `mode === "route-submit"` zostawic obecne rows.
3. Dla `listing`/`global` albo ukryc `route-target` i `query-param`, albo pokazac
   wartosci z jawna etykieta `Only used in route-submit mode`.
4. Dodac regresje w `tests/vitest/ui/search-box-editor-wave.test.tsx`: render
   Advanced dla `mode="listing"` i `mode="global"` nie moze sugerowac aktywnej
   strony wynikow ani aktywnego routing key.

## Public baseline

`curl http://localhost:3000/audit-31-05-search-box` zwrocil HTTP 200 i SSR HTML
z:

- `data-listing-widget="search-box"`,
- `data-search-box-display-mode="full"`,
- `data-listing-block-id="audit-31-05-search-box"`,
- `data-listing-query-id=""`,
- `aria-labelledby="search-box-audit-31-05-search-box-title"`,
- `h3.sr-only` z tekstem `Search`,
- brak `form`,
- brak runtime script,
- tekst `Select a listing query in widget settings to enable scoped listing search.`

## Ograniczenia fixture

- Public route potwierdza tylko placeholder, bo nie publikowano draftu z
  tymczasowym `listingQueryId`.
- Global public search nie byl uruchamiany z realnym tekstem query i wynikami;
  sprawdzono shell, source toggles, runtime markers i shared runtime script.
- Route-submit submit nie byl faktycznie wysylany, ale sprawdzono `method`,
  `action`, `input name` i selected page routing.
- Glowny i focused przebieg mial jeden app-level console `404` dla
  `http://localhost:5173/favicon.ico`; nie jest to widget-owned crash.

## Kod-owner

- `core/widgets/core/searchBox.tsx`
  - defaults/schema/contract: okolice linii 49-145,
  - route-only normalization: `249-253`,
  - listing placeholder/runtime: `323-416`,
  - route-submit runtime: `420-470`,
  - global runtime/source checkboxes: `480-563`.
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
  - Wizard mode/source setup: `136-327`,
  - Visual copy/interaction/surface: `331-628`,
  - Advanced finding: `644-686`.
- `tests/vitest/widgets/searchBox.test.tsx`
  - renderer/a11y/compact/route coverage: `25-131`,
  - editor contract coverage: `192-240`.
- `tests/vitest/ui/search-box-editor-wave.test.tsx`
  - Wizard ownership: `325-441`,
  - Visual ownership/color states: `443-540`,
  - global checkbox sync: `542-589`,
  - Advanced read-only: `634-674`.

## Rekomendacje

1. Dodac published fixture z aktywnym listing query albo dedykowany runtime test
   public SSR, zeby nastepny pass nie musial tworzyc query tylko w draft preview.
2. Opcjonalnie dodac test dla `displayMode="compact"` w placeholder branch bez
   `listingQueryId` i zdecydowac, czy placeholder tez powinien zwezac sie do
   `max-w-3xl`, czy obecne `max-w-4xl` jest celowym stanem konfiguracji.

## Walidacja

- `playwright-cli -s=search-box-31 run-code --filename .tmp/playwright-search-box-compact.js` - passed.
- `playwright-cli -s=search-box-adv-31 run-code --filename .tmp/playwright-search-box-advanced-modes.js` - passed.
- Tymczasowy listing query zostal usuniety po glownym przebiegu: `DELETE` HTTP 200.
- Admin console po przebiegach: `Errors: 1`, `Warnings: 0`; blad:
  `Failed to load resource: the server responded with a status of 404 (Not Found)`
  dla `favicon.ico`, bez zwiazku z widgetem.
- `bun run test:vitest -- tests/vitest/widgets/searchBox.test.tsx` - passed, 9 tests.
- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx` - passed, 8 tests.
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts` - passed, 9 tests.
- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/widgets/searchBox.test.tsx` - passed po TASK-389, 18 tests.
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts` - passed po TASK-389, 9 tests.
- `git diff --check` - passed po TASK-389.
- `bun --cwd core lint` - passed po TASK-389.
- `bun --cwd core lint:types` - passed po TASK-389.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` - passed, 16 tests.
- `curl http://localhost:3000/audit-31-05-search-box` - HTTP 200, public placeholder baseline.
- Subagent code review potwierdzil renderer/a11y/contract coverage i niezaleznie wskazal Advanced route-row truthfulness risk.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
