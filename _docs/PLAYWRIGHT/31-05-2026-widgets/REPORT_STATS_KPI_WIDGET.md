# RAPORT: Stats KPI Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Stats KPI`
> **Admin page id:** `feaa4227-9a75-4293-bfd1-ca4b9ec14da5`
> **Public route:** `/audit-31-05-stats-kpi`
> **Playwright sessions:** `codex-31-05-ui-stats`, `codex-31-05-ui-stats2`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI:

1. Otworzono swieza strone `/audit-31-05-stats-kpi` z domyslnym blokiem.
2. Zaznaczono blok w page builderze i klikano kontrolki Visual/Advanced.
3. Efekt sprawdzano w admin live preview po atrybutach `data-stats-kpi-*`,
   klasach Tailwind, inline styles, statusach dialogow i tekstach linkow.
4. Public route sprawdzono przez `http://localhost:3000/audit-31-05-stats-kpi`.
5. Dla zachowan potencjalnie mylacych wykonano audyt kodu w
   `StatsKpiEditors.tsx` i `statsKpi.tsx`.

## Pokrycie UI

Przetestowane:

- warianty: Cards, Inline, Split Highlight,
- inline dividers: show/hide, intensity, saved vs rendered state,
- nieaktywne dividers w Cards/Split Highlight i komunikaty pomocnicze,
- liczba metryk, Add metric, Move down, Remove z confirm dialogiem,
- header: title, description,
- metryka: value, prefix, suffix, label, description, icon, accent color,
  trend label, trend direction,
- link metryki: href, label, open in new tab, unsafe `javascript:` rejection,
- typografia: value size, value/label/description color, Clear,
- powierzchnie: card background, card border, icon size, icon surface,
  icon border,
- layout: section background, max width, padding, min height, alignment,
  spacing,
- Advanced read-only summaries, safe-link summary, Normalize now, Reset to
  defaults,
