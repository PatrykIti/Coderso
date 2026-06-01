# RAPORT: Tabs Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Tabs Rich`
> **Admin page id:** `6aea4b4b-1f25-4fbc-a452-d2fd244f3dc8`
> **Public routes:** `/audit-31-05-tabs`, `/audit-31-05-tabs-rich`, `/audit-31-05-tabs-all-disabled`, `/audit-31-05-tabs-empty-panel`, `/audit-31-05-tabs-unsafe-style`, `/audit-31-05-tabs-invalid`
> **Playwright sessions:** `codex-31-05-ui-tabs-fixture`, `codex-31-05-ui-tabs-public`, `codex-31-05-ui-tabs-admin`, `codex-31-05-ui-tabs-advanced`, `codex-31-05-ui-tabs-interaction`
> **Claude:** remediation review z lokalnego CLI (2026-06-01) zakonczony wynikiem `No blockers`.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem `tabs`. Przed
testem przeczytano `_docs/_WIDGETS/TABS.md`, taski `TASK-343-27`,
`TASK-288` i `TASK-330`, implementacje `core/widgets/core/tabs.tsx`, edytor
`core/admin/ui/widgets/editors/TabsEditors.tsx`, shared Structure UI w
`core/admin/ui/pages/builder/BlockSettings.tsx` i
`core/admin/ui/pages/builder/VisualPanel.tsx` oraz testy
`tests/vitest/widgets/tabs.test.tsx`,
`tests/vitest/ui/tabs-editor-wave.test.tsx` i
`tests/vitest/ui-integration/tabs-preview-activation.test.tsx`.

Przez admin API utworzono i opublikowano fixture pages:

- `/audit-31-05-tabs-rich` - 4 panele, `underline`, vertical layout, center
  alignment, legacy saved `triggerOverflow=scroll`, active/default `details`,
  one disabled tab, custom safe colors and nested spacer content,
- `/audit-31-05-tabs-all-disabled` - 2 tabs saved as disabled, zeby sprawdzic
  normalizacje pierwszego enabled tab,
- `/audit-31-05-tabs-empty-panel` - empty public panels, zeby sprawdzic brak
  editor placeholder copy,
- `/audit-31-05-tabs-unsafe-style` - unsafe style strings in six color fields,
- `/audit-31-05-tabs-invalid` - invalid schema/import payload.

Admin UI pass objal `Run setup again`, Wizard starter tab summary, Visual
variant cards, default tab select, label/intro/subtitle/icon/unavailable
controls, layout, label style, motion, color clears, shared Structure and
Advanced diagnostics. Interaction smoke potwierdzil realne public click and
keyboard activation, disabled-tab no-op, keyboard skip over disabled tabs,
Visual variant click and default-tab select.

Public runtime sprawdzono realnym DOM-em: tablist a11y, active id, panels,
hidden state, disabled tab, legacy overflow normalization, runtime script
dedupe marker, placeholder gating, all-disabled fallback, invalid payload and
unsafe inline style handling.

## Pokrycie UI

Przetestowane:

- Wizard: setup-only starter labels/count summary and no writable paths,
- Visual: variant, tab content, default tab, unavailable tabs, layout,
  typography/motion, colors, shared Structure and block layout/visibility,
