# RAPORT: Entry Teaser Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Entry Teaser`
> **Admin page id:** `21995053-9f1c-41ad-a312-d4d30e1c65db`
> **Public route:** `/audit-31-05-entry-teaser`
> **Playwright session:** `codex-31-05-ui-entry-teaser`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem
`entry-teaser`. Efekt sprawdzano w admin live preview przez
`data-entry-teaser-*`, warunkowe sekcje edytora, read-only Advanced summaries
oraz publiczny SSR pod `http://localhost:3000/audit-31-05-entry-teaser`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Publiczny route pozostal w baseline `state=missing-source`.

## Remediacja TASK-384 (2026-06-02)

Populated fixture gap z pierwotnego raportu zostal zamkniety w smoke harness:

- `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` uzywa teraz
  `/audit-31-05-entry-teaser` dla admin i public runtime zamiast stalej sciezki
  `/test-entry-teaser-0516`.
- `scripts/playwright-widget-contract-smoke.ts` bootstrappuje deterministyczny
  content type, trzy opublikowane entries (`manual`, `featured`, `fallback`),
  detail route, listing query, fallback listing query, listing template oraz
  trzy fizyczne bloki Entry Teaser na audytowej stronie.
- Smoke proof wymaga teraz trzech resolved `data-entry-teaser-state="ready"`
  rootow w admin/public, obrazu, tagow, CTA oraz braku nowych console errors.
- Unit coverage obejmuje budowanie page-data, content route, idempotentne
  seeding APIs, CSRF headers, listing query/template creation i page publish.

Live Playwright replay pozostaje zalezne od dostepnego lokalnego srodowiska i
auth state. Dry-run smoke dla Entry Teaser raportuje 0 fixture gaps oraz
0 metadata gaps.

## Pokrycie UI

Przetestowane:

- Wizard: source type `Content type` / `Listing query`; source modes
  `latest`, `featured`, `manual`; manual entry/manual listing-row conditional
  controls; empty picker states,
- Visual: Horizontal/Vertical/Minimal variants, display toggles, tag limit,
  section heading and heading levels, max width, media mode/aspect/height/fit,
  surface/border colors set/clear, radius/spacing, CTA label/mode/new-tab/style,
  fallback title/description/fallback-to-latest,
- Advanced: source/presentation/runtime/contract summaries and read-only
  contract,
