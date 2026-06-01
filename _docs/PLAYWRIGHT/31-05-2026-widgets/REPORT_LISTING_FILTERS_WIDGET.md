# RAPORT: Listing Filters Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Listing Filters`
> **Admin page id:** `44eb25c7-d2b3-4445-98ac-d062f9189c46`
> **Public route:** `/audit-31-05-listing-filters`
> **Playwright sessions:** `codex-31-05-ui-listing-filters`, `codex-31-05-ui-listing-drawer`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem
`listing-filters`. Poniewaz lokalne API nie mialo zadnych listing queries,
content types ani posts, skrypt Playwright utworzyl tymczasowy listing query
przez admin API, uzyl go tylko w draft preview i usunal na koncu przebiegu.

Efekt sprawdzano w admin live preview przez `data-listing-*`, form controls,
native `<details>`, range/date/taxonomy/radio render branches, read-only
Advanced summaries oraz publiczny SSR pod
`http://localhost:3000/audit-31-05-listing-filters`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Publiczny route pozostal baseline placeholderem bez `listingQueryId`.

## Pokrycie UI

Przetestowane:

- Wizard: listing query picker, add facet, wszystkie facet kinds, field picker,
  operator choices dla range/date/radio/taxonomy, no raw technical inputs,
- Visual: copy/search/apply labels, show search, auto apply, variants
  default/horizontal/sidebar/drawer, sticky sidebar, drawer default collapsed,
  max width, range mode/step, date mode, taxonomy searchable mode, empty option
  guidance, frame/action colors set/clear,
- Advanced: source summary, runtime diagnostics/status, contract summary,
  read-only contract,
- public SSR baseline placeholder,
- targeted Vitest suites for renderer, editor, query parser, shared runtime
  script and public renderer.

## Fixture danych

Tymczasowy listing query:

- source: `posts`,
- `sourceConfig.includeDrafts=true`,
- fields: `id`, `title`, `slug`, `status`, `updatedAt`, `tags`,
  `data.areaM2`, `data.projectStatus`,
- sort: `updatedAt desc`,
- rows: `0`, bo lokalne `/admin/api/posts` zwracalo pusta liste.