- Advanced: read-only behavior, saved tabs, display and contract summaries,
- public runtime: default, rich vertical, all-disabled fallback, empty panel,
  unsafe style strings and invalid payload.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-tabs` | Visual root istnieje; default 2 tabs. | HTTP 200, `data-coderso-tabs="1"`, active `1`, tablist `aria-label="Content tabs"`, 1 runtime script. | Dziala | Defaults sa renderowane przez `TabsBlock` i shared runtime collector. | Brak. |
| Wizard starter | `Run setup again` na rich fixture | Wizard pokazuje `4 panels from Structure`, `4 saved starter labels`, `writablePaths=[]`, no raw JSON. | Nie dotyczy bez zapisu. | Dziala | Wizard only summarizes slots/labels; daily edits zostaja w Visual. | Brak. |
| Visual variant cards | Klik `Minimal` | Selected preview zmienia sie z `underline` na `minimal`. | Nie dotyczy bez zapisu; rich public nadal `underline`. | Dziala | Variant cards sa wrapped path `variant`. | Brak. |
| Default tab | Select `FAQ` | Control przechodzi z `Details` na `FAQ`. | Nie dotyczy bez zapisu; runtime z saved data otwiera `details`. | Dziala | `options.defaultItemId` jest Visual-owned. | Brak. |
| Tab labels/intro/subtitle/icon | Inspect Visual rich | 4 panele, label/intro/subtitle/icon fields dla kazdego; Panel 2 ma badge `Default`, Panel 3 `Unavailable`. | Public triggers zawieraja labels/subtitles/icons, panels intro and nested spacer content. | Dziala | `resolvePanels()` mapuje repeatable slots po kolejnosci do normalized items. | Brak. |
| Disabled tab click | Public click disabled `locked` | Nie dotyczy admin. | Active id zostaje `overview`; `aria-disabled="true"` i `tabIndex=-1` na disabled trigger. | Dziala | Runtime `handleClick()` early-return dla disabled trigger. | Brak. |
| Keyboard activation | Public ArrowDown | Nie dotyczy admin. | `overview -> details`; osobny smoke `details -> faq`, czyli disabled `locked` jest pominiety. | Dziala | Runtime filtruje enabled triggers przed arrow navigation. | Brak. |
| All disabled fallback | `/audit-31-05-tabs-all-disabled` | Visual normalizuje Panel 1 jako enabled/default, Panel 2 unavailable. | Public active `first`; first trigger enabled, second disabled. | Dziala | `normalizeTabsItemsState()` re-enables first item gdy wszystkie zapisane sa disabled. | Brak. |
| Layout | Rich fixture | Orientation `Vertical`, alignment `Center`, padding `Large`, tab gap `Large`, content gap `Small`. | Public `aria-orientation="vertical"`, class `flex flex-col gap-3 items-center`, root `p-6 space-y-3`. | Dziala | Bounded layout token maps. | Brak. |
| Legacy overflow | Rich fixture saved `scroll` | Advanced: `Saved scroll overflow is legacy and renders as wrapping`. Visual nie pokazuje scroll control. | Public marker `data-coderso-tabs-overflow="wrap"`, no `overflow-x-auto`. | Dziala | `normalizeTabsTriggerOverflow()` zawsze zwraca `wrap`. | Brak. |
| Label style / motion | Rich fixture | Base / Semibold / Slide visible in Visual and Advanced. | Public triggers `text-base font-semibold`; panels maja slide motion classes. | Dziala | Token maps + bounded motion enum. | Brak. |
| Colors and clears | Inspect Visual | 6 color controls, 6 Clear buttons, picker swatches; Advanced reports `6 saved color choices`. | Safe fixture styles renderuja expected hex/token inline values. | Dziala dla UI-safe values | UI color picker ogranicza normalne author input do safe color values. | Brak dla UI; patrz unsafe import gap. |
| Empty public panels | `/audit-31-05-tabs-empty-panel` | Admin preview moze pokazac editor guidance. | Public nie zawiera `Add widgets to this tab panel.` i nie overflowuje. | Dziala | Placeholder idzie przez `renderEditorPlaceholder()` i jest render-context gated. | Brak. |
| Shared Structure | Visual Structure on rich fixture | `Add Panel`, Move up/down, Remove widoczne; add action, row, and row action metadata expose `slots.panel` with action ids scoped to `panel:<id>`. | Public panel order/rendering stable through `panel:1..4`. | Dziala | `VisualPanel` wraps add and row actions in metadata and mirrors action metadata onto native buttons. | Naprawione w `TABS-31-05-02` / TASK-365. |
| Shared block layout / visibility | Inspect Visual | Shared paths `layout.container`, padding/margin, `visibility.devices.*`. | Fixture pages renderuja bez body overflow. | Dziala | Shared builder controls poza widget-local data. | Brak. |
| Advanced diagnostics | Click builder tab `Advanced` | `writablePaths=[]`, `rawControlCount=0`, no unwrapped controls; legacy scroll, unavailable count and saved display summaries visible. | Nie dotyczy. | Dziala | `TabsAdvancedEditor` uzywa read-only summary rows. | Brak. |
| Invalid payload | `/audit-31-05-tabs-invalid` | Nieosiagalne przez normalny UI; API/import edge. | HTTP 200, rootCount `0`, `Invalid widget data`, no raw invalid strings. | Dziala fail-closed; route gap shared | Widget schema rejects invalid minItems/enums/unknown fields, ale admin API allowed save/publish. | Wspolna walidacja save/publish/import widget blocks. |
| Unsafe style strings | `/audit-31-05-tabs-unsafe-style` | Nieosiagalne przez normalny UI color picker; API/import edge. | Unsafe strings normalize to empty style values; public SSR no longer emits raw `javascript:`, `expression(`, `data:`, `url(...)`, or semicolon-injection fragments. | Dziala | Tabs uses `resolveClearableCssColorValue()` for all six style fields and revalidates before inline style assembly. | Naprawione w `TABS-31-05-01` / TASK-365. |

## Znaleziska i remediacja

### TABS-31-05-01 - Unsafe style strings z import/API trafiaja do public inline CSS

**Objaw:** `/audit-31-05-tabs-unsafe-style` renderuje publiczny widget z raw
CSS strings:

```json
[
  "border-color:expression(alert(1));background-color:url(javascript:alert(1))",
  "background-color:url(javascript:alert(2));color:expression(alert(2));border-color:url(javascript:alert(2))",
  "color:url(javascript:alert(3))",
  "border-color:expression(alert(1));background-color:expression(alert(3))"
]
```

To nie jest osiagalne przez normalny color picker, ale jest osiagalne przez
admin API/import, bo fixture zapisala payload i public renderer go przyjal.
Nowoczesne browsery czesc takich wartosci zignoruje, ale kontrakt powinien byc
deterministyczny: nie emitujemy raw attacker-controlled style strings do HTML.

**Dlaczego:**

- `tabsSchema` definiuje wszystkie szesc pol stylu jako plain
  `{ type: "string" }`: `core/widgets/core/tabs.tsx:128-138`.
- `normalizeTabsData()` dla stylu wywoluje `resolveClearableStyleValue()`:
  `core/widgets/core/tabs.tsx:528-546`.
- `resolveClearableStyleValue()` tylko trimuje string i zwraca go bez
  walidacji: `core/widgets/core/clearableStyle.ts:3-7`.
- `TabsBlock` przenosi te wartosci do `backgroundColor`, `borderColor` i
  `color`: `core/widgets/core/tabs.tsx:804-824`.

**Jak naprawic:**

1. Dodac Tabs-owned color normalizer dla szesciu style fields: dopuszczac hex
   (`#rgb`, `#rrggbb`), safe `rgb()/rgba()/hsl()/hsla()` jesli repo ma taki
   kontrakt, oraz tokeny `var(--color-*)`; reszte zwracac jako `undefined`.
2. Uzyc tego normalizera w `normalizeTabsData()` zamiast
   `resolveClearableStyleValue()` dla Tabs color fields.
3. Zaciesnic schema, jesli repo przyjmuje `pattern` dla kolorow, albo zostawic
   schema broad i egzekwowac reject/normalize na domain contract module.
4. Dodac Vitest regression: unsafe style strings nie pojawiaja sie w
   `renderToString(<TabsBlock ... />)` i public invalid/import path nie emituje
   raw `javascript:` / `expression(`.

**Status po remediacji (2026-06-01): Naprawione.**

- `normalizeTabsData()` uses `resolveClearableCssColorValue()` for all six
  Tabs color fields.
- `TabsBlock` revalidates normalized style values before assigning
  `backgroundColor`, `borderColor`, or `color`.
- Unsafe imports containing `javascript:`, `expression(`, `data:`, raw URLs,
  semicolon injection, braces, or HTML-like fragments drop to `undefined`.
- Safe hex, `rgb/rgba`, `hsl/hsla`, `transparent`, `currentColor`, and
  `var(--color-*)` values remain valid.
- Renderer regressions cover both unsafe-string removal and safe-value
  preservation.

### TABS-31-05-02 - Repeatable Structure actions sa funkcjonalne, ale niepelne dla audytu/automatyzacji

**Objaw:** Visual Structure dla Tabs pokazuje repeatable actions:

```text
Add Panel
Panel 1 slot 1 item Move up Move down Remove
Panel 2 slot 1 item Move up Move down Remove
...
```

Funkcjonalnie to jest poprawne dla repeatable panel slots, ale Playwright
inspect pokazal:

```json
{
  "unwrappedControls": [{ "tag": "BUTTON", "text": "Add Panel" }],
  "sampleControls": [
    { "text": "Move up", "path": null, "ownership": "action" },
    { "text": "Move down", "path": null, "ownership": "action" },
    { "text": "Remove", "path": null, "ownership": "action" }
  ]
}
```

To utrudnia raportowanie per option i przyszla automatyzacje edytora, bo nie
da sie stabilnie powiedziec, ktory action mutuje `slots.panel` i ktora instancje
panelu.

**Dlaczego:**

- Shared slot state buduje repeatable items and handlers w
  `core/admin/ui/pages/builder/BlockSettings.tsx:350-420`.
- `VisualPanel` renderuje `slotControls.addActions` jako plain buttons bez
  `data-widget-control`: `core/admin/ui/pages/builder/VisualPanel.tsx:170-181`.
- Slot row ma tylko `data-widget-control={item.id}` i
  `data-widget-control-ownership="action"`, bez path:
  `VisualPanel.tsx:186-191`.
- Move buttons renderuja sie z handlerami/disabled state, ale bez action path:
  `VisualPanel.tsx:199-221`; Remove analogicznie `VisualPanel.tsx:223-232`.

**Jak naprawic:**

1. Rozszerzyc `slotControls.addActions[*]` o stable path, np. `slots.panel`.
2. Owinac `Add Panel` w action metadata: `data-widget-control-path="slots.panel"`
   i action id zawierajacy widget/slot.
3. Dla row actions dodac path `slots.panel` plus action id z instance id
   (`panel:1`, `panel:2`, ...), zeby testy mogly rozroznic move/remove target.
4. Dodac page-builder DOM test dla repeatable-slot widgetu: `Add Panel`,
   Move/Remove maja metadata i nie pojawiaja sie w `unwrappedControls`.

**Status po remediacji (2026-06-01): Naprawione.**

- `Add Panel` remains wrapped by shared `WidgetControlRow` with
  `data-widget-control-path="slots.panel"`.
- Panel rows keep `data-widget-control="tabs.slot.panel:<id>"` and path
  `slots.panel`.
- Move up, Move down, and Remove actions now expose per-action metadata both on
  their `WidgetControlRow` wrapper and on the native button, e.g.
  `tabs.slot.panel:1.move-up` with path `slots.panel`.
- Disabled repeatable boundary buttons remain rendered and disabled for
  repeatable slots.
- VisualPanel regression coverage confirms Add Panel, row, and row-action
  metadata.

## Co dziala

- Public click activation, disabled click no-op and keyboard navigation dzialaja
  zgodnie z tab a11y contract.
- Disabled tabs sa usuwane z activation order; all-disabled payload re-enables
  pierwszy tab zamiast zostawiac martwy widget.
- Legacy `triggerOverflow=scroll` jest canonicalized to `wrap` i Advanced
  uczciwie opisuje migracje.
- Wizard jest setup/read-only, Visual posiada daily controls, Advanced jest
  read-only i bez raw payload/class-token diagnostics.
- Empty-panel admin placeholder nie leakuje do public runtime.
- Invalid enum/minItems/unknown payload jest fail-closed przez public widget
  validator.
- Unsafe imported style strings are dropped before public inline style output.
- Repeatable panel add/row/action controls now expose stable `slots.panel`
  metadata for automation.

## Walidacja

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/tabs.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 4 files / 52 tests.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/tabs.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui-integration/tabs-preview-activation.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 7 files / 92 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `git diff --check` and `git diff --cached --check` - passed.
- `timeout 120s claude -p --dangerously-skip-permissions --max-budget-usd 1 "Review staged diff for TASK-365 Tabs only..."` - passed, no blockers.