- public SSR baseline.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Cards | Domyslny stan i powrot z innych wariantow | `data-stats-kpi-variant="cards"`, grid `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, dividers nie renderuja sie. | Public baseline renderuje Cards SSR. | Dziala | `StatsKpiBlock` wybiera grid dla `resolvedVariant === "cards"`. | Brak. |
| Variant: Inline | Klik `Inline` | `variant=inline`, container `flex flex-wrap`, card surface controls sa readonly z note o braku card boxes. | Nie publikowano tej zmiany. | Dziala | `cardSurfaceControlsDisabled` w edytorze blokuje card fields; renderer dla inline nie przekazuje `cardStyle`. | Brak. |
| Variant: Split Highlight | Klik `Split Highlight` | `variant=split-highlight`, pierwsza metryka ma `data-stats-kpi-highlighted="true"`, container `grid grid-cols-1 lg:grid-cols-3`. | Nie publikowano tej zmiany. | Dziala | Renderer rozdziela `items[0]` i `splitRest`, a first card dostaje highlight classes. | Brak. |
| Inline dividers on | Inline z domyslnym dividerem | `data-stats-kpi-divider="true"`, `dividerSaved=true`, 5 klas `.border-l` dla 6 metryk. | Nie publikowano tej zmiany. | Dziala | `resolveStatsKpiDividerState` zwraca rendered state tylko dla Inline; `StatsKpiCard` dodaje `border-l` od drugiej metryki. | Brak. |
| Divider intensity | Select `Strong` w Inline | `data-stats-kpi-divider-intensity="strong"`, klasy divider intensity przechodza do itemow. | Nie publikowano tej zmiany. | Dziala | `dividerIntensityClassMap.strong` jest uzyty w inline wrapperze. | Brak. |
| Divider off | Toggle `Show dividers` off w Inline | `data-stats-kpi-divider="false"`, `dividerSaved=false`, brak `.border-l`; intensity zostaje zapisana jako konfiguracja. | Nie publikowano tej zmiany. | Dziala | Edytor zapisuje `style.divider=false`; renderer oddziela saved intent od rendered output. | Brak. |
| Dividers w Cards/Split Highlight | Po przejsciu z Inline do Cards/Split Highlight | Switch jest disabled, pojawia sie note `Dividers render only in Inline`, `data-stats-kpi-divider="false"`. | Nie publikowano tej zmiany. | Dziala | Edytor uzywa `resolveStatsKpiDividerState`; Advanced pokazuje `Inactive in Cards/Split Highlight; saved setting ...`. | Brak. |
| Metrics count | Select `6` | `data-stats-kpi-count="6"` i 6 metryk w preview. | Nie publikowano tej zmiany. | Dziala | `setItemsCount` normalizuje `items` do wybranej liczby. | Brak. |
| Add metric | Klik `Add metric` przy 6 metrykach | Liczba wzrosla z 6 do 7, root `data-stats-kpi-count="7"`. | Nie publikowano tej zmiany. | Dziala | `addItem` dodaje item do limitu `statsKpiItemMax`. | Brak. |
| Move down | Klik `Move down` dla pierwszej metryki | Pierwsza metryka zmienila sie z `Projects launched` na `Platform uptime`. | Nie publikowano tej zmiany. | Dziala | `moveItem` przestawia elementy tablicy i renderer czyta nowy porzadek. | Brak. |
| Remove | Klik `Remove` dla ostatniej metryki | Pokazuje confirm `Remove metric 7?...`; po potwierdzeniu liczba spada z 7 do 6. | Nie publikowano tej zmiany. | Dziala | `confirmAndRemoveItem` uzywa confirm guard i `removeItem`. | Brak. |
| Header title/description | Fill title i description | Preview pokazuje `31-05 Stats KPI Audit` i opis `Stats helper copy changed through Visual.` | Nie publikowano tej zmiany. | Dziala | `HeaderFields` patchuje `header.*`; renderer pokazuje header, gdy pola nie sa puste. | Brak. |
| Metric value/prefix/suffix | Ustaw `$`, `88`, `k` | Preview renderuje `$88k` w jednym value blocku. | Nie publikowano tej zmiany. | Dziala | Renderer trzyma prefix/value/suffix jako osobne spany w `data-stats-kpi-value-size`. | Brak. |
| Metric label/description/icon | Fill label, description, icon `OK` | Preview pokazuje `Audit revenue`, opis i ikonke `OK`. | Nie publikowano tej zmiany. | Dziala | `updateItem` aktualizuje item; renderer renderuje teksty bez dodatkowej transformacji. | Brak. |
| Metric accent color | Ustaw accent `#ff0000` | Wartosc, trend i icon color pierwszej metryki sa czerwone. | Nie publikowano tej zmiany. | Dziala | `StatsKpiCard` uzywa `item.accentColor ?? valueColor` dla value/trend/icon. | Brak. |
| Trend label/direction | Ustaw `+31%` i `Down` | Preview pokazuje `↓ +31%`, `data-stats-kpi-trend-direction="down"`. | Nie publikowano tej zmiany. | Dziala | `resolveStatsKpiTrendSymbol` mapuje direction na symbol, renderer dodaje marker direction. | Brak. |
| Link href/label/new tab | Href `/audit-31-05-hero`, label `Open audit hero`, open in new tab on | Pierwsza metryka renderuje sie jako `<a>`, `href=/audit-31-05-hero`, `target=_blank`, `rel=noopener noreferrer`. | Nie publikowano tej zmiany. | Dziala | `resolveWidgetLinkAttrs` dodaje bezpieczne atrybuty dla dozwolonego href. | Brak. |
| Unsafe link | Wpisz `javascript:alert(1)` | Metryka zmienia sie na `<article>`, `data-stats-kpi-link="false"`, helper mowi ze renderuja sie tylko relative/hash/http(s). | Nie publikowano tej zmiany. | Dziala | `resolveWidgetLinkAttrs` odrzuca unsafe href, a edytor pokazuje `renderLinkValidation`. | Brak. |
| Value size | Select `Hero` | Root ma `data-stats-kpi-value-size="xl"`, value class `text-5xl`. | Nie publikowano tej zmiany. | Dziala | `valueSizeOptions` mapuja `Hero -> xl`, renderer uzywa `valueSizeClassMap.xl`. | Brak. |
| Value/label/description colors | Ustaw `#00ff00`, `#0000ff`, `#ff00ff` | Label i description dostaja inline colors; value color dziala dla metryk bez per-item accent. Metryka z accentem pozostaje w accent color, a Visual `Value color` wyjasnia ten priorytet. | Nie publikowano tej zmiany. | Dziala po UX guard | Renderer celowo daje pierwszenstwo `item.accentColor` przed globalnym `style.valueColor`; Visual help opisuje override dla value/trend/icon/link. | Zamkniete w TASK-375/TASK-375-01; UI i renderer regresje utrwalaja help oraz accent-over-global precedence. |
| Clear value color | Klik `Clear` przy Value color | Advanced pokazuje `valueColor: var(--color-text)`; nieakcentowane value wracaja do theme text. | Nie publikowano tej zmiany. | Dziala | `clearStyle(..., "valueColor")` usuwa override, renderer bierze fallback `var(--color-text)`. | Brak. |
| Card background/border | Ustaw `#fef3c7` i `#111111` | Card style ma `background-color: rgb(254, 243, 199); border-color: rgb(17, 17, 17);`. | Nie publikowano tej zmiany. | Dziala | `cardStyle` sklada `cardBackground` i `cardBorderColor` przez `resolveClearableStyleValue`. | Brak. |
| Icon size/surface/border | Select `Large`, ustaw `#eeeeee`, `#222222` | Icon class ma `h-10 w-10 text-lg`, style ma surface i border colors. | Nie publikowano tej zmiany. | Dziala | `iconSizeClassMap.lg` i `iconStyle` sa przekazywane do `StatsKpiCard`. | Brak. |
| Section background/max width/padding/min height | Ustaw `#dddddd`, `Full width`, `Spacious`, `Default` | Root ma `max-w-none px-6 py-10 min-h-[16rem]`, background `rgb(221, 221, 221)`. | Nie publikowano tej zmiany. | Dziala | Renderer mapuje style przez `sectionWidthClassMap`, `sectionPaddingClassMap`, `minHeightClassMap` i `sectionStyle`. | Brak. |
| Alignment/spacing | Select `End`, `Spacious` | Root `items-end text-right`, container `gap-6` / `justify-end` w Inline. | Nie publikowano tej zmiany. | Dziala | `alignmentClassMap`, `justifyClassMap`, `spacingClassMap` i `cardsGridClassMap` sa zgodne z preview. | Brak. |
| Advanced diagnostics | Klik `Advanced` | Pokazuje read-only: resolved variant, metric count, layout/style tokens, safe link status, runtime summary. | Nie dotyczy. | Dziala | `StatsKpiAdvancedEditor` ma tylko readonly summary rows plus repair actions. | Brak. |
| Advanced Normalize | Klik `Normalize now`, confirm | Pokazuje status `Stats KPI payload normalized.`. | Nie dotyczy. | Dziala | `confirmStatsKpiRepair` gate + `onChange(normalizeValue(value))` + `repairFeedback`. | Brak. |
| Advanced Reset | Klik `Reset to defaults`, confirm | Preview wraca do default cards, 4 metryki; status `Stats KPI defaults restored; layout reset to Cards.` | Nie dotyczy. | Dziala | `resetStatsKpiToDefaults` resetuje payload i wariant przez `onVariantChange`/`onBlockPatch`. | Brak. |

