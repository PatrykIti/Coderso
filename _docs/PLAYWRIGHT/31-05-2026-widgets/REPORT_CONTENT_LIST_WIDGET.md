# RAPORT: Content List Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Content List`
> **Admin page id:** `98fb2c10-7fe1-42e3-9ae7-4dea190fc163`
> **Public route:** `/audit-31-05-content-list`
> **Playwright sessions:** `codex-31-05-ui-content-list`, `codex-31-05-ui-content-list-wizard`, `codex-31-05-ui-content-list-filters`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem `content-list`.
Efekt sprawdzano w admin live preview przez `data-content-list-*`, stan kontrolek,
warunkowe sekcje edytora, read-only Advanced summaries oraz publiczny SSR pod
`http://localhost:3000/audit-31-05-content-list`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Publiczny route pozostal w baseline `missing-source`, co jest oczekiwane dla
swiezej strony bez skonfigurowanego typu tresci albo listing query.

## Pokrycie UI

Przetestowane:

- Wizard: source mode legacy/listing, source binding sections, status scope x5,
  sort x6, item limit clamp 1-24, finish back to Visual,
- Visual: Cards/List/Compact, columns conditional state, gap, card style,
  legacy Daily filters, listing Daily filters branch, section title/description,
  pagination modes Load more i View all, show image toggle, image ratio, tag mode,
  tag limit, CTA label, surface colors set/clear, empty-state copy,
