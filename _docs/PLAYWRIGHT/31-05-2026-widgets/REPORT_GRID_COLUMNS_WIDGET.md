# RAPORT: Grid Columns Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Grid Columns Rich`
> **Admin page id:** `aba8b9e2-ac4e-45c1-9e63-4518bf8c414a`
> **Public routes:** `/audit-31-05-grid-columns`, `/audit-31-05-grid-columns-rich`, `/audit-31-05-grid-columns-masonry`, `/audit-31-05-grid-columns-overflow`, `/audit-31-05-grid-columns-unsafe`
> **Playwright sessions:** `codex-31-05-ui-grid-columns`, `codex-31-05-ui-grid-columns-public`, `codex-31-05-ui-grid-columns-advanced`, `codex-31-05-ui-grid-columns-interaction`
> **Claude:** pierwotny audyt UI-first powstal bez Claude z powodu `401 Invalid authentication credentials`; pass remediacyjny TASK-363 zostal dodatkowo sprawdzony lokalnym Claude CLI po naprawach.

## Status remediacji (2026-06-01)

TASK-363 zamknal znalezisko GC-31-05-01:

- `Reapply asymmetric desktop widths` ma stabilne action metadata z path `columns.desktopSpan`.
- Shared Structure `Add Column` i column row actions maja path `slots.column`.
- Section-specific Structure metadata pozostaje na kontrakcie `regions`.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem
`grid-columns`. Przed testem przeczytano `_docs/_WIDGETS/GRID_COLUMNS.md`,
taski `TASK-325`, `TASK-271`, `TASK-256-05-01` i `TASK-336-14`,
implementacje `core/widgets/core/gridColumns.tsx`, edytory
`core/admin/ui/widgets/editors/GridColumnsEditors.tsx`, shared Structure UI w
`core/admin/ui/pages/builder/BlockSettings.tsx` i
`core/admin/ui/pages/builder/VisualPanel.tsx` oraz testy
`tests/vitest/widgets/gridColumns.test.tsx`,
`tests/vitest/ui/grid-columns-editor-wave.test.tsx` i marker coverage w
`tests/vitest/widgets/renderer.test.tsx`.

Przez admin API utworzono i opublikowano fixture pages:

- `/audit-31-05-grid-columns` - baseline default, 2 puste kolumny,
- `/audit-31-05-grid-columns-rich` - 3 live `column:*` slots, asymmetric,
  custom spans, reverse phone order, hidden mobile column, XL/2XL spans,
  cardized global style i per-column override,
- `/audit-31-05-grid-columns-masonry` - `masonry-lite`, global
  `cardizeColumns=false`, zeby potwierdzic wymuszone card wrappers,
- `/audit-31-05-grid-columns-overflow` - desktop/tablet totals ponad 12,
  zgodnie z decyzja `no-runtime-guard`,
- `/audit-31-05-grid-columns-unsafe` - unsafe color strings, zeby sprawdzic
  fail-closed schema/runtime path.

Admin UI pass objal `Run setup again`, Wizard quick start, Visual varianty,
alignment, reverse-on-phone, live Structure count, width presets, desktop/tablet
/ phone / XL / 2XL spans, visibility toggles, span totals, gaps, cardized
columns, color/token controls, per-column surface/height/overflow/alignment,
shared Structure controls oraz Advanced diagnostics. Interaction smoke
potwierdzil realne klikniecia: reapply asymmetric widths zmienilo `7/3/2` na
`6/3/3`, Masonry Lite zablokowal cardized switch jako wlaczony, a Equal
ponownie zaznaczyl wariant.

Public runtime sprawdzono realnym DOM-em: data markers, slot ids, responsive
classes, card styles, editor-only labels/placeholders, unsafe strings, invalid
widget fallback i body overflow.

## Pokrycie UI

Przetestowane:

- Wizard: setup-only variant cards i brak daily writable paths,
- Visual: variant, align, reverse mobile, count/Structure lock, labels, spans,
  presets, totals, gaps, cardized surfaces, safe color tokens, per-column
  overrides, shared Structure and block layout/visibility,
