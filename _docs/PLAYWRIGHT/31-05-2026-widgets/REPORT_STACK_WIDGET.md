# RAPORT: Stack Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz
> public runtime.
> **Strona admin:** `Audit 31-05 Stack`
> **Admin page id:** `84298801-c280-4757-8acc-8037c75d12e8`
> **Public routes:** `/audit-31-05-stack`, `/audit-31-05-stack-empty`,
> `/audit-31-05-stack-legacy-scalar`, `/audit-31-05-stack-css-probe`,
> `/audit-31-05-stack-invalid-variant`, `/audit-31-05-stack-invalid-data`
> **Playwright sessions:** `codex-31-05-ui-stack-fixture`,
> `codex-31-05-ui-stack-public`, `codex-31-05-ui-stack-breakpoints`,
> `codex-31-05-ui-stack-admin`, `codex-31-05-ui-stack-interaction2`,
> `codex-31-05-ui-stack-variant`
> **Claude:** read-only cross-check uruchomiony. Claude potwierdzil runtime
> coverage i finding z wariantem `responsive` bez zapisanego `direction`.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem `stack`.
Przed testem przeczytano `_docs/_WIDGETS/STACK.md`, taski `TASK-286` i
`TASK-256-05-02`, implementacje `core/widgets/core/stack.tsx`,
`core/admin/ui/widgets/editors/StackEditors.tsx`,
`core/widgets/validator.ts`, `core/widgets/renderers/widgetRenderer.tsx`,
historyczny raport `_docs/PLAYWRIGHT/28-05-2026/REPORT_STACK_WIDGET.md`
oraz testy `tests/vitest/widgets/stack.test.tsx` i
`tests/vitest/ui/stack-editor-wave.test.tsx`.

Przez admin API utworzono i opublikowano fixture pages:

- `/audit-31-05-stack` - rich responsive Stack with two child widgets,
  desktop/tablet row, mobile column, mixed gap/align/justify/wrap values,
- `/audit-31-05-stack-empty` - default vertical Stack with empty slot,
- `/audit-31-05-stack-legacy-scalar` - `variant=responsive`, legacy scalar
  `align/justify/wrap`, no saved `direction`,
- `/audit-31-05-stack-css-probe` - current-state probe for previously broken
  responsive utilities such as `lg:flex-col`, `md:items-end`, `lg:flex-wrap`,
  `md:gap-8`, `lg:gap-10`,
- `/audit-31-05-stack-invalid-variant` - invalid variant,
- `/audit-31-05-stack-invalid-data` - invalid breakpoint data.

Admin UI pass objal Wizard read-only guidance, Visual variant cards,
responsive direction/gap controls, alignment/justify/wrap controls, slot
guidance, Structure, block layout/visibility and Advanced diagnostics. Public
runtime sprawdzono realnym DOM-em: `data-stack-*` markers, computed flex CSS,
row-flow child wrappers, empty placeholder, invalid payloads and overflow at
375/800/1280 px. Dodatkowo interaction probe kliknal warianty oraz
reprezentatywne Desktop/Tablet selecty i switche.

## Pokrycie UI

Przetestowane:

- Wizard: read-only setup and content slot guidance,
- Visual: variant cards, responsive direction/gap cards, axis/wrap cards, slot
  guidance, shared Structure and block settings,
- Advanced: read-only runtime and support summaries,
- public runtime: rich responsive, empty, legacy scalar, CSS-probe,
  invalid-variant and invalid-data routes,
- Claude cross-check: niezalezny read-only review kodu, walidatora, renderera
  and Playwright evidence.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial rich render | Otwarta `/audit-31-05-stack` | Visual root istnieje; Responsive selected, desktop/tablet row, mobile column, 2 slot children. | HTTP 200, rootCount `1`, `data-stack-items=2`, no overflow. | Dziala | Runtime markers match saved rich data. | Brak. |