- Advanced: source/style/runtime summaries, read-only contract,
- public SSR baseline,
- targeted Bun/Vitest suites dla renderera, resolvera, public renderera i edytora.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-content-list` | Nie dotyczy admin. | HTTP 200; `variant=cards`, `sourceMode=legacy`, `items=0`, `state=missing-source`; placeholder `Choose a content type...`. | Dziala | `ContentListBlock` ustawia `state=missing-source`, gdy brak `source.contentTypeId` / `source.listingQueryId`. | Brak. |
| Wizard source mode: By content type | Wejscie przez `Run setup again` | Wizard ma sekcje `source-binding` + `source-rules`; widoczne `content-type-search`, `content-type`, `status-scope`, `sort`, `limit`. | Public baseline bez zmian. | Dziala | Legacy branch renderuje `ContentTypeSelect` i reguly status/sort. | Brak. |
| Wizard source mode: By listing query | Select `By listing query` | Widoczne `listing-query`, `listing-template`, `limit`; copy mowi, ze listing query owns filters/sort. | Nie publikowano tej zmiany. | Dziala czesciowo | UI branch dziala, ale patrz finding ponizej: taxonomy z legacy moze zostac w payloadzie po przejsciu do listing. | W `updateSourceMode` czyscic tez `filters.taxonomy` albo w Advanced nie raportowac ukrytych legacy filters dla listing mode. |
| Status scope | Przeklikano `Published only`, `All statuses`, `Draft only`, `Scheduled only`, `Archived only` | Trigger pokazuje wybrana etykiete; root `data-content-list-status-scope` zmienia sie na `published/all/draft/scheduled/archived`. | Nie publikowano tej zmiany. | Dziala | `statusScopeOptions` + `updateSource`. | Brak. |
| Sort | Przeklikano 6 opcji sortowania | Trigger pokazuje kazda etykiete: newest/oldest published, recently/oldest updated, title A-Z/Z-A. | Nie publikowano tej zmiany. | Dziala | `sortOptions` + `updateSource`. | Brak. |
| Item limit | Wpisano `30`, potem `0` | Input klampuje `30 -> 24`, `0 -> 1`. | Nie publikowano tej zmiany. | Dziala | `normalizeContentListLimit` ogranicza zakres 1-24. | Brak. |
| Finish setup | Klik `Finish setup and open Visual` | Wraca Visual editor root `count=1`. | Nie dotyczy. | Dziala | Setup wrapper poprawnie przelacza tryb edytora. | Brak. |
| Variant: Cards/List/Compact | Klikniete wszystkie 3 karty wariantu | Root zmienia `data-content-list-variant`: `cards`, `list`, `compact`. | Public baseline nadal `cards`. | Dziala | `onVariantChange` + `resolveContentListVariant`. | Brak. |
| Columns | Cards vs List/Compact | Dla `cards` select jest edytowalny; dla `list` i `compact` pojawia sie read-only hint `Columns only affect the cards variant.` | Nie publikowano tej zmiany. | Dziala | `supportsColumns = resolvedVariant === "cards"`. | Brak. |
| Gap + card style | Wybrano `Spacious spacing`, `Elevated` | Przy braku zrodla preview nadal pokazuje placeholder; Advanced pokazuje `2 columns · Spacious spacing · Elevated cards`. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Layout itemow widac dopiero przy `state=ready`; Advanced wiernie pokazuje niezapisany stan. | Dodac fixture z gotowymi itemami dla browserowego potwierdzenia klas grid/gap/card. |
| Daily filters legacy | Wpisano `taxonomy=audit-topic`, `search=audit search`, wlaczono `Featured only` | Kontrolki przyjmuja wartosci; `featured` switch `aria-checked=true`; obecne author/search/taxonomy controls. | Nie publikowano tej zmiany. | Dziala | Legacy Visual branch renderuje editable taxonomy/author/search/featured. | Brak. |
| Daily filters listing branch | Przejscie Wizard `legacy -> listing`, potem Visual | Visual ukrywa taxonomy/author/search/featured i pokazuje read-only listing query/template + guidance. | Nie publikowano tej zmiany. | Dziala czesciowo | UI ukrywa legacy filters, ale Advanced nadal raportuje `Taxonomy: audit-topic`. | Czyscic `taxonomy` przy zmianie source mode albo separowac Advanced copy dla listing mode. |
| Section title / description | Wpisano title i opis | Root text zawiera oba; `aria-labelledby` przechodzi na generated title id `audit-31-05-content-list-title`. | Public baseline bez zmian. | Dziala | `ContentListBlock` renderuje H2 i opis z `title/description`. | Brak. |
| Pagination: No navigation | Stan startowy | Editor pokazuje hint `No navigation keeps the current item-limit behavior...`; brak nav w preview. | Public baseline bez nav. | Dziala | Brak runtime nav dla `mode=none`. | Brak. |
| Pagination: Load more | Select `Load more`, wpis label | `Load more label` pojawia sie i przyjmuje `More audit items`. Preview bez itemow nie renderuje linka. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Renderer pokazuje Load more tylko przy `state=ready` i `nextPageHref`. | Potwierdzic na populated source z `resolved.runtime.nextPageHref`. |
| Pagination: View all | Select `View all page`, wpis label | `View all destination` i `View all label` pojawiaja sie. Preview bez destination/listPath nie renderuje linka w `missing-source`. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Renderer uzywa `pagination.viewAllHref` albo `resolved.listPath`; brak fixture destination. | Dodac browser smoke z wybranym destination albo saved source z `listPath`. |
| Show image | Toggle OFF/ON | Po OFF znika Image ratio i pojawia sie copy `Enable "Show image" to configure image ratio.`; po ON select wraca. | Nie publikowano tej zmiany. | Dziala | Conditional branch `showImage`. | Brak. |
| Image ratio | Wybrano `Wide 16:9` | Kontrolka przyjmuje wybor; bez itemow nie ma `<img>`. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Renderer stosuje image ratio tylko, gdy item ma `imageSrc`. | Dodac seeded item z `imageSrc` do UI audytu. |
| Tag display + tag limit | Wybrano `Badges`, wpisano `4` | Kontrolki przyjmuja wartosci; brak itemow/tagow w preview. | Nie publikowano tej zmiany. | Dziala w granicach fixture | `tagMode` i `tagLimit` dzialaja na `ContentListItemCard`. | Dodac populated fixture z tagami. |
| CTA label | Wpisano `Read audit item` | Kontrolka przyjmuje wartosc; brak itemow/linkow w preview. | Nie publikowano tej zmiany. | Dziala w granicach fixture | CTA renderuje sie tylko dla runtime itemow. | Dodac populated fixture z `href`. |
| Surface colors set | Ustawiono background/border/text swatches | Editor pokazal selected-color state dla border/text; Advanced po clear pokazuje token/default poprawnie. Preview placeholder nie pokazuje kart. | Nie publikowano tej zmiany. | Dziala | SharedColorControl po TASK-343-30 rozroznia token/default; card style stosuje kolory na item card. | Dla pelnego UI dowodu uzyc populated itemow. |
| Surface colors clear | Klik Clear dla 3 kolorow | Editor pokazuje `Theme default` x3; Advanced `Background/Border/Text: Theme default`. | Nie publikowano tej zmiany. | Dziala | `clearStyle` usuwa override. | Brak. |
| Empty-state title/description | Wpisano custom empty copy | W `missing-source` nadal pokazuje source placeholder, nie empty-state. | Public baseline source placeholder. | Dziala / ograniczenie stanu | Empty state renderuje sie dopiero przy skonfigurowanym source i `resolved.items=[]`; brak source ma osobny placeholder. | Potwierdzic browserowo na stronie z source + empty resolved snapshot. |
| Advanced read-only | Klik `Advanced` | Root count 1; sekcje source/style/runtime + builder summaries; `writableControls=0`, `formControls=0`. | Nie dotyczy. | Dziala | Advanced editor ma tylko `ReadonlyWidgetSummaryRow`. | Brak. |
| Advanced source/style/runtime summaries | Po edycjach Visual | Pokazuje source binding, filters, `2 columns · Spacious spacing · Elevated cards`, runtime `0 items rendered · 0 items available`, no runtime errors. | Nie dotyczy. | Dziala z jednym wyjatkiem | Style/runtime summary prawdziwe; taxonomy stale po listing transition opisane osobno. | Naprawic hidden taxonomy finding. |

## Znalezisko do poprawy

### CL-31-05-01: `legacy -> listing` ukrywa taxonomy w Visual, ale nie czysci jej z payloadu/Advanced

**Objaw:** w Visual legacy wpisano `filters.taxonomy = audit-topic`, potem w Wizard
wybrano `By listing query` i wrocono do Visual. Sekcja Daily filters poprawnie
ukryla legacy controls i pokazala tylko listing query/template. Advanced nadal
pokazal:

- `Source mode: By listing query`,
- `Daily filters: Taxonomy: audit-topic · Search: No search text · Featured: All entries...`

**Status:** do poprawy. Search i Featured zostaly wyczyszczone, ale Taxonomy zostal.

**Dlaczego:** `updateSourceMode` w
`core/admin/ui/widgets/editors/ContentListEditors.tsx:842` czysci przy przejsciu
do listing tylko `authorId`, `searchQuery` i `featuredOnly`:

- `authorId: ""`,
- `searchQuery: ""`,
- `featuredOnly: false`.

Nie czysci `taxonomy`. Advanced summary w liniach `1853-1859` raportuje potem
ukryta wartosc, mimo ze listing branch UI mowi, ze query owns filtering.

**Jak naprawic:** w `updateSourceMode(..., mode === "listing")` dodac
`taxonomy: ""`. Dodatkowo dopisac test w
`tests/vitest/ui/content-list-editor-wave.test.tsx`: ustaw legacy
`filters.taxonomy`, przelacz na listing, oczekuj `taxonomy === ""` i Advanced
bez ukrytego taxonomy. Alternatywnie, jesli produkt chce zachowac legacy filters
po powrocie do legacy, Advanced w listing mode powinien jawnie pokazac
`Listing query owns filters` zamiast ukrytego legacy payloadu.

## Public baseline

`curl http://localhost:3000/audit-31-05-content-list` zwrocil HTTP 200 i SSR HTML z:

