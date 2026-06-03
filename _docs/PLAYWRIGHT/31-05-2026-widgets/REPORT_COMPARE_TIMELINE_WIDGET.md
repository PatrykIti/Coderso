# RAPORT: Compare Timeline Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Compare Timeline`
> **Admin page id:** `c5e17719-9749-4537-b6bf-772532f7b213`
> **Public route:** `/audit-31-05-compare-timeline`
> **Playwright sessions:** `compare-timeline-31b`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.
> **Remediation:** TASK-391 zamknal trzy znaleziska: semantyke label-size
> `none`, axis-row step sizing oraz dormant Advanced highlight diagnostics.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem
`compare-timeline`. Klikany pass objal Wizard, Visual i Advanced. Sprawdzalem
realny efekt w live preview przez `data-compare-*`, style DOM, linki,
segmenty, kolejnosc trackow, pozycje osi i publiczny SSR.

Po UI pass zrobiono audyt kodu oraz krotki drugi przeglad subagentem. Claude
nie byl dostepny lokalnie z powodu `401`, wiec raport nie udaje walidacji przez
Claude.

Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny.
Public route pozostal baseline `dual-track`.

## Pokrycie UI

Przetestowane:

- Wizard: read-only quick setup, highlight summary, axis count,
- Visual: `dual-track` / `dual-track-highlight`, heading/subtitle, step count
  `3 -> 4`, step labels/descriptions/icons/page destination, track labels,
  marker toggles, highlight targets, segment range/link/label, reverse range
  warning, guides on/off/style, highlight label style, color set/clear,
  label sizes/weights, marker shape, track spacing, label position, max width,
  padding, track order, motion,
- Advanced: read-only runtime/metadata/normalization summaries, normalization
  action shell, dual-track replay with preserved highlight state,
