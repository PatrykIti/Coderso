# RAPORT: Posts Feed Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Posts Feed`
> **Admin page id:** `53f468ea-b124-4b72-af6a-9d4fdabeb1b5`
> **Public route:** `/audit-31-05-posts-feed`
> **Playwright session:** `codex-31-05-ui-posts-feed`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem `posts-feed`.
Efekt sprawdzano w admin live preview przez `data-content-list-*`,
`data-posts-feed-motion`, warunkowe sekcje edytora, route guidance, read-only
Advanced summaries oraz publiczny SSR pod
`http://localhost:3000/audit-31-05-posts-feed`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Publiczny route pozostal w baseline `state=empty` z `0` postow.

## Pokrycie UI

Przetestowane:

- Wizard: source modes `latest`, `featured`, `category`, `manual`; category
  input; manual empty catalog state; author/date controls; featured-first;
  source limit clamp 1-24; sort,
- Visual: display toggles, section title/description, Cards/List/Compact,
  columns conditional state, gap, card style, image aspect, CTA label, colors
  set/clear, motion none/fade/slide-up, pagination modes, empty-state copy,
- Advanced: resolved query/runtime/contract summaries, route capability,
  read-only contract,
- public SSR baseline,
- targeted Bun/Vitest suites dla renderera, preview bridge, editor wave i
  public renderer.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-posts-feed` | Nie dotyczy admin. | HTTP 200; `variant=cards`, `source=post`, `items=0`, `state=empty`; tekst `No posts found`. | Dziala | Posts Feed mapuje sie na Content List z `sourceTypeId=post`. | Brak. |
| Admin initial preview | Otwarta strona i zaznaczony blok | Root `state=empty`, `items=0`; Visual ma sekcje display/header/layout/pagination/empty; route cards guidance widoczny. | Public baseline taki sam empty state. | Dziala / fixture empty | Lokalny katalog postow dla tej strony zwraca 0 resolved items. | Dodac seeded posts fixture do pelnej oceny kart. |
| Wizard: Latest posts | `Run setup again`, stan startowy | Widoczne fixed content type `Posts`, source mode, limit, sort, author/date, featured-first. | Nie publikowano tej zmiany. | Dziala | `showAuthorAndDateFilters` i `showFeaturedFirst` dla latest. | Brak. |
| Wizard: Featured posts | Select `Featured posts` | Featured-first switch znika; author/date zostaja; preview `0` items / empty. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Runtime filtruje featured, ale fixture ma 0 postow. | Dodac przynajmniej jeden featured post do UI fixture. |
| Wizard: Category/tag filter | Select, wpis `audit-category`, date range, featured-first | Category input widoczny i przyjmuje wartosc; date from/to przyjmuja `2026-01-01` / `2026-12-31`; featured-first on. | Nie publikowano tej zmiany. | Dziala | Category UI jest widoczne tylko w mode `category`; date/featured-first dzialaja dla category/latest. | Brak. |
| Wizard: Manual selection | Select `Manual selection` | Manual picker pokazuje `No posts available`; sort zamienia sie w read-only `Order is determined by your selection.` | Nie publikowano tej zmiany. | Dziala w granicach fixture | Manual branch wymaga katalogu postow; tu brak postow. | Dodac seeded posts fixture, zeby przetestowac select/order/move. |
| Source limit | Wpisano `30`, potem `0` | Input klampuje `30 -> 24`, `0 -> 1`. | Nie publikowano tej zmiany. | Dziala | `normalizeContentListLimit` w normalizacji Posts Feed. | Brak. |
| Sort | Select `Title Z-A` | Wizard trigger i Advanced pokazuja `title-desc` / `Title Z-A`. | Nie publikowano tej zmiany. | Dziala | `sortOptions` + `updateSource`. | Brak. |
| Display toggles | OFF/ON dla show image/excerpt/author/date/CTA | Switche zmieniaja stan bez bledow; preview nadal empty, wiec brak kart do ukrywania pol. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Display fields renderuja sie na `ContentListItemCard`, ktory wymaga itemow. | Potwierdzic na seeded posts. |
| Section title / description | Wpisano title i opis | Root `aria-labelledby=audit-31-05-posts-feed-title`; preview zawiera oba teksty. | Public baseline bez zmian. | Dziala | Section chrome renderuje H2/opis w mapped Content List. | Brak. |
| Variant: Cards/List/Compact | Klikniete 3 warianty | Root `data-content-list-variant` zmienia sie na `cards/list/compact`. | Public baseline `cards`. | Dziala | `visualOwnsVariantSelection` + Content List renderer. | Brak. |
| Columns | Cards vs List/Compact | Cards ma editable columns; List/Compact pokazuja summary `Columns only affect the cards variant.` | Nie publikowano tej zmiany. | Dziala | `supportsColumns = resolvedVariant === "cards"`. | Brak. |
| Gap / card style / image aspect / CTA label | Wybrano `Spacious`, `Elevated`, `Wide`, wpisano `Read audit post` | Controls przyjmuja wartosci; preview empty nie pokazuje kart. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Style mapuja sie do Content List item cards, ale itemow brak. | Dodac populated posts fixture z obrazkiem/linkiem. |
| Colors set | Ustawiono card bg/border/text | Editor pokazal `Selected color` x3; brak kart do inline style. | Nie publikowano tej zmiany. | Dziala w granicach fixture | SharedColorControl dziala; renderer stosuje style na item cards. | Potwierdzic na seeded posts. |
| Colors clear | Clear dla 3 kolorow | Editor wraca do `Theme default` x3. | Nie publikowano tej zmiany. | Dziala | `clearStyle` usuwa style key i SharedColorControl pokazuje cleared state. | Brak. |
| Motion: Fade in | Select `Fade in` | Root opakowany `data-posts-feed-motion="fade"`, style count `1`. | Nie publikowano tej zmiany. | Dziala | `PostsFeedBlock` dodaje style/keyframes i wrapper dla motion != none. | Brak. |
| Motion: Slide up | Select `Slide up` | Root opakowany `data-posts-feed-motion="slide-up"`, style count `1`. | Nie publikowano tej zmiany. | Dziala | Ten sam motion wrapper; style zawiera reduced-motion guard. | Brak. |
| Motion: No motion | Select `No motion` | Wrapper znika, style count `0`. | Public baseline brak motion. | Dziala | `motion === "none"` zwraca sam `ContentListBlock`. | Brak. |
| Pagination: Load more | Select, page size `2`, label `More audit posts` | Controls widoczne i przyjmuja wartosci; preview empty nie renderuje linka. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Link wymaga runtime `nextPageHref`. | Potwierdzic na seeded posts z > pageSize. |
| Pagination: View all | Select, label `View all audit posts` | `View all destination` widoczne; `data-posts-feed-route-guidance="view-all"` obecne, bo brak list/detail route. | Nie publikowano tej zmiany. | Dziala / truthful | `resolvePostsFeedRouteState` pokazuje missing destination/list route. | Brak, poza fixture route setup. |
| Pagination: Paged / None | Select `Paged navigation`, potem `No pagination` | Page size pojawia sie dla paged i znika dla none; preview empty bez nav. | Public baseline none. | Dziala | Conditional pagination UI. | Brak. |
| Empty-state copy | Wpisano title/opis | Preview empty aktualizuje sie live: `No audit posts` + custom opis. | Public baseline default copy. | Dziala | Empty state branch renderuje przy `source=post` i `items=[]`. | Brak. |
| Advanced read-only | Klik `Advanced` | Sekcje: resolved-query, runtime-status, contract-summary + builder summaries; `writableControls=0`, `formControls=0`. | Nie dotyczy. | Dziala | Posts Feed Advanced jest read-only po TASK-340. | Brak. |
| Runtime status | Po wait 2.5s | Advanced: `Preview sync resolved 0 items from latest`, timestamp `May 31, 2026, 10:19 PM`; root nadal `empty`. | Public baseline `empty`. | Dziala | Preview bridge resolve konczy sie bez bledow, ale katalog ma 0 itemow. | Seed data, nie kod. |

## Znalezisko do poprawy

### PF-31-05-01: Advanced pokazuje inactive `Category` jako aktywny source filter w trybie Latest

**Objaw:** w Wizard wybrano `Category/tag filter`, wpisano `audit-category`, potem
przelaczono source mode na `Latest posts`. UI dla Latest nie pokazuje category
inputa. Po przejsciu do Advanced panel pokazal:

- `Source mode: Latest posts`,
- `Source filters: Category: audit-category | From: 2026-01-01 | To: 2026-12-31 | Featured first`.

Date range i featured-first sa aktywne w Latest, ale `category` nie jest.
Runtime potwierdza to w `core/services/content/postsFeedRuntime.ts:321-343`:
category filtr jest stosowany tylko przy `mode === "category"`.

**Status:** do poprawy: diagnostyka Advanced mowi, jakby category nadal
filtrowalo wynik, chociaz runtime ignoruje category poza source mode `category`.

**Dlaczego:** `PostsFeedAdvancedEditor` w
`core/admin/ui/widgets/editors/PostsFeedEditors.tsx:1833-1842` buduje
`Source filters` z surowego `source.category`, bez sprawdzenia `source.mode`.
Jednoczesnie UI pokazuje category input tylko dla `mode === "category"` w
okolicach `PostsFeedEditors.tsx:922` i `980-995`.

**Jak naprawic:** w Advanced summary uwzgledniac `source.category` tylko, gdy
`source.mode === "category"`, albo jawnie oznaczac go jako stored inactive
filter. Jesli produkt nie chce zachowywac category po wyjsciu z trybu category,
mozna czyscic `source.category` przy zmianie source mode, ale to jest bardziej
destrukcyjne dla uzytkownika. Dodac test w
`tests/vitest/ui/posts-feed-editor-wave.test.tsx`: category set -> mode latest
-> Advanced nie pokazuje category jako aktywnego filtra.

## Public baseline

`curl http://localhost:3000/audit-31-05-posts-feed` zwrocil HTTP 200 i SSR HTML z:

- `data-content-list-variant="cards"`,
- `data-content-list-source-mode="legacy"`,
- `data-content-list-source="post"`,
- `data-content-list-items="0"`,
- `data-content-list-status-scope="published"`,
- `data-content-list-state="empty"`,
- titleless fallback `aria-label="Content list"`,
- empty state `No posts found` / `Publish posts or adjust source settings to populate this feed.`

To potwierdza, ze swieza strona audytowa publikuje domyslny Posts Feed z pustym
resolved setem. Zmiany z klikanej sesji admin nie byly publikowane.

## Ograniczenia fixture

W tym srodowisku `/audit-31-05-posts-feed` i admin preview rozwiazaly `0` postow.
Dlatego nie da sie uczciwie browserowo ocenic item card visuals: obrazkow,
tagow, autora/daty, CTA/linkow, manual ordering ani realnych hrefow paginacji.
Zweryfikowane sa warunki UI, runtime empty state, route guidance, motion wrapper,
Advanced i targeted testy renderer/resolver/preview bridge.

## Kod-owner

- `core/widgets/core/postsFeed.tsx`
  - model, schema, defaults i normalizacja: okolice linii 24-470,
  - route-state guidance: okolice linii 619-660,
  - motion wrapper: okolice linii 662-728,
  - editor contract: okolice linii 731-848.
