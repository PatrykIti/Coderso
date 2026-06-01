# RAPORT: Feature Grid Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Feature Grid`
> **Admin page id:** `f19c50e7-43bc-4bd8-8b21-4a5f04b3c72f`
> **Public route:** `/audit-31-05-feature-grid`
> **Playwright session:** `codex-31-05-ui-feature`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI:

1. Otworzono swieza strone `/audit-31-05-feature-grid` z domyslnym blokiem.
2. Zaznaczono blok w page builderze i klikano kontrolki Visual/Advanced.
3. Efekt sprawdzano w admin live preview po atrybutach `data-feature-grid-*`,
   klasach Tailwind, inline styles, stanie dialogow i tekstach linkow.
4. Public route sprawdzono przez `http://localhost:3000/audit-31-05-feature-grid`.
5. Dla znalezionego dryftu wykonano audyt kodu w `FeatureGridEditors.tsx`.

## Pokrycie UI

Przetestowane:

- warianty: Cards 3, Cards 4, Highlight First,
- blokada `Columns` przy Highlight First,
- zmiana liczby kart, redukcja z confirm dialogiem, Add card, Move down, Remove,
- Header copy: eyebrow, title, description,
- karta: title, plain/rich description mode, emoji preset, image clear disabled state,
- CTA: enable/disable, label, page destination, target new-tab,
- layout: columns, gap, horizontal/vertical, text align, padding, media size,
- kolory: card background, border color, section background, Clear,
- border width, radius, max width, header size, card title size, hover effect,
- Advanced read-only summaries,
- public SSR baseline.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Cards 3 | Domyslny stan i powrot z Highlight First | `data-feature-grid-variant="cards-3"`, `count=3`, grid `sm:grid-cols-2 lg:grid-cols-3`. | Public baseline renderuje Cards 3 SSR. | Dziala | `variantDefaultColumnsMap["cards-3"] = "3"` i renderer mapuje klasy kolumn. | Brak. |
| Variant: Cards 4 | Klik karta wariantu | `variant=cards-4`, `count=4`, `columns=4`, grid `lg:grid-cols-4`. | Nie publikowano tej zmiany. | Dziala | `buildVariantSyncedFeatureGridData` synchronizuje wariant z 4 kartami. | Brak. |
| Variant: Highlight First | Klik z Cards 4 | `variant=highlight-first`, `count=4`, `columns=3`, pierwsza karta `data-feature-grid-highlighted="true"` i `md:col-span-2`. | Nie publikowano tej zmiany. | Dziala | `featureGridVariantItemCountMap.highlight-first = 4`; brak confirm jest poprawny, bo nie ma redukcji liczby kart. | Brak. |
| Highlight First: Columns | Po wyborze Highlight First | `Columns` jest faktycznie disabled (`button.disabled=true`), a preview wymusza 3-kolumnowy spotlight. | Nie publikowano tej zmiany. | Dziala | Edytor ustawia `disabled={resolvedVariant === "highlight-first"}`; renderer ignoruje reczny columns dla spotlight. | Brak. |
| Variant reduction: Highlight First -> Cards 3 | Klik Cards 3 po Highlight First | Otwiera dialog `Reduce feature cards`; przed potwierdzeniem preview zostaje `highlight-first count=4`; po `Switch layout` jest `cards-3 count=3`. | Nie publikowano tej zmiany. | Dziala | `requestVariantChange` porownuje docelowy count z `items.length` i ustawia `pendingReduction`. | Brak. |
| Cards count: 3 -> 5 | Select `Cards count = 5` | Preview ma `data-feature-grid-count="5"` i 5 kart. | Nie publikowano tej zmiany. | Dziala | `setItemsCount` uzywa `normalizeFeatureGridItems(current.items, count)`. | Brak. |
| Cards count: 5 -> 2 | Select `2` | Otwiera dialog `Reduce feature cards`; przed confirm zostaje 5 kart; po `Reduce cards` zostaja 2. | Nie publikowano tej zmiany. | Dziala | `pendingReduction.kind="count"` chroni destrukcyjna redukcje. | Brak. |
| Add card | Klik `Add card` po redukcji do 2 | Preview wraca do 3 kart. | Nie publikowano tej zmiany. | Dziala | `addItem` dodaje nowy item do limitu `featureGridItemMax`. | Brak. |
| Move down | Klik `Move down` dla Card 1 | Pierwsza karta zmienia sie z `Fast setup` na `Composable widgets`. | Nie publikowano tej zmiany. | Dziala | `moveItem` przestawia elementy tablicy i preview renderuje nowy porzadek. | Brak. |
| Remove | Klik `Remove` dla Card 1 | Otwiera confirm `Remove feature card`; po potwierdzeniu liczba kart spada do 2. | Nie publikowano tej zmiany. | Dziala | `pendingRemoveIndex` + `ConfirmActionDialog` chronia usuniecie. | Brak. |
| Header copy | Fill eyebrow/title/description | Header w preview pokazuje `31-05 Feature Grid Audit`; opis zmienia sie natychmiast. | Nie publikowano tej zmiany. | Dziala | `updateHeader` patchuje `header.*`; renderer renderuje header, gdy pole nie jest puste. | Brak. |
| Card title / description | Fill Card 1 title i plain description | Karta pokazuje `Audit Card One` i nowy opis. | Nie publikowano tej zmiany. | Dziala | `updateItem(..., { title, description })` aktualizuje item. | Brak. |
| Emoji preset | Klik `Set card 1 icon to 🚀` | Input ikony i preview zmieniaja sie na `🚀`; hit target dziala. | Nie publikowano tej zmiany. | Dziala | Presety sa normalnymi buttonami `data-feature-grid-emoji-preset`. | Brak. |
| Description mode: Rich | Select `Rich` | Pojawia sie rich text editor (`contenteditable=true`), a preview nadal renderuje tresc karty. | Nie publikowano tej zmiany. | Dziala | Edytor przelacza na `PostRichTextAdapter`; renderer renderuje `dangerouslySetInnerHTML` tylko w rich mode. | Brak. |
| CTA disabled | Toggle `Enable CTA` off | Input label jest disabled, preview link znika (`linkCount=0`). | Nie publikowano tej zmiany. | Dziala | Renderer wymaga `ctaEnabled !== false`, label i bezpiecznego href. | Brak. |
| CTA page destination + new tab | Toggle on, label `Audit CTA`, wybierz page `Audit 31-05 Hero`, target `New tab` | Link ma tekst `Audit CTA`, href `/audit-31-05-hero`, `target="_blank"`, `rel="noopener noreferrer"`. | Nie publikowano tej zmiany. | Dziala | `LinkDestinationField` zapisuje slug strony; `resolveWidgetLinkAttrs` dodaje bezpieczne atrybuty. | Brak. |
| Columns + gap | Select `2 columns`, `Spacious` | Root ma `columns=2`, `gap=lg`, grid `sm:grid-cols-2 gap-7`. | Nie publikowano tej zmiany. | Dziala | `columnsClassMap` i `gapClassMap` sa zgodne z preview. | Brak. |
| Card layout / text align / padding / media size | Select `Horizontal`, `Center`, `Spacious`, `Large` | Karta ma `sm:flex-row sm:items-start p-6`; body `items-center text-center`. | Nie publikowano tej zmiany. | Dziala | Renderer laczy klasy z map layoutu, paddingu i align. | Brak. |
| Card background / border color / section background | Swatche ustawione na `#00ff00`, `#ff0000`, `#0000ff` natywnym eventem input | Card style: `background-color: rgb(0, 255, 0)`, `border-color: rgb(255, 0, 0)`; section style: `background-color: rgb(0, 0, 255)`; kontrolki pokazuja `selected_swatch`. | Nie publikowano tej zmiany. | Dziala | `SharedColorControl` aktualizuje `style.surfaceColor`, `style.borderColor`, `style.sectionBackground`. | Brak. |
| Clear card background | Klik `Clear Card background` | `style.surfaceColor` znika; card style nie ma `background-color`; state label `cleared`. | Nie publikowano tej zmiany. | Dziala | `clearStyleField` usuwa klucz ze `style`. | Brak. |
| Border width + radius | Select `3px`, `Extra large` | Card style ma `border-width: 3px`; class ma `rounded-xl`. | Nie publikowano tej zmiany. | Dziala | `borderWidthValueMap` i `radiusClassMap` dzialaja. | Brak. |
| Container / typography / hover | Select `Full`, `Large`, `Large`, `Lift` | Section `max-w-none`; header `text-3xl`; card title `text-xl`; karta ma klasy hover lift. | Nie publikowano tej zmiany. | Dziala | `maxWidthClassMap`, `headerSizeClassMap`, `cardTitleSizeClassMap`, `hoverEffectClassMap`. | Brak. |
| Advanced: layout/content summaries | Klik `Advanced` | Pokazuje read-only: layout Cards 3, 2 cards, desktop rhythm 2 column, spacing Spacious, header configured, media/action summaries. | Nie dotyczy. | Dziala | Advanced jest diagnostyczne i nie wystawia writable controls. | Brak. |
| Advanced: color summary for theme tokens | Otworz Advanced na stanie z domyslnym `style.borderColor=var(--color-border)` plus `var(...)`/`color-mix(...)` values | Card background, border and section background summarize token values as `Theme token`; no token state says `Saved custom color`. | Nie dotyczy. | Dziala po remediacji | TASK-372 reuses shared `describeSharedColorControlState()` in Advanced summaries, matching Visual color-control wording. | Naprawione w TASK-372; covered by focused Advanced regression. |