| Variant: Horizontal | Klik karty Horizontal | `variant=horizontal`, direction becomes `row/row/row`; gap/align/justify/wrap preserved. | Normal saved UI path persists explicit direction, so public renderer uses row values. | Dziala | `buildVariantSyncedStackData()` patches direction only. | Brak. |
| Variant: Responsive | Klik karty Responsive | `variant=responsive`, direction becomes `row/row/column`; gap/align/justify/wrap preserved. | Rich public route matches `row/row/column` when direction is explicitly saved. | Dziala w UI | Atomic variant + data patch works in admin. | API/import edge without direction is finding STK-31-05-01. |
| Variant: Vertical | Klik karty Vertical | `variant=vertical`, direction becomes `column/column/column`; other axis values preserved. | Empty default route renders vertical. | Dziala | Variant cards are presets, not hard locks. | Brak. |
| Variant miniatures | Visual inspect | Miniatures exist for vertical, horizontal and responsive cards. | Nie dotyczy public runtime. | Dziala | `data-stack-variant-miniature` emitted by editor. | Brak. |
| Desktop flow | Interaction probe set Desktop flow to Stack vertically | Attribute changed to `directionDesktop=column`, class `lg:flex-col`. | CSS probe at 1280 computed `flexDirection=column`. | Dziala | Literal desktop class map includes `lg:flex-col`. | Brak. |
| Tablet flow | Interaction/public fixture set Tablet flow row | Attribute `directionTablet=row`, class `md:flex-row`. | At 800 computed `flexDirection=row`. | Dziala | Literal tablet class map includes `md:flex-row`. | Brak. |
| Mobile flow | Rich fixture mobile column; CSS probe mobile row | Attributes and base classes switch between `flex-col` and `flex-row`. | 375 rich => column; 375 css-probe => row. | Dziala | Mobile classes are base literals. | Brak. |
| Gap none | Rich mobile gap `none` | Visual shows No spacing; marker `gapMobile=none`, class `gap-0`. | 375 computed gap `0px`. | Dziala | UI hides duplicate `0`, runtime preserves `none`. | Brak. |
| Gap scale | Rich/CSS probe use `8`, `10`, `12` | Visual shows Roomy / Extra spacious labels. | 800 `md:gap-8` => `32px`; 1280 `lg:gap-10` => `40px`; 1280 `lg:gap-12` => `48px`. | Dziala | TASK-343 literal maps cover tablet/desktop gaps. | Brak. |
| Align start/center/end/baseline/stretch | Fixtures and interaction cover start, center, end, baseline, stretch | Visual cards expose all labels per breakpoint. | Public computed: start `flex-start`, center, end `flex-end`, baseline, stretch across tested breakpoints. | Dziala | Bounded align tokens map to literal classes. | Brak. |
| Justify between/around/evenly/center/start | Fixtures and interaction cover representative tokens | Visual cards expose all distribution labels. | Public computed: `space-between`, `space-around`, `space-evenly`, `center`, `flex-start` across tested routes. | Dziala | Bounded justify tokens map to literal classes. | Brak. |
| Wrap on/off | Rich has desktop/mobile true and tablet false; CSS probe desktop true only | Visual switch text changes between can wrap / stay on one line. | 375 rich wrap; 800 rich nowrap; 1280 css-probe wrap. | Dziala | Literal wrap maps include base, `md:` and `lg:` values. | Brak. |
| Row-flow children | Rich/CSS probe with child spacers | Structure shows Content slot with 2 items; fixed slot actions disabled when no move target. | Each child is wrapped in `data-widget-surface=row-flow-item`, class `min-w-0 max-w-full`. | Dziala | Stack uses nested row-flow render context. | Brak. |
| Empty slot | `/audit-31-05-stack-empty` | Slot guidance remains admin-only; no child widgets. | `data-stack-items=0`, public text `Empty stack.`. | Dziala | Empty public placeholder is neutral. | Brak. |
| Legacy scalar align/justify/wrap | `/audit-31-05-stack-legacy-scalar` | Not normally authored by Visual; Advanced has compatibility copy. | Scalar axis values fan out to all breakpoints: align baseline, justify around, wrap true. | Dziala for scalar axis | `normalizeResponsiveValue()` supports scalar values. | Brak for axis fields. |
| Missing direction with responsive variant | `/audit-31-05-stack-legacy-scalar` | API/import edge; Visual cards normally save direction explicitly. | Public now resolves absent responsive `direction` to `row/row/column`; horizontal omitted direction is covered as `row/row/row`. | Dziala po remediacji | TASK-370 adds `preserveAbsentDefaultKeys: ["direction"]`, so the generic validator no longer injects vertical direction before Stack variant defaults. | Naprawione w TASK-370; covered by WidgetRenderer and validator regressions. |
| CSS historical probe | `/audit-31-05-stack-css-probe` | Nie dotyczy admin beyond fixture values. | 800/1280 computed CSS matches attrs for `md:items-end`, `lg:flex-col`, `lg:flex-wrap`, `md:gap-8`, `lg:gap-10`. | Dziala | Old Tailwind dynamic-class issue is closed by literal maps. | Brak. |
| Invalid variant | `/audit-31-05-stack-invalid-variant` | Nieosiagalne przez normalny UI. | HTTP 200, rootCount `0`, `Invalid widget data`. | Dziala fail-closed | `normalizeWidgetBlock()` rejects unknown variants. | Brak. |
| Invalid data | `/audit-31-05-stack-invalid-data` | Nieosiagalne przez normalny UI. | HTTP 200, rootCount `0`, `Invalid widget data`. | Dziala fail-closed | Schema rejects unknown breakpoint keys and enum values. | Brak. |
| Wizard | `Run setup again` | Wizard root exists, `writablePaths=[]`, no raw controls; only guidance and content-slot note. | Nie dotyczy bez zapisu. | Dziala | Wizard is guidance-only setup surface. | Brak. |
| Visual ownership | Rich admin inspect | Sections: Variant and flow, Responsive direction, Responsive alignment and wrap, Slot guidance, Structure, Block layout, Visibility; `rawControlCount=0`, `unwrappedControls=[]`. | Public output matches saved Visual values when data is explicit. | Dziala | Editor contract and shared metadata align. | Brak. |
| Advanced diagnostics | Rich admin inspect | Advanced root exists, `writablePaths=[]`, `rawControlCount=0`, no unwrapped controls; summaries match saved desktop/tablet/mobile state. | Nie dotyczy bez zapisu. | Dziala | Advanced uses readonly summary rows. | Brak. |