- public SSR baseline,
- targeted Vitest suites for renderer, UI editor, editor contract and public
  renderer.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-compare-timeline` | Nie dotyczy admin. | HTTP 200; `data-compare-variant="dual-track"`, `labelPosition=top`, 3 kroki, dwa tracki, brak segmentow. | Dziala | Default renderer failuje bezpiecznie do zwyklego porownania bez highlight. | Brak. |
| Initial Visual | Otwarta strona i zaznaczony blok | `dual-track`, `targetTracks=b`, guide borders dashed, tracki `Traditional` i `With us`, segment count `0`. | Public baseline taki sam. | Dziala | Domyslny wariant nie renderuje segmentow. | Brak. |
| Wizard | `Run setup again` | Sekcja `compare-timeline.wizard.starter-comparison`, `writableControls=0`, brak input/select. | Nie dotyczy. | Dziala | Wizard jest starter summary only. | Brak. |
| Dual Track Highlight | Klik karta `Dual Track Highlight` | Root `variant=dual-track-highlight`; default segment `Accelerated execution` pojawia sie na tracku `b`. | Nie publikowano. | Dziala | Renderer wlacza segmenty tylko dla highlight variant. | Brak. |
| Heading / subtitle | Wpisano title i subtitle | Section przechodzi na heading `31-05 Compare Timeline Audit`; preview ma subtitle. | Nie publikowano. | Dziala | Header generuje visible heading i section label. | Brak. |
| Axis count/content | `4 steps`, labels `Discover/Automate/Launch/Review`, opis i icon | Preview ma 4 komorki osi, opis i icon `spark`; labels zapisane. | Nie publikowano. | Dziala | `normalizeCompareAxisSteps` skaluje do 3-10 krokow. | Brak. |
| Step destination | Wybrano strone `Audit 31-05 Compare Timeline` dla kroku 1 | Link pojawia sie w axis row i obu track cells dla `Discover`: `/audit-31-05-compare-timeline`. | Nie publikowano. | Dziala | Safe href normalizacja jest wspolna dla step render. | Brak. |
| Track labels | `Manual path`, `Coderso path` | `aria-label` trackow i widoczny tekst zmieniaja sie. | Nie publikowano. | Dziala | Track labels sa normalizowane do deterministycznych `a/b` ids. | Brak. |
| Highlight targets | Select `Both tracks` | Root `data-compare-target-tracks="a,b"`; oba tracki renderuja highlight cells/segments. | Nie publikowano. | Dziala w highlight variant | `highlight.targetTrackIds` jest respektowane przez renderer. | Brak. |
| Reverse segment range | Ustawiono segment `Launch -> Discover` | Editor pokazuje warning; runtime normalizuje range do `0-1`; segment link dziala. | Nie publikowano. | Dziala | `normalizeCompareTrackSegments` sortuje `from/to` po clamp. | Brak. |
| Guides OFF/ON/style | Toggle guides OFF, potem ON + `Solid` | OFF: track border style `none`; ON+Solid: `solid`. | Nie publikowano. | Dziala | `guides.enabled/style` steruja track border style. | Brak. |
| Highlight label style | `Outlined badge` | Segment label style: transparent background, border/highlight color. | Nie publikowano. | Dziala | `highlightLabelStyle=outline` mapuje style segment badge. | Brak. |
| Colors set | Ustawiono highlight/marker/track/step/muted/guide/background colors | Preview pokazuje marker `#2563eb`, guide `#64748b`, background `#f8fafc`, highlight `#f97316`. | Nie publikowano. | Dziala | Shared swatch controls mapuja na style keys. | Brak. |
| Colors clear | Klik Clear dla 7 kolorow | Editor `Selected color=0`, `Theme default=7`; preview wraca do runtime fallbackow. | Nie publikowano. | Dziala | `clearStyle` usuwa key ze style object. | Dodac test UI clear wiring, patrz rekomendacje. |
| Segment label size | `Default`, potem `Inherit` | `Default` daje segment badge `text-base`; `Inherit` usuwa `text-*`, a tekst segmentu pozostaje widoczny. | Nie publikowano. | Dziala po TASK-391 | `none` jest teraz opisane jako inherited/no explicit size, zgodnie z rendererem. | Zamkniete w `CT-31-05-01`. |
| Track label size | `Large`, potem `Inherit` | `Large` daje track label `text-base`; `Inherit` usuwa size class, a track labels pozostaja widoczne. | Nie publikowano. | Dziala po TASK-391 | `none` znaczy brak jawnej klasy rozmiaru, nie ukrycie tekstu. | Zamkniete w `CT-31-05-01`. |
| Step label size | `Default`, potem `Inherit` | Track-cell labels i axis row labels reaguja na wybrany size; `Inherit` usuwa jawne size classes przy zachowaniu tekstu. | Nie publikowano. | Dziala po TASK-391 | `CompareAxisRow` dostaje ten sam `stepLabelSizeClass`, ktory steruje track cells. | Zamkniete w `CT-31-05-02`. |
| Marker shape | `Check mark` | Marker text przechodzi na `✓/○`; root `data-compare-marker-shape=check`. | Nie publikowano. | Dziala | Marker badge content zalezy od `markerShape`. | Brak. |
| Spacing/layout | Extra spacious, labels bottom, 7XL, lg padding, Coderso first, slide | Root `labelPosition=bottom`, `maxWidth=7xl`, `padding=lg`, `trackOrder=b-first`, `motion=slide`; axis row po trackach. | Nie publikowano. | Dziala | Layout tokens trafiaja do renderer attributes/classes. | Brak. |
| Advanced after edits | Klik `Advanced` | Sekcje runtime/metadata/normalization + builder summaries; `writableControls=0`. | Nie dotyczy. | Dziala jako read-only | Advanced nie wystawia input/select. | Brak. |
| Dual Track z zapisanym highlight state | Przelaczono z highlight na `Dual Track` | Runtime `segmentCount=0`, `highlightedCells=0`, ale targetTracks nadal `a,b`; Visual pokazuje message o zachowanych segmentach, a Advanced oznacza targety dormant. | Nie publikowano. | Dziala po TASK-391 | Segmenty i targety sa preserved/dormant w `dual-track`. | Zamkniete w `CT-31-05-03`. |
| Advanced w `dual-track` | Po przelaczeniu na `Dual Track` klik `Advanced` | Advanced pokazuje dormant copy: zapisany target jest disabled w Dual Track i zachowany dla Dual Track Highlight. | Nie dotyczy. | Dziala po TASK-391 | Advanced resolve'uje aktywny variant przed prezentacja highlight diagnostics. | Zamkniete w `CT-31-05-03`. |

## Znaleziska i zamkniecie TASK-391

### CT-31-05-01 - `Hidden` dla label sizes nie ukrywa labeli

**Status:** naprawione w TASK-391. UI label dla `none` zostal zmieniony na
`Inherit`, a runtime nadal renderuje dostepne etykiety bez jawnej klasy
rozmiaru.