## Public baseline

`curl http://localhost:3000/audit-31-05-stats-kpi` zwrocil HTTP 200 i SSR HTML z:

- `data-stats-kpi-variant="cards"`,
- `data-stats-kpi-count="4"`,
- `data-stats-kpi-alignment="center"`,
- `data-stats-kpi-spacing="md"`,
- `data-stats-kpi-divider="false"`,
- `data-stats-kpi-divider-saved="true"`,
- `data-stats-kpi-value-size="md"`,
- heading `Proof in numbers`,
- metryka `Projects launched`,
- link `See launch examples`.

To potwierdza, ze swieza strona audytowa publikuje domyslny Stats KPI.
Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny
w tym pass.

## Kod-owner

- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
  - Visual controls: wariant/liczba/metyki/header/style w okolicach linii
    809-1510.
  - Advanced diagnostics i repair actions w okolicach linii 1530-1705.
- `core/widgets/core/statsKpi.tsx`
  - `StatsKpiCard` renderuje itemy, safe links, accent override i dividers w
    okolicach linii 760-887.
  - `StatsKpiBlock` mapuje style, warianty i `data-stats-kpi-*` w okolicach
    linii 889-1040.

## Wynik i remediacja

Nie znaleziono defektu produktu w glownej macierzy opcji Stats KPI.

Jedyna notatka UX zostala zamknieta jako guard: globalny `Value color` nie
zmienia metryk, ktore maja ustawiony `Metric accent color`, poniewaz accent
celowo ma pierwszenstwo dla value/trend/icon/link. Visual `Value color` ma teraz
krotki help opisujacy ten priorytet.

Walidacja remediacji:

- Focused UI regression failed before the help copy because `Value color` did
  not explain metric accent precedence.
- Focused UI regression passed after the help copy.
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Renderer regression confirms accented metrics use `accentColor` while
  non-accented metrics still use global `valueColor`.

## Console / srodowisko

- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- `playwright-cli run-code` przerywa zwrocenie wyniku przy natywnych
  `window.confirm`; akcje `Remove`, `Normalize now` i `Reset to defaults`
  byly dlatego potwierdzane osobnymi krokami `dialog-accept`/snapshot.
- Kolory weryfikowano natywnym setterem inputa `type=color`; zwykle
  przypisanie `input.value` nie wyzwala Reactowego `onChange` i moze dac falszywy
  negatywny wynik w automatyzacji.