Skrypt usunal query po audycie (`DELETE /admin/api/listings/queries/:id` -
HTTP 200). Dlatego wynik potwierdza UI i fallback/runtime shell, ale nie
potwierdza realnych metric counts ani aktywnych option chips z danych.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-listing-filters` | Nie dotyczy admin. | HTTP 200; `data-listing-widget="listing-filters"`, `data-listing-query-id=""`, brak formy, tekst `Select a listing query...`. | Dziala jako placeholder | Widget fail-closed renderuje konfiguracyjna wskazowke bez live form. | Brak dla widgetu; fixture moze dostac opublikowany query, jesli chcemy public runtime proof. |
| Admin initial placeholder | Otwarta strona i zaznaczony blok | Visual ma wariant/layout/copy/surface/facet presentation; root placeholder bez formy; brak raw technical inputs. | Public baseline taki sam placeholder. | Dziala | Default data ma pusty `listingQueryId`, wiec renderer nie wlacza runtime form. | Brak. |
| Listing query picker | `Run setup again`, wybrano tymczasowy query | Root przechodzi na live form: `formCount=1`, `data-listing-query-id=<query>`, `data-listing-auto-apply=1`, search `type=search`, sort select `__sort`, script runtime `1`. | Nie publikowano draftu. | Dziala | Wizard owns source selection, renderer buduje URL tokens `lq.<queryId>.*`. | Brak. |
| Facet kind list | Otwarty `Facet kind` | UI pokazal `Checkbox`, `Radio`, `Taxonomy`, `Range`, `Date range`, `Sort`. | Nie dotyczy. | Dziala | Kind enum jest bounded przez `kindOptions`. | Brak. |
| Range facet | Dodano facet, kind `Range`, field `data.areaM2` | Root `data-listing-composite-kind="range"`, 2 number inputs + 2 range sliders, default step `1`. | Nie publikowano draftu. | Dziala | Range branch renderuje hidden token plus Min/Max inputs/sliders. | Brak. |
| Range mode + step | Visual: label `Audit range`, mode `Inputs only`, step `25`, potem `Inputs + sliders` | Inputs only: sliders `0`, steps `25/25`; Inputs + sliders: sliders `2`, steps `25/25/25/25`. | Nie publikowano draftu. | Dziala | `presentation.rangeInputMode` i `rangeStep` ida do renderer controls. | Brak. |
| Date range | Wizard: kind `Date range`, field `updatedAt`; Visual: `Text fallback` | Native: 2 `data-listing-date-part` inputs; text fallback: 1 input z `YYYY-MM-DD,YYYY-MM-DD`. | Nie publikowano draftu. | Dziala | Date branch rozroznia native-date vs text fallback. | Brak. |
| Radio empty options | Wizard: kind `Radio`, field `status` | Root ma empty option note i `radioCount=0`; editor wyjasnia, ze option values pochodza z danych albo safe option list. | Nie publikowano draftu. | Dziala | Po TASK-343-18 puste option-backed facets nie sa nieme. | Brak. |
| Taxonomy empty options | Wizard: kind `Taxonomy`, field `tags` | Root ma empty option note; operator choices `Contains any`, `Contains none`, `Equals`. | Nie publikowano draftu. | Dziala | Taxonomy field uzywa option-backed branch, ale bez metrics/opcji pokazuje guidance. | Brak. |
| Taxonomy searchable | Visual: `Option mode=Searchable list`, label `Audit taxonomy` | Fieldset `data-listing-searchable-options=1`, option search input `1`, empty option note nadal widoczna. | Nie publikowano draftu. | Dziala | Searchable mode pokazuje lokalny option search shell nawet przed pojawieniem sie opcji. | Brak. |
| Operator choices | Odczyt dropdownow w Wizard | Range/date: `Between`, `Greater than`, `Greater or equal`, `Lower than`, `Lower or equal`; radio: `Equals`, `Not equals`; taxonomy: `Contains any`, `Contains none`, `Equals`. | Nie dotyczy. | Dziala | Choices ida z `getAllowedListingFilterOperators(kind)`. | Brak. |
| Copy/search labels | Visual: title, description, search label/placehoder, apply label | Root dostal `aria-labelledby`, form ma ten sam label id, search placeholder `Search audit listings`, apply label zapisany. | Nie publikowano draftu. | Dziala | Runtime copy jest Visual-owned; a11y label laczy section/form z title. | Brak. |
| Show search field | Toggle OFF/ON | OFF: `searchCount=0`; ON: search wraca z `name=lq.<queryId>.__q`, `autoComplete=off`. | Nie publikowano draftu. | Dziala | `showSearch` kontroluje render search label/input. | Brak. |
| Auto apply OFF | Toggle OFF | `data-listing-auto-apply=0`; pojawia sie submit button `Apply audit filters`; action background domyslnie `var(--color-primary)`. | Nie publikowano draftu. | Dziala | Manual branch renderuje `<button type="submit">`. | Brak. |
| Action background while manual | Ustawiono `Action background=#dc2626` przy Auto apply OFF | Submit button style `background-color: rgb(220, 38, 38)`; editor chip `Selected color`. | Nie publikowano draftu. | Dziala | `style.actionBackground` jest uzyte jako `actionStyle` na manual submit button. | Brak. |
| Action background while auto apply | Po ustawieniu koloru wlaczono Auto apply ON | Submit button znika (`submitButtons=[]`), ale Surface dalej pokazuje `Action background: Selected color` bez informacji, ze kolor jest inactive. | Nie dotyczy. | Nie dziala jako truthfulness | Saved style jest poprawny, ale UI sugeruje aktywny efekt przy braku action buttona. | Patrz `LF-31-05-01`. |
| Horizontal variant | Klik `Horizontal` | Root `data-listing-variant="horizontal"`, form i taxonomy/searchable branch zachowane. | Nie publikowano draftu. | Dziala | Variant maps to horizontal controls grid. | Brak. |
| Sidebar + sticky | Klik `Sidebar`, sticky ON | Root `variant=sidebar`, frame class ma `md:max-w-md`; targeted code path supports sticky class. | Nie publikowano draftu. | Dziala | Sidebar branch adds side-panel constraints and sticky when enabled. | Brak. |
| Drawer + default collapsed | Klik `Drawer`, targeted replay: Default collapsed OFF/ON/OFF | Targeted replay: details open -> closed -> open; switch `aria-checked=false -> true -> false`. | Nie publikowano draftu. | Dziala | Drawer uses native `<details>` with `open={!defaultCollapsed}`. | Brak. |
| Frame colors | Ustawiono frame background/border, potem Clear wszystkich kolorow | Color chips `Selected color=3`; po Clear `themeDefaultCount=3`, overrides usuniete. | Nie publikowano draftu. | Dziala | Shared swatch-only controls zapisujace clearable style values. | Brak. |
| Advanced | Klik `Advanced` | Sekcje: source summary, runtime diagnostics, runtime status, contract summary + builder summaries; `writableControls=0`, `rawTechnicalInputs=0`. | Nie dotyczy. | Dziala | Advanced jest read-only i nie pokazuje raw runtime JSON. | Brak. |

## Znaleziska do poprawy

### LF-31-05-01 - `Action background` wyglada aktywnie, gdy `Auto apply` ukrywa przycisk akcji

**Objaw:** przy `Auto apply changes` OFF ustawienie `Action background` na
`#dc2626` dziala: submit button `Apply audit filters` dostaje
`background-color: rgb(220, 38, 38)`. Po ponownym wlaczeniu Auto apply button
znika (`submitButtons=[]`), ale Visual nadal pokazuje:

- `Action background`,
- `Clear`,
- `Selected color`,
- bez tekstu, ze kolor jest zapisany, lecz nieaktywny do czasu wylaczenia
  Auto apply.