- public SSR baseline,
- targeted Bun/Vitest suites for renderer/resolver/editor/preview route and
  public renderer.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-entry-teaser` | Nie dotyczy admin. | HTTP 200; `variant=horizontal`, `source.mode=legacy`, `sourceMode=latest`, `state=missing-source`, `aria-label="Entry teaser"`, tekst `Select content type to resolve teaser source.` | Dziala | Public renderer nadaje fallback accessible name i missing-source marker w `EntryTeaserBlock`. | Brak. |
| Admin initial preview | Otwarta strona i zaznaczony blok | Root `state=missing-source`, `maxWidth=lg`, `tagLimit=5`; Visual ma wszystkie sekcje dzienne plus builder layout/visibility. | Public baseline taki sam missing-source. | Dziala | Brak content type w swiezej stronie, wiec renderer pokazuje setup prompt. | Brak. |
| Wizard: Source type `Content type` | Stan startowy / powrot z listing | Widoczne `Mode` i `Content type`; lokalne API zwrocilo `content-types=[]`, wiec picker zostal pusty. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Wizard jest ownerem `source.mode`, `sourceMode`, `source.contentTypeId`, `source.entryId`. | Dodac seeded content type + entries fixture do pelnej oceny resolved teaser. |
| Wizard: Source type `Listing query` | Select `Listing query` | Root zmienia `data-entry-teaser-data-source-mode="listing"` i tekst na `Select listing query...`; widoczne `Listing query` i `Listing template`. | Nie publikowano tej zmiany. | Dziala | `updateSourceDataMode` czysci pola legacy i przelacza branch UI. | Brak. |
| Wizard: Listing latest / featured / manual | Wybrano `Manual entry`, potem `Featured entry` | `sourceMode` zmienia `latest/manual/featured`; manual pokazuje `Manual listing row` i guidance `Choose a listing query before selecting...`. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Manual row picker wlacza sie tylko dla `source.mode=listing` i `sourceMode=manual`. | Dodac seeded listing query z row IDs, zeby sprawdzic realny wybor manual row. |
| Wizard: Legacy manual / featured / latest | Wybrano `Manual entry`, `Featured entry`, `Latest entry` | `sourceMode` zmienia `manual/featured/latest`; manual pokazuje `Manual entry`, ale brak entries, bo brak content type. | Nie publikowano tej zmiany. | Dziala w granicach fixture | `canResolveEntryTeaserPreview` wymaga `contentTypeId`, a dla manual takze `entryId`. | Dodac content type + entries fixture. |
| Variant: Horizontal / Vertical / Minimal | Klikniete trzy karty wariantu | Root `data-entry-teaser-variant` zmienia `horizontal/vertical/minimal`; local field preview badge tez zmienia wariant. | Public baseline `horizontal`. | Dziala | Visual owns variant; renderer normalizuje przez `resolveEntryTeaserVariant`. | Brak. |
| Display toggles | OFF/ON dla image/excerpt/meta/tags | Switche przyjmuja stan bez bledow; przy `missing-source` root nie ma item card, wiec efekt pol jest widoczny tylko w lokalnym field preview. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Render item fields wymaga resolved `item`. | Potwierdzic na populated entry fixture z image/meta/tags/excerpt. |
| Tag limit | `Hide tags`, potem `12 tags` | Root `data-entry-teaser-tag-limit` zmienia `0` i `12`; field preview zostaje zsynchronizowany. | Public baseline `5`. | Dziala | `fields.tagLimit` ma marker publiczny i clamp w normalizacji. | Brak. |
| Section heading | Wpisano `31-05 Entry Teaser Audit`, heading `H4`, entry title `H2` | Root przechodzi z `aria-label` na `aria-labelledby`; renderuje `h4` z deterministycznym id. | Public baseline bez headingu, `aria-label="Entry teaser"`. | Dziala | Renderer ustawia `aria-labelledby` tylko gdy `section.title` istnieje. | Brak. |
| Max width | Select `Full width` | Root class zmienia `max-w-5xl -> max-w-none`; Advanced pokazuje `Layout Full width`. | Nie publikowano tej zmiany. | Dziala | `layout.maxWidth` mapuje sie przez fixed token map. | Brak. |
| Media mode | `Icon or logo`, `No media`, `Image` | Root marker zmienia `image/icon/none`. Brak obrazu w preview, bo nie ma resolved item. | Nie publikowano tej zmiany. | Dziala w granicach fixture | `media.mode` jest markerem root i kontroluje obraz dopiero w branchu `item`. | Potwierdzic z entry zawierajacym `imageSrc`. |
| Image aspect / height / fit | `1:1`, `Tall`, `Contain`, potem `16:9`, `Compact`, `Cover` | Controls przyjmuja wartosci; Advanced podsumowuje `Image / 16:9 / Compact`. Brak realnego img do oceny wymiarow. | Nie publikowano tej zmiany. | Dziala w granicach fixture | `resolveEntryTeaserMediaDimensions` i klasy img sa wykonywane tylko, gdy resolved item ma image. | Potwierdzic na populated entry image fixture. |
| Surface / border colors | Ustawiono `#f8fafc` i `#cbd5e1` | Root style ma `background-color: rgb(248,250,252)` i `border-color: rgb(203,213,225)`; editor pokazuje selected colors. | Nie publikowano tej zmiany. | Dziala | SharedColorControl zapisuje `style.surface/border`; renderer stosuje `surfaceStyle`. | Brak. |
| Clear colors | Clear dla Surface i Border | Root style wraca do pustego stringa; editor pokazuje theme defaults. | Nie publikowano tej zmiany. | Dziala | `clearStyle` usuwa klucz zamiast zapisywac sentinel. | Brak. |
| Radius / spacing | `Extra large` + `Spacious`, potem `None` + `None` | Radius zmienia root class `rounded-2xl`, potem znika. Spacing nie jest widoczny na missing-source placeholder. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Radius jest root class; spacing trafia do `article` wrappera tylko przy resolved item. | Potwierdzic spacing na resolved entry fixture. |
| CTA: Auto entry URL | Default i powrot z custom | Visual pokazuje guidance `missing_auto_destination`; root nie renderuje CTA przy missing-source. | Nie publikowano tej zmiany. | Dziala | CTA render-state zalezy od resolved item href; missing source nie renderuje article/CTA. | Brak. |
| CTA: Selected site page | Select `Selected site page`, brak destination | `CTA destination` pojawia sie; editor pokazuje feedback `Selected-page CTA renders as text...`. Root nadal missing-source, wiec brak public CTA. | Nie publikowano tej zmiany. | Dziala w granicach fixture | `LinkDestinationField` pokazuje custom-destination feedback, a renderer oznacza non-link CTA dopiero w branchu resolved item. | Potwierdzic na resolved item + custom missing destination. |
| CTA: Open in new tab / style | Toggle on, style `Filled button`, potem auto `Outline button` | Controls przyjmuja stan; brak public link/span przy missing-source. | Nie publikowano tej zmiany. | Dziala w konfiguracji | `cta.opensInNewTab` i `cta.style` mapuja sie w `resolveWidgetLinkAttrs`/CTA class map, ale wymagaja rendered CTA. | Potwierdzic na resolved item z safe href. |
| Fallback title / description | Wpisano `No audit entry` i opis | Local field preview pokazuje custom fallback copy. Root missing-source nadal pokazuje setup prompt `Select content type...`. | Nie publikowano tej zmiany. | Dziala / produktowo rozdzielone | Renderer rozroznia `missing-source` od `empty`: fallback copy renderuje sie dopiero, gdy source jest skonfigurowany, ale nie ma item. | Brak, chyba ze produkt chce, aby fallback copy nadpisywal takze setup prompt. Wtedy trzeba zmienic branch `!hasSource` i dodac test. |
| Fallback to latest | Toggle OFF/ON | Switch przyjmuje stan; brak listing/featured data, wiec efekt resolvera nie jest widoczny w UI. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Resolver testy pokrywaja featured listing fallback. | Potwierdzic na listing fixture bez featured row. |
| Advanced read-only | Klik `Advanced` | Sekcje: source diagnostics, presentation diagnostics, runtime summary, contract summary + builder summaries; `writableControls=0`, `formControls=0`. | Nie dotyczy. | Dziala | Advanced re-renderuje tylko `ReadonlyWidgetSummaryRow`. | Brak. |
| Advanced diagnostics | Po Visual zmianach | Pokazuje `Content type`, `Latest entry`, `Content type ID: Not selected`, `Media Image / 16:9 / Compact`, `Layout Full width`, `Style Radius None, spacing None`, `Colors Theme defaults`. | Nie dotyczy. | Dziala | Podsumowania czytaja te same normalized pola co renderer. | Brak. |