**Objaw:** Visual pokazuje opcje `Hidden` dla:

- `Track label size`,
- `Step label size`,
- `Segment label size`.

Po wybraniu `Hidden` tekst nadal jest widoczny. Playwright potwierdzil:

- track labels nadal renderuja `Manual path` i `Coderso path`,
- segment labels nadal renderuja `Reverse range audit` i `Accelerated execution`,
- root text nadal zawiera wszystkie etykiety,
- klasy traca `text-*`, np. track label ma `break-words font-bold`, a segment
  badge `inline-flex ... font-semibold`, ale elementy nie znikaja.

To jest truthfulness gap. TASK-343-08 naprawil poprzedni blad `segmentLabelSize`
tak, ze `none` nie zostawia juz `text-xs`; obecnie problemem jest nazwa opcji
`Hidden`.

**Dlaczego:**

- Przed TASK-391 editor mapowal `none` na label `Hidden`:
  `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx:87-93`.
- Renderer mapuje `none` na pusta klase, nie na ukrycie:
  `core/widgets/core/compareTimeline.tsx:130-149`.
- Track label i segment label sa nadal renderowane:
  `core/widgets/core/compareTimeline.tsx:941-946`,
  `core/widgets/core/compareTimeline.tsx:1040-1052`.

**Zamkniecie TASK-391:**

1. `none` zostal zachowany jako inherited/no explicit size semantics.
2. Copy dla label-size selectow zostala zmieniona z `Hidden` na `Inherit`.
3. Dodano regresje dla widocznych etykiet bez explicit text-size classes oraz
   UI regresje, ze select copy nie obiecuje ukrywania.

### CT-31-05-02 - `Step label size` nie steruje etykietami osi

**Status:** naprawione w TASK-391. Axis row uzywa tego samego
`stepLabelSizeClass`, co track-row step labels.

**Objaw:** po ustawieniu `Step label size -> Default` track-cell labels
zmieniaja size class, ale axis row dalej renderuje:

- `Discover`: `break-words text-xs font-medium`,
- `Automate`: `break-words text-xs font-medium`,
- `Launch`: `break-words text-xs font-medium`.

Po ustawieniu `Step label size -> Hidden` axis labels nadal sa widoczne i nadal
maja `text-xs`. Czyli kontrolka steruje etykietami krokow w track rows, ale nie
steruje glowna osia, mimo ze copy mowi ogolnie `Step label size`.

**Dlaczego:**

- `CompareAxisRow` hardcoduje klase `text-xs` i przyjmuje tylko
  `stepLabelWeightClass`, nie size class:
  `core/widgets/core/compareTimeline.tsx:812-860`.
- `stepLabelSizeClass` jest wyliczony i uzyty dopiero w `CompareTrackRow`:
  `core/widgets/core/compareTimeline.tsx:897-899`,
  `core/widgets/core/compareTimeline.tsx:1007-1015`.
- Obecny test rendererowy sprawdza globalny HTML substring `text-base
  font-medium`, ale nie rozdziela axis row od track cells:
  `tests/vitest/widgets/compareTimeline.test.tsx:285-306`.

**Zamkniecie TASK-391:**

1. `CompareAxisRow` przyjmuje `stepLabelSizeClass` i nie hardcoduje juz
   `text-xs`.
2. `none` usuwa explicit size class tak samo dla axis i track labels.
3. Dodano test rendererowy selekcjonujacy `data-compare-axis="true"` i track
   cells osobno dla `stepLabelSize="base"` oraz `stepLabelSize="none"`.

### CT-31-05-03 - Advanced pokazuje highlight target jako aktywny w `dual-track`

**Status:** naprawione w TASK-391. Advanced odczytuje aktywny wariant i
oznacza zapisane targety jako dormant poza `dual-track-highlight`.

**Objaw:** po ustawieniu highlightow i przelaczeniu wariantu z powrotem na
`Dual Track` runtime poprawnie nie pokazuje segmentow:

- root `variant=dual-track`,
- `segmentCount=0`,
- `highlightedCells=0`.

Visual pokazuje tez komunikat, ze segment mapping jest ukryty w Dual Track i
zapisane segmenty wroca w Dual Track Highlight. Advanced jednak pokazuje
`Highlight target: Both tracks`, bez informacji, ze w aktualnym wariancie
highlight jest dormant.

**Dlaczego:**