- Advanced: read-only layout, override and content-area diagnostics, no raw JSON,
- public runtime: default, rich asymmetric, masonry-lite, over-12 totals and
  unsafe invalid payload.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-grid-columns` i zaznaczony blok | Visual root istnieje, default 2 columns. | HTTP 200, `data-grid-columns-variant="equal"`, `count=2`, brak `Empty column.`. | Dziala | `GridColumnsBlock` ukrywa placeholder przez `renderEditorPlaceholder()` poza preview. | Brak. |
| Wizard quick start | `Run setup again` | Starter cards Equal / Asymmetric / Masonry Lite; `writablePaths=[]`, no raw JSON. | Nie dotyczy bez zapisu. | Dziala | Wizard jest action/setup-only, a docs mowia ze daily sizing zostaje w Visual. | Brak; shell buttons bez metadata nie sa Grid-local. |
| Visual variant cards | Klik Asymmetric/Masonry/Equal | Cards zmieniaja selected variant; interaction smoke potwierdzil Masonry i Equal. | Public rich/masonry routes maja odpowiednio `asymmetric` i `masonry-lite`. | Dziala | Visual wrapper ma `data-widget-control-path="variant"` i `visualOwnsVariantSelection=true`. | Brak. |
| Asymmetric reapply | Klik `Reapply asymmetric desktop widths` | W UI `7/12, 3/12, 2/12` zmienia sie na `6/12, 3/12, 3/12`, copy przechodzi na active. | Nie dotyczy bez zapisu; helper logic zgodny z presetem. | Dziala | Po TASK-363 button ma `data-widget-control`, path `columns.desktopSpan` i action ownership. | Brak. |
| Content area count | Visual count przy live slots | Select pokazuje `3`, jest zablokowany; copy mowi, ze Structure kontroluje shared areas. | Public rich renderuje 3 live slots `column:lead/proof/action`. | Dziala | `resolveGridColumnsForSlots()` preferuje live repeatable slots nad saved columns. | Brak. |
| Width presets | Karty `33/33/33`, `25/50/25` | Widoczne z `data-widget-control-path="columns.desktopSpan"`. | Nie dotyczy bez zapisu. | Dziala | Presety materializuja spans dla aktualnej kolejnosci content areas. | Brak. |
| Desktop/tablet/phone spans | Rich fixture | Visual pokazuje `7/3/2`, tablet `6/6/12`, phone `12/12/12`. | Public classes: `lg:col-span-7/3/2`, `md:col-span-6/6/12`, `col-span-12`. | Dziala | Tokeny span sa ograniczone schema i class maps. | Brak. |
| XL / 2XL spans | Rich fixture | Column 1: `8/12` wide, `7/12` very wide; inne match desktop. | Public column 1 ma `xl:col-span-8 2xl:col-span-7`. | Dziala | Optional spans sa renderowane tylko gdy sa zapisane. | Brak. |
| Visibility toggles | Rich fixture z `proof.hideOnMobile=true` | Visual pokazuje Hide on mobile dla kolumn. | Public proof column ma `hidden md:block`; labels nie leakujace do body. | Dziala | `normalizeColumnVisibility()` i class resolver skladaja breakpoint classes. | Brak. |
| Reverse on phone | Rich fixture + interaction | Switch wlaczony; Visual copy zgodna. | Public columns maja `order-3`, `order-2`, `order-1` i `md:order-none`. | Dziala | Reverse order ograniczony do mobile order classes. | Brak. |
| Span totals / no auto balance | Rich i overflow fixtures | Visual pokazuje Desktop `12/12`, Tablet `24/12`, Phone `24/12` oraz copy o additional rows. | Overflow route ma `lg:col-span-7` + `lg:col-span-7`, brak body overflow. | Dziala | `gridColumnsOverflowDecision="no-runtime-guard"` i CSS grid zawija nadmiar. | Brak. |
| Gaps and align | Rich fixture | Visual `Stretch`, `Wide gap`, `Small gap`. | Public markers `align=stretch`, `gapX=8`, `gapY=3`; root nie overflowuje. | Dziala | Layout tokens ida przez bounded maps. | Brak. |
| Cardized columns | Rich fixture | Switch wlaczony, global background `var(--color-surface)`, border `#cbd5e1`. | Public proof/action maja `border p-4 rounded-xl` i safe inline style. | Dziala | Color schema i `normalizeGridColumnsColorValue()` dopuszczaja tylko hex albo `var(--color-*)`. | Brak. |
| Masonry forced card cards | Klik Masonry Lite i public masonry route | Switch `aria-checked=true`, disabled; helper copy `Masonry Lite always...`. | Public `masonry-lite` ma cardized wrappers mimo `cardizeColumns=false`. | Dziala | `resolveGridColumnsCardizeControlsState()` i renderer wymuszaja cardized dla masonry. | Brak. |
| Per-column override | Rich column 1 | Highlight/surface/overflow/minHeight/mobileMinHeight/align visible. | Public lead column ma `self-end`, `md:min-h-[8rem]`, `overflow-hidden`, `p-6`, `rounded-2xl`, border 2. | Dziala | `resolveGridColumnsColumnSurface()` laczy global style i overrides. | Brak. |
| Shared Structure | Visual Structure section | `Add Column`, Move up/down, Remove widoczne; live slots utrzymuja content/data order. | Public slot ids sa stable: `column:lead`, `column:proof`, `column:action`. | Dziala | Po TASK-363 shared Structure add/row actions maja path `slots.column`; Section zachowuje `regions`. | Brak. |
| Shared block layout / visibility | Inspect Visual | Shared paths `layout.container`, padding/margin, `visibility.devices.*`. | Fixture pages renderuja bez overflow. | Dziala | Shared builder controls sa poza widget-local payload. | Brak. |
| Advanced diagnostics | Klik Advanced w osobnej sesji | `writablePaths=[]`, `rawControlCount=0`, no unwrapped controls; pokazuje totals, overrides, live Structure order. | Nie dotyczy. | Dziala | `GridColumnsAdvancedEditor` uzywa `ReadonlyWidgetSummaryRow`. | Brak. |
| Unsafe color strings | Fixture z `url(javascript...)` i `expression(...)` | Nieosiagalne przez normalny UI; API/import edge. | HTTP 200, widget zamieniony na `Invalid widget data`, brak raw unsafe HTML. | Dziala fail-closed; route gap shared | Grid schema odrzuca unsafe strings, ale admin API pozwolil zapisac invalid payload. | Wspolna poprawka: walidacja widget blocks na save/publish/import tym samym kontraktem co public renderer. |
| Public technical labels | Rich fixture z labelami Lead Copy / Proof Strip / Action Rail | Admin preview moze pokazac labels. | Public body nie zawiera labeli ani `Column 1`; placeholders ukryte. | Dziala | Labels renderuja sie tylko dla `editor-preview` / `admin-preview`. | Brak. |