## Znaleziska do poprawy

Brak twardej usterki widget-owned w przebiegu UI-first.

Zarejestrowano dwa console errors podczas sesji admin:

- `Failed to load resource: the server responded with a status of 404 (Not Found)`,
- `Cannot use a ref on a React element as a container to createRoot or createPortal...`.

Nie zostaly powiazane z `Entry Teaser` jako kontraktem widgetu: test nie
wywolal crasha, wszystkie kontrolki dzialaly, a targeted suites przeszly. To
warto sprawdzic osobno jako app-level console hygiene, zwlaszcza jesli inne
widgety zaczna pokazywac ten sam blad podczas otwierania page editor.

## Public baseline

`curl http://localhost:3000/audit-31-05-entry-teaser` zwrocil HTTP 200 i SSR HTML z:

- `aria-label="Entry teaser"`,
- `data-entry-teaser-variant="horizontal"`,
- `data-entry-teaser-data-source-mode="legacy"`,
- `data-entry-teaser-source-mode="latest"`,
- `data-entry-teaser-media-mode="image"`,
- `data-entry-teaser-max-width="lg"`,
- `data-entry-teaser-tag-limit="5"`,
- `data-entry-teaser-source=""`,
- `data-entry-teaser-state="missing-source"`,
- text `Select content type to resolve teaser source.`

## Ograniczenia pierwotnego fixture

Lokalne admin API zwrocilo:

- `content-types=[]`,
- `listings/queries.items=[]`,
- `listings/templates.items=[]`.

Dlatego UI browserowo nie mogl potwierdzic pelnego resolved item branch:
obrazow, meta/excerpt/tags, CTA link/span, safe target/rel, spacing na article,
manual entry picker, manual listing row picker ani fallback-to-latest na listing
featured. Te kontrakty zostaly pokryte targeted tests; do pelnego browser pass
potrzebny jest seeded content/listing fixture.

Status po TASK-384: seeded content/listing fixture zostal dodany do smoke
harness, a powyzsze ograniczenie nie jest juz otwartym findingiem dla
automatycznego smoke.

## Kod-owner

- `core/widgets/core/entryTeaser.tsx`
  - editor contract: okolice linii 319-430,
  - source/state/DOM markers/accessibility: okolice linii 908-999,
  - missing-source vs resolved/empty branches: okolice linii 1019-1119,
  - media/CTA/tag render branch: okolice linii 1030-1105.
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
  - source mode switching and preview eligibility: okolice linii 600-827,
  - source diagnostics/source summary helpers: okolice linii 843-900,
  - section/layout/media/style Visual controls: okolice linii 1474-1785,
  - CTA controls/guidance: okolice linii 1965-2107,
  - Wizard/Visual/Advanced editor composition: okolice linii 2110-2434.
- `tests/unit/widgets/entryTeaser.test.tsx`
  - Bun renderer/resolver/contract coverage: 17 tests.
- `tests/vitest/widgets/entryTeaser.test.tsx`
  - Vitest renderer/contract coverage: 16 tests.
- `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
  - editor wave coverage: 11 tests.
- `tests/integration/routes/entryTeaserPreview.test.ts`
  - internal preview route and error mapping coverage: 2 tests.

## Rekomendacje

1. Zbadac app-level console hygiene dla powtarzalnego React `createRoot` /
   `createPortal` errora, jesli wystapi tez w kolejnych widgetach.

Zamkniete przez TASK-384: seeded content/listing fixture oraz stale public route
404.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-entry-teaser run-code --filename .tmp/playwright-entry-teaser-compact.js` — passed.
- Admin console po przebiegu: `Errors: 2`, `Warnings: 0` (opisane wyzej jako app-level console hygiene, nie widget crash).
- `bun test tests/unit/widgets/entryTeaser.test.tsx` — passed, 17 tests.
- `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx` — passed, 16 tests.
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx` — passed, 11 tests.
- `bun test tests/integration/routes/entryTeaserPreview.test.ts` — passed, 2 tests.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` — passed, 16 tests.
- `curl http://localhost:3000/audit-31-05-entry-teaser` — HTTP 200, public baseline `missing-source`.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