## Znaleziska do poprawy

### STK-31-05-01 - Responsive/horizontal variant defaults are bypassed when imported data omits `direction`

**Status:** fixed in TASK-370 on 2026-06-01. The original defect was confirmed
by Playwright and Claude cross-check before remediation.

**Wplyw:** correctness bug for API/import/legacy payloads. Normal Visual
authoring works because variant cards write `variant` and `direction` together.
The bug appears when a saved non-empty Stack payload has a non-vertical variant
but no `direction` key.

**Evidence:**

- `/audit-31-05-stack-legacy-scalar` was saved with `variant=responsive`,
  scalar `align/justify/wrap`, and no `direction`.
- Public runtime rendered `data-stack-variant="responsive"` but
  `data-stack-direction-desktop="column"`,
  `data-stack-direction-tablet="column"`,
  `data-stack-direction-mobile="column"`.
- The expected variant default for responsive is `row/row/column`.
- Direct Visual interaction is not affected: clicking Responsive produced
  `row/row/column`; clicking Horizontal produced `row/row/row`; clicking
  Vertical produced `column/column/column`.

**Why / code:**

- `stackDefaults.direction` is vertical for all breakpoints:
  `core/widgets/core/stack.tsx:200-205`.
- `normalizeWidgetBlock()` flat-merges defaults before render:
  `core/widgets/validator.ts:159-168`.
- Because merged `direction` is now a valid object, `normalizeStackData()` never
  falls back to `resolveStackVariantDirectionDefaults()`:
  `core/widgets/core/stack.tsx:394-438`.
- `StackBlock` receives already-merged data on the real `WidgetRenderer` path:
  `core/widgets/core/stack.tsx:440-455`.