- `core/services/content/postsFeedRuntime.ts`
  - mode/category/manual filtering: okolice linii 321-343,
  - author/date filters: okolice linii 289-305,
  - featured-first sort: okolice linii 308-319,
  - resolved data entry point: okolice linii 399-425.
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
  - source mode options: okolice linii 41-62,
  - Wizard source controls and conditional category/manual/date/featured fields: okolice linii 930-1152,
  - preview bridge: okolice linii 1156-1187,
  - Visual display/header/layout/pagination/empty controls: okolice linii 1189-1768,
  - Advanced source filter finding: okolice linii 1788-1844.
- `tests/unit/widgets/postsFeedWidget.test.tsx`
  - renderer/resolver/contract coverage: 16 tests.
- `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
  - editor wave coverage: 13 tests.
- `tests/vitest/ui/page-editor-posts-feed-preview.test.tsx`
  - preview state non-persistence and page editor bridge coverage: 3 tests.

## Rekomendacje

1. Naprawic PF-31-05-01 w Advanced summary, z preferencja dla conditional display
   zamiast destrukcyjnego czyszczenia category.
2. Dodac seeded Posts Feed UI fixture z minimum 3 postami: jeden featured, jeden
   z media image, jeden z tagiem/category, plus enabled post detail/list route.
   To odblokuje realne sprawdzenie kart, linkow, obrazkow, manual order i
   paginacji.
3. Rozszerzyc Vitest editor wave o przypadek inactive category w latest mode.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-posts-feed run-code --filename .tmp/playwright-posts-feed-compact.js` — passed.
- Admin console po przebiegu: `Errors: 0`, `Warnings: 0`.
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx` — passed, 16 tests.
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx` — passed, 13 tests.
- `bun run test:vitest -- tests/vitest/ui/page-editor-posts-feed-preview.test.tsx` — passed, 3 tests.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` — passed, 16 tests.
- `curl http://localhost:3000/audit-31-05-posts-feed` — HTTP 200, public baseline `empty`.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