## Znaleziska i remediacja

### GC-31-05-01 - Naprawione: action controls maja stabilne metadata

**Objaw przed TASK-363:** Visual inspection pokazal dwa unwrapped controls:

```json
[
  { "tag": "BUTTON", "text": "Reapply asymmetric desktop widths" },
  { "tag": "BUTTON", "text": "Add Column" }
]
```

Interaction smoke potwierdzil, ze `Reapply asymmetric desktop widths`
faktycznie mutuje dane: desktop spans zmienily sie z `["7/12","3/12","2/12"]`
na `["6/12","3/12","3/12"]`. To jest dzialajaca funkcja, ale bez stabilnego
metadata nie da sie jej wiarygodnie audytowac/automatyzowac per option.

Shared Structure row opakowuje slot items jako action controls, ale `Add
Column` nie ma wrappera, a Move/Remove sa action-owned bez
`data-widget-control-path`. To samo dotyka Grid Columns szczegolnie mocno, bo
docs mowia, ze live Structure order jest zrodlem prawdy dla content areas.

**Dlaczego przed TASK-363:**

- Grid-local helper istnieje: `controlAttributes()` w
  `core/admin/ui/widgets/editors/GridColumnsEditors.tsx:297-310`.
- Preset buttons sa wrapped przez `LayoutPresetButtons` path
  `columns.desktopSpan` (`GridColumnsEditors.tsx:1788-1818`), ale
  `AsymmetricVariantNotice` renderuje `Button` bez `controlAttributes`
  (`GridColumnsEditors.tsx:1983-1995`).
- Shared slot add action jest tworzona w
  `core/admin/ui/pages/builder/BlockSettings.tsx:328-338`, a renderowana jako
  plain `Button` w `core/admin/ui/pages/builder/VisualPanel.tsx:168-181`.
- Shared slot rows maja tylko `data-widget-control` i
  `data-widget-control-ownership="action"` na kontenerze
  (`VisualPanel.tsx:186-191`), bez path dla `slots.column` / `columns`.

**Naprawa w TASK-363:**

1. `Reapply asymmetric desktop widths` ma `data-widget-control="grid-columns.visual.asymmetric-reapply"`, path `columns.desktopSpan` i ownership `action`.
2. Shared Structure add/row actions dostaja path `slots.<definitionId>`; dla Grid Columns jest to `slots.column`.
3. Section region actions pozostaja na `regions`, a region label rows na `regions.<instanceId>.label`.
4. DOM regressions pokrywaja Grid Columns reapply metadata oraz Grid Columns Structure `Add Column` path.

## Co dziala

- Public renderer poprawnie trzyma live repeatable slots jako zrodlo prawdy.
- Labels i `Empty column.` sa gated do admin/editor preview i nie leakuja na
  public.
- Responsive spans, XL/2XL, visibility, reverse phone order, gap tokens,
  alignment, cardized surfaces i per-column overrides renderuja sie zgodnie z
  UI.
- Masonry Lite wymusza cardized columns w UI i runtime.
- Over-12 totals zachowuja swiadomie opisany kontrakt: CSS grid zawija, runtime
  nie auto-balansuje i nie robi horizontal overflow.
- Unsafe style strings sa fail-closed przez Grid schema/runtime i nie trafiaja
  do public HTML.
- Advanced jest read-only, bez raw JSON i bez hidden writable controls.
- Po TASK-363 Grid Columns action metadata jest kompletne dla znaleziska
  GC-31-05-01.

## Walidacja

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx` - passed, 3 files / 89 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `git diff --check -- _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_GRID_COLUMNS_WIDGET.md _docs/PLAYWRIGHT/31-05-2026-widgets/README.md` - passed.

Remediacja TASK-363 (2026-06-01):

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts --testTimeout=10000 tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 5 files / 96 tests.