- Renderer aktywuje highlight tylko gdy `variant === "dual-track-highlight"`:
  `core/widgets/core/compareTimeline.tsx:888-889`.
- Visual ukrywa targety i segment editor, gdy `highlightEnabled` jest false:
  `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx:1007-1076`.
- `CompareTimelineAdvancedEditor` nie uzywa `variant` z propsow i zawsze liczy
  `highlightSummary` z danych:
  `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx:1559-1593`.

**Zamkniecie TASK-391:**

1. Advanced resolve'uje `variant` i liczy, czy highlight jest aktywny.
2. Dla `dual-track` pokazuje dormant copy z informacja, ze zapisane targety sa
   zachowane dla Dual Track Highlight.
3. W `dual-track-highlight` ta sama konfiguracja wraca do aktywnego summary.
4. Dodano UI regresje dla dormant i active diagnostics.

## Public baseline

`curl http://localhost:3000/audit-31-05-compare-timeline` zwrocil HTTP 200 i SSR
HTML z:

- `data-compare-variant="dual-track"`,
- `data-compare-label-position="top"`,
- `data-compare-target-track="b"`,
- `data-compare-target-tracks="b"`,
- `data-compare-max-width="6xl"`,
- `data-compare-padding="md"`,
- `data-compare-track-order="a-first"`,
- `data-compare-motion="none"`,
- `data-compare-marker-shape="rounded"`,
- tracki `Traditional` i `With us`,
- 3 kroki `Plan`, `Build`, `Deliver`,
- brak `data-compare-segment`.

## Ograniczenia fixture

- Public route nie zawiera zmian z draft preview.
- Nie testowano realnego save/publish po mutacjach Visual; pass sprawdzal live
  preview i SSR baseline.
- Normalize confirm modal byl klikniety jako action shell, ale raport nie
  traktuje go jako pelnej mutacji, bo nie potwierdzano finalnego normalize.
- Glowny przebieg mial jeden app-level console `404` dla zasobu pomocniczego,
  bez widget-owned crash.

## Kod-owner

- `core/widgets/core/compareTimeline.tsx`
  - schema/defaults/contract: `205-495`,
  - label size maps: `130-149`,
  - axis row step label finding: `812-860`,
  - highlight runtime gate: `888-889`,
  - track/step/segment render: `941-1052`,
  - root runtime attributes/layout: `1063-1182`.
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
  - label size copy: `87-93`,
  - variant cards: `528-594`,
  - axis/tracks editor: `878-998`,
  - markers/segments editor and dormant message: `1000-1076`,
  - colors/typography controls: `1151-1402`,
  - spacing/layout controls: `1404-1554`,
  - Advanced highlight summary finding: `1559-1593`.
- `tests/vitest/widgets/compareTimeline.test.tsx`
  - current typography tests: `285-335`; needs axis-specific coverage.
- `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
  - Visual coverage and writable paths: `539-625`,
  - custom color/Advanced smoke: `900-1011`; needs clear and dormant highlight
    assertions.

## Rekomendacje

1. TASK-391 zamknal wszystkie trzy raportowe Compare Timeline findings.
2. Dodac UI test clear-color wiring dla 7 clearable color fields; runtime test
   juz pokrywa `style: {}`, ale nie chroni podpiecia `onClear` w editorze.
3. Rozwazyc variant-aware contract metadata dla dormant highlight/segment
   paths, zeby smoke i raporty nie interpretowaly ukrytych kontrolek jako
   stale aktywnych w `dual-track`.

## Walidacja

- `playwright-cli -s=compare-timeline-31b run-code --filename .tmp/playwright-compare-timeline-compact.js` - passed.
- `playwright-cli -s=compare-timeline-31b run-code --filename .tmp/playwright-compare-timeline-dual-advanced.js` - passed.
- `curl http://localhost:3000/audit-31-05-compare-timeline` - HTTP 200.
- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/site/publicRenderer.test.tsx` - passed, 4 files / 51 tests.
- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 3 files / 38 tests (TASK-391 closure).
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `git diff --check` - passed.
- Admin console po glownym przebiegu: `Errors: 1`, `Warnings: 0`; blad:
  `Failed to load resource: the server responded with a status of 404 (Not Found)`.
- Subagent code review niezaleznie wskazal `Hidden` label-size truthfulness,
  axis row `Step label size` gap oraz Advanced highlight truthfulness w
  `dual-track`.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