- `data-content-list-variant="cards"`,
- `data-content-list-source-mode="legacy"`,
- `data-content-list-source=""`,
- `data-content-list-items="0"`,
- `data-content-list-status-scope="published"`,
- `data-content-list-state="missing-source"`,
- `data-listing-widget="content-list"`,
- placeholder `Choose a content type in widget settings to render entries here.`

To potwierdza, ze swieza strona audytowa publikuje domyslny Content List bez
zrodla. Zmiany z klikanej sesji admin nie byly publikowane.

## Ograniczenia fixture

Ta strona audytowa startuje bez content type/listing query i bez saved
`resolved.items`, dlatego populated runtime (`state=ready`) nie byl uczciwie
widoczny w admin canvas ani na public route tej strony. Potwierdzone sa:
warunki UI, dane w Advanced, public missing-source baseline oraz targeted testy
renderera/resolvera. Pelny browserowy pass dla kart z obrazkiem, tagami, CTA i
pagination runtime wymaga seeded content source z `resolved.items`.

## Kod-owner

- `core/widgets/core/contentList.tsx`
  - typy, schema, defaults i contract: okolice linii 7-252,
  - normalizacja: okolice linii 587-724,
  - item card render: okolice linii 835-978,
  - pagination render: okolice linii 980-1076,
  - root attrs/state/placeholder: okolice linii 1078-1199.
- `core/admin/ui/widgets/editors/ContentListEditors.tsx`
  - Wizard source setup: okolice linii 952-1089,
  - `updateSourceMode` z taxonomy findingiem: okolice linii 842-866,
  - Visual variant/layout/filters/context/pagination/presentation/colors: okolice linii 1091-1785,
  - Advanced summary: okolice linii 1810-2005.
- `core/services/content/contentListResolver.ts`
  - legacy filter handling: okolice linii 251-268,
  - listing mode resolver branch: okolice linii 684-816.
- `tests/vitest/ui/content-list-editor-wave.test.tsx`
  - source mode/editor coverage: okolice linii 528-610,
  - Visual filters/listing transitions: okolice linii 610-700,
  - unresolved listing/content type transition coverage: okolice linii 927-1070.

## Rekomendacje

1. Naprawic CL-31-05-01: czyscic `filters.taxonomy` przy przejsciu do listing
   albo nie pokazywac ukrytych legacy filters w Advanced dla listing mode.
2. Dodac seeded Content List UI fixture z realnym source, itemem z obrazkiem,
   tagami, href i pagination runtime. Bez tego czesc opcji jest logicznie
   przetestowana, ale nie da sie ocenic wizualnie na kartach.
3. Rozszerzyc UI test o Advanced summary po `legacy -> listing`, bo obecne testy
   przechwytuja tylko czesc czyszczenia source/filter state.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-content-list run-code --filename .tmp/playwright-content-list-compact.js` — passed.
- `playwright-cli -s=codex-31-05-ui-content-list-wizard run-code --filename .tmp/playwright-content-list-wizard-compact.js` — passed.
- `playwright-cli -s=codex-31-05-ui-content-list-filters run-code --filename .tmp/playwright-content-list-filters-compact.js` — passed.
- Admin console po przebiegach: `Errors: 0`, `Warnings: 0`.
- `bun test tests/unit/widgets/contentList.test.tsx` — passed, 20 tests.
- `bun test tests/unit/content/contentListResolver.test.ts` — passed, 7 tests.
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx` — passed, 11 tests.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` — passed, 16 tests.
- `curl http://localhost:3000/audit-31-05-content-list` — HTTP 200, public baseline `missing-source`.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