To jest truthfulness gap, nie blad renderera: zapisany kolor ma sens, ale
aktualny widoczny stan nie ma elementu, ktory moze go pokazac.

**Dlaczego:** renderer uzywa `actionStyle` tylko w manual-submit branch:

- `autoApply ? <span>Updates automatically...</span> : <button style={actionStyle}>`
  w `core/widgets/core/listingFilters.tsx:1174-1183`.

Editor Surface zawsze renderuje `Action background`, niezaleznie od
`autoApply`:

- `SurfaceEditor` w `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx:2308-2377`.

Auto apply toggle jest osobnym control row:

- `listing-filters.visual.auto-apply` w
  `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx:2147-2157`.

**Jak naprawic:**

1. W `SurfaceEditor` sprawdzic `normalized.autoApply !== false`.
2. Przy Auto apply ON pokazac obok `Action background` readonly/help text typu
   `Saved for manual apply mode; inactive while auto apply is enabled`.
3. Alternatywnie ukryc/disable `Action background` przy Auto apply ON, ale
   zachowac saved value, zeby wlaczenie manual apply odtworzylo kolor.
4. Dodac regresje w `tests/vitest/ui/listing-filters-editor-wave.test.tsx`:
   ustawic `autoApply=true` + `style.actionBackground`, wyrenderowac Visual i
   sprawdzic, ze UI nie prezentuje koloru jako aktywnego bez inactive copy.

## Public baseline

`curl http://localhost:3000/audit-31-05-listing-filters` zwrocil HTTP 200 i SSR
HTML z:

- `data-listing-widget="listing-filters"`,
- `data-listing-variant="default"`,
- `data-listing-block-id="audit-31-05-listing-filters"`,
- `data-listing-query-id=""`,
- `aria-label="Listing filters configuration"`,
- brak `data-listing-runtime-form`,
- brak search/facet controls,
- tekst `Select a listing query in widget settings to enable runtime filters.`

## Ograniczenia fixture

- Brak opublikowanego listing query na stronie audytowej, wiec public route
  potwierdza tylko placeholder. Pelny runtime SSR z aktywnymi filtrami wymaga
  publikacji query-backed widget state.
- Tymczasowy query mial `0` posts, wiec nie potwierdzono realnych
  `resolved.metrics` counts, active chips ani `Clear all`.
- Checkbox/radio/taxonomy option values pozostaja read-only/safe-list/runtime
  owned; UI pass potwierdzil guidance i empty note, ale nie rename istniejacych
  option rows z realnych danych.
- Glowny przebieg mial jeden powtarzalny app-level console `404`, bez
  widget-owned crash.

## Kod-owner

- `core/widgets/core/listingFilters.tsx`
  - editor contract and defaults: okolice linii 120-265,
  - facet render branches: okolice linii 694-1000,
  - section/form/search/action/a11y shell: okolice linii 1001-1229,
  - `autoApply` manual button branch: okolice linii 1174-1183.
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
  - listing query picker: okolice linii 840-930,
  - facet setup/presentation: okolice linii 935-2010,
  - copy/behavior controls: okolice linii 2018-2162,
  - variant/layout controls: okolice linii 2168-2306,
  - Surface `Action background` finding: okolice linii 2308-2377,
  - Advanced summaries: okolice linii 2380-2610.
- `tests/vitest/widgets/listingFilters.test.tsx`
  - renderer/a11y/facet branch coverage.
- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
  - najlepsze miejsce na regresje `LF-31-05-01`.
- `tests/vitest/widgets/listingRuntimeScript.test.ts`
  - shared listing runtime submit/URL/rebind behavior.

## Rekomendacje

1. Naprawic `LF-31-05-01` jako UI truthfulness fix bez zmiany runtime
   semantics.
2. Dodac/poprawic published listing query fixture dla nowej
   `/audit-31-05-listing-filters`, zeby kolejne passy mogly potwierdzic public
   SSR z metrics, active chips, clear-all i realnymi option counts.
3. W kolejnym pass zostawic tymczasowy query tylko jako fallback, nie jako
   glowny dowod public runtime.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-listing-filters run-code --filename .tmp/playwright-listing-filters-compact.js` - passed.
- `playwright-cli -s=codex-31-05-ui-listing-drawer run-code --filename .tmp/playwright-listing-filters-drawer-check.js` - passed.
- Tymczasowy listing query zostal usuniety po glownym przebiegu: `DELETE` HTTP 200.
- Admin console po glownym przebiegu: `Errors: 1`, `Warnings: 0`; blad:
  `Failed to load resource: the server responded with a status of 404 (Not Found)`.
  Nie zostal powiazany z Listing Filters jako widget-owned crash.
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx` - passed, 13 tests.
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx` - passed, 12 tests.
- `bun run test:vitest -- tests/vitest/ui/listing-filters-query-parser.test.ts` - passed, 4 tests.
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts` - passed, 9 tests.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` - passed, 16 tests.
- `curl http://localhost:3000/audit-31-05-listing-filters` - HTTP 200, public placeholder baseline.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