**Remediation (2026-06-01):**

- Added `preserveAbsentDefaultKeys: ["direction"]` to `createStackWidget()`.
  The generic validator already supports this for non-empty saved/imported
  data, so absent `direction` now remains absent until Stack can apply
  variant-aware defaults.
- Added regressions:
  - render through `WidgetRenderer` a `variant="responsive"` Stack with
    non-empty data but no `direction`; expect `row/row/column`,
  - same for `variant="horizontal"`; expect `row/row/row`,
  - `normalizeWidgetBlock()` does not inject vertical direction into non-empty
    payloads that omit `direction`.

## Claude cross-check

Claude was run in read-only mode with `Read/Grep` tools only. It reviewed Stack
docs, source, validator, renderer, tests and Playwright evidence.

Claude independently confirmed:

- responsive class emission is now build-safe through literal maps,
- invalid variant/data fail closed through schema and renderer error mapping,
- row-flow children use the correct nested wrapper,
- legacy scalar `align/justify/wrap` normalize correctly,
- admin ownership and atomic variant cards match the contract,
- the only actionable defect in this pass is the absent-`direction` variant
  default bypass on the full renderer path.

## Co dziala

- Current public CSS matches responsive direction/gap/align/justify/wrap attrs
  at 375/800/1280 px, including historically problematic `md:` and `lg:`
  classes.
- Variant cards patch direction atomically and preserve gap/axis/wrap settings.
- Visual exposes all expected breakpoint controls; Wizard and Advanced are
  read-only.
- Row-flow children are wrapped safely and do not force page overflow.
- Empty Stack output is neutral and public-safe.
- Invalid variants and invalid breakpoint data fail closed.
- Non-empty imported/admin Stack payloads that omit `direction` preserve that
  absence through validation, so `horizontal` and `responsive` variants apply
  their own direction defaults at render.

## Kodowe punkty kontroli

- Editor contract ownership:
  `core/widgets/core/stack.tsx:51-125`.
- Strict schema and breakpoint enums:
  `core/widgets/core/stack.tsx:135-174`.
- Variant-agnostic base defaults:
  `core/widgets/core/stack.tsx:200-210`.
- Stack's validator opt-in for preserving omitted `direction` on non-empty
  saved/imported data:
  `core/widgets/core/stack.tsx:548-552`.
- Literal responsive class maps:
  `core/widgets/core/stack.tsx:215-336`.
- Variant-aware direction resolver:
  `core/widgets/core/stack.tsx:394-438`.
- Runtime markers and row-flow child rendering:
  `core/widgets/core/stack.tsx:462-515`.
- Atomic variant patch:
  `core/admin/ui/widgets/editors/StackEditors.tsx:296-329` and
  `core/admin/ui/widgets/editors/StackEditors.tsx:681-700`.
- Generic default merge:
  `core/widgets/validator.ts:159-168`.

## Walidacja

Remediacja TASK-370 (2026-06-01):

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx`
  - PASS: 2 files, 14 tests.
- `bun test tests/unit/widgets/validator.test.ts`
  - PASS: 34 tests.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx`
  - PASS: 6 files, 80 tests.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `git diff --check` - PASS.
- `timeout 180s claude -p --dangerously-skip-permissions --max-budget-usd 0.8 "Review the current staged TASK-370 Stack diff only..."`
  - PASS: no blockers; Claude confirmed the normalization contract, runtime
    markers, tests, task board, and changelog.

Oryginalny UI-first pass:

- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx`
  - PASS: 6 files, 77 tests.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `git diff --check -- _docs/PLAYWRIGHT/31-05-2026-widgets/README.md` -
  PASS.
- `perl -ne 'print "$ARGV:$.: trailing whitespace\n" if /[ \t]$/; print "$ARGV:$.: space before tab\n" if / \t/;' ...`
  on Stack report and Playwright scripts - PASS.
- `LC_ALL=C rg -n "[^\x00-\x7F]" ...` on Stack report and Playwright scripts -
  PASS (no non-ASCII).