## Public baseline

`curl http://localhost:3000/audit-31-05-feature-grid` zwrocil HTTP 200 i SSR HTML z:

- `data-feature-grid-variant="cards-3"`,
- `data-feature-grid-count="3"`,
- heading `Everything your team needs`,
- karty `Fast setup`, `Composable widgets`, `Conversion ready`,
- CTA links `Explore setup`, `View widgets`, `See examples`.

To potwierdza, ze swieza strona audytowa publikuje domyslny Feature Grid.
Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny
w tym pass.

## Znaleziska i remediacja

### FG-31-05-01 - Theme token border colors must not be described as saved custom colors

**Status:** fixed in TASK-372 on 2026-06-01.

**Original evidence:** Advanced used a local `describeFeatureGridColor()` helper
that only knew empty values and hex swatches, so `var(--color-border)` and
other CSS token states were reported as `Saved custom color`.

**Fix:** Advanced summaries now reuse `describeSharedColorControlState()`, the
same shared color-state contract used by shared color controls. `var(...)` and
`color-mix(...)` values summarize as `Theme token`; non-token custom values can
still summarize as `Saved custom color`.

**Regression:** `tests/vitest/ui/feature-grid-editor-wave.test.tsx` renders
Advanced with `style.surfaceColor`, `style.borderColor`, and
`style.sectionBackground` set to `var(...)`/`color-mix(...)` values and asserts
the Presentation summary contains three `Theme token` states and no
`Saved custom color`.

## Console / srodowisko

- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- Kolory weryfikowano natywnym setterem inputa `type=color`; zwykle
  przypisanie `input.value` nie wyzwala Reactowego `onChange` i moze dac falszywy
  negatywny wynik w automatyzacji.

## Walidacja TASK-372

- Focused Advanced regression before fix:
  - FAIL: all three token values rendered as `Saved custom color`.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/feature-grid-editor-wave.test.tsx -t "describes theme token colors"`
  - PASS: 1 test, 8 skipped.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/widgets/featureGrid.test.tsx`
  - PASS: 2 files, 24 tests.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `git diff --check` - PASS.
- `timeout 180s claude -p --dangerously-skip-permissions --max-budget-usd 0.6 "Review the current staged TASK-372 Feature Grid diff only..."`
  - PASS: no blockers; Claude confirmed shared color contract alignment,
    Advanced wording, focused regression, docs/task board/changelog, and
    read-only runtime/security scope.
