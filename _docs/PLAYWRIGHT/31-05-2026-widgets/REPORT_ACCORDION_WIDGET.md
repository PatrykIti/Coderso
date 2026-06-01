# RAPORT: Accordion Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Accordion Rich`
> **Admin page id:** `3cc7d8fc-0e4f-4df8-b953-c461553600f5`
> **Public routes:** `/audit-31-05-accordion`, `/audit-31-05-accordion-rich`, `/audit-31-05-accordion-custom-id-default`, `/audit-31-05-accordion-locked-open`, `/audit-31-05-accordion-all-collapsed`, `/audit-31-05-accordion-unsafe-style`, `/audit-31-05-accordion-invalid`
> **Playwright sessions:** `codex-31-05-ui-accordion-fixture`, `codex-31-05-ui-accordion-public`, `codex-31-05-ui-accordion-admin`, `codex-31-05-ui-accordion-custom-advanced`, `codex-31-05-ui-accordion-interaction`
> **Claude:** remediation review z lokalnego CLI (2026-06-01) zakonczony wynikiem `No blockers`.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem `accordion`.
Przed testem przeczytano `_docs/_WIDGETS/ACCORDION.md`, taski `TASK-343-04`,
`TASK-257`, `TASK-252-05-09`, `TASK-336-08` i `TASK-256-05-04`,
implementacje `core/widgets/core/accordion.tsx`, edytor
`core/admin/ui/widgets/editors/AccordionEditors.tsx`, shared Structure UI w
`core/admin/ui/pages/builder/BlockSettings.tsx` i
`core/admin/ui/pages/builder/VisualPanel.tsx` oraz testy
`tests/vitest/widgets/accordionWidget.test.tsx` i
`tests/vitest/ui/accordion-editor-wave.test.tsx`.

Przez admin API utworzono i opublikowano fixture pages:

- `/audit-31-05-accordion-rich` - 4 panele, `bordered`, multiple open,
  default open `1` + `3`, custom safe colors, smooth motion, max width `sm`,
  nested spacer content,
- `/audit-31-05-accordion-custom-id-default` - item ids `alpha`/`beta` and
  `defaultOpenIds=["beta"]`, zeby sprawdzic id/default-open parity,
- `/audit-31-05-accordion-locked-open` - `collapsible=false` and empty saved
  default list, zeby sprawdzic "at least one stays open",
- `/audit-31-05-accordion-all-collapsed` - intentional all-collapsed start,
- `/audit-31-05-accordion-unsafe-style` - unsafe style strings in color fields,
- `/audit-31-05-accordion-invalid` - invalid import/API payload.

Admin UI pass objal `Run setup again`, Wizard slot-owned panel count and
initial open picker, Visual variant cards, item title/summary/icon controls,
open mode, collapsible switch, read-only default-open summary, motion, width,
spacing, radius, typography, colors, shared Structure, block layout/visibility
and Advanced diagnostics. Interaction smoke potwierdzil public multiple-open
behavior, `collapsible=false` guard, admin variant click and open-mode switch.

Public runtime sprawdzono realnym DOM-em: `<details>/<summary>` state,
`aria-expanded`, `aria-controls`, region ids, details group names, default open
rules, placeholder gating, invalid payload, unsafe style strings and body
overflow.

## Pokrycie UI

Przetestowane:

- Wizard: setup-only panel count summary and initial open item,
- Visual: variant, item content, open/collapsible behavior, layout, motion,
  typography, colors, shared Structure and block layout/visibility,
- Advanced: read-only behavior, saved item, display and contract summaries,
- public runtime: default, rich multiple, custom id default, locked-open,
  all-collapsed, unsafe style and invalid payload.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-accordion` | Visual root istnieje; default 2 items. | HTTP 200, `data-coderso-accordion="1"`, role `group`, label `Accordion`, first item open, no public placeholder. | Dziala | Defaults and native `<details>` render path sa stable. | Brak. |
| Wizard panel count | `Run setup again` | Wizard pokazuje `4 slot-owned panels`; count jest readonly, `writablePaths=["options.defaultOpenIds"]`. | Nie dotyczy bez zapisu. | Dziala | TASK-343 truthfulness fix: Structure owns count, Wizard owns only starter open item. | Brak. |
| Wizard initial open | Rich fixture Wizard | Picker pokazuje `Overview`; item summaries sa readonly. | Public rich otwiera items `1` i `3` because saved multiple mode. | Dziala dla numeric ids | Wizard mutuje `options.defaultOpenIds`, a runtime porownuje numeric slot instance ids. | Patrz custom id drift. |
| Visual variant cards | Klik `Compact` | Selected card przechodzi z `Bordered` na `Compact`. | Nie dotyczy bez zapisu. | Dziala | Variant buttons sa wrapped path `variant`. | Brak. |
| Item content | Inspect Visual rich | 4 items, kazdy ma title, summary text and icon controls. | Public summaries/panels renderuja titles, icons, descriptions and slot spacer content. | Dziala | `resolveAccordionItems()` maps slot order to normalized item data. | Brak. |
| Open mode multiple | Public rich and admin interaction | Visual shows `Multiple open items`; default summary `Overview, Terms`. | Initial open items `1` and `3`; clicking item `2` opens it without closing `1`/`3`; clicking `1` closes only `1`. | Dziala | Multiple mode omits `details name`, native details stay independent. | Brak. |
| Open mode single | Admin switch to `Single open item` | Control changes to `Single open item`; default summary narrows to `Overview`. | Baseline default uses shared details `name` so one item stays open. | Dziala for numeric ids | Normalizer narrows multiple defaults to first id in single mode. | Brak. |
| Allow all sections to close | Locked fixture and all-collapsed fixture | Visual has switch path `options.collapsible`; Advanced says all-closed behavior. | `collapsible=false` reopens first item after close attempt; `collapsible=true` with `defaultOpenIds=[]` starts all closed. | Dziala | Runtime `ensureOpenItem()` guards non-collapsible roots; normalizer preserves all-collapsed only when collapsible. | Brak. |
| Motion / width / spacing / radius / title style | Rich fixture | Smooth, Medium width, Spacious padding, Extra large radius, Large/Bold title visible. | Public root `max-w-2xl`, details `rounded-2xl`, summary `px-5 py-4 text-lg font-bold`, motion classes. | Dziala | Bounded token maps. | Brak. |
| Colors and clears | Rich fixture | 4 color controls, 4 Clear buttons, no raw token inputs. | Safe hex colors render in details/summary/panel text. | Dziala dla UI-safe values | Visual picker constrains normal authoring. | Brak for UI; patrz unsafe import gap. |
| Empty public panels | `/audit-31-05-accordion-all-collapsed` | Admin preview can show slot guidance. | Public body does not contain `Add widgets to this accordion item.` and no overflow. | Dziala | Placeholder uses `renderEditorPlaceholder()` and render context gating. | Brak. |
| Advanced diagnostics | Custom-id Advanced | `writablePaths=[]`, `rawControlCount=0`, no unwrapped controls; custom default ids and legacy positional ids resolve to the intended item. | Public custom-id route starts with Beta open while DOM markers remain `item:1` / `item:2`. | Dziala | Resolved items carry `selectionId`; default-open normalization maps custom and legacy ids to the same item. | Naprawione w `ACC-31-05-01` / TASK-366. |
| Shared Structure | Visual Structure on rich fixture | `Add Item`, Move up/down, Remove visible with `slots.item` metadata and item-scoped action ids. | Public item order/rendering stable through `item:1..4`. | Dziala | Shared Structure metadata now wraps add/row/action controls and mirrors metadata onto action buttons. | Naprawione w `ACC-31-05-03` / TASK-366. |
| Invalid payload | `/audit-31-05-accordion-invalid` | Nieosiagalne przez normalny UI; API/import edge. | HTTP 200, rootCount `0`, `Invalid widget data`, no raw invalid strings. | Dziala fail-closed; route gap shared | Widget schema rejects minItems/enums/unknown fields, but admin API allowed save/publish. | Wspolna walidacja save/publish/import widget blocks. |
| Unsafe style strings | `/audit-31-05-accordion-unsafe-style` | Nieosiagalne przez normalny UI color picker; API/import edge. | Unsafe strings normalize away or to theme defaults; public SSR no longer emits raw `javascript:`, `expression(`, `data:`, `url(...)`, or injection fragments. | Dziala | Accordion color resolver uses the shared bounded color helper plus safe legacy-token handling before inline style output. | Naprawione w `ACC-31-05-02` / TASK-366. |

## Znaleziska i remediacja

### ACC-31-05-01 - Custom item ids gubia `defaultOpenIds` w public runtime

**Objaw:** fixture `/audit-31-05-accordion-custom-id-default` zapisuje:

```json
{
  "items": [
    { "id": "alpha", "title": "Alpha" },
    { "id": "beta", "title": "Beta" }
  ],
  "options": {
    "openMode": "single",
    "defaultOpenIds": ["beta"],
    "initiallyOpenId": "beta",
    "collapsible": true
  }
}
```

Advanced pokazuje autorowi `Starts with Beta`, ale public DOM startuje z oboma
panelami zamknietymi:

```json
[
  { "item": "1", "open": false, "ariaExpanded": "false", "text": "Alpha" },
  { "item": "2", "open": false, "ariaExpanded": "false", "text": "Beta" }
]
```

To jest szczegolnie mylace, bo Advanced i Visual czytaja normalized item IDs,
a public renderer porownuje default-open do repeatable slot instance ids.

**Dlaczego:**

- `normalizeAccordionData()` waliduje `defaultOpenIds` przeciwko item ids:
  `core/widgets/core/accordion.tsx:480-499`.
- `resolveAccordionItems()` zachowuje slot `instanceId` (`1`, `2`) i tylko
  uzywa custom item jako source danych po kolejnosci: `accordion.tsx:562-586`.
- `AccordionBlock` filtruje default open ids przeciwko `item.instanceId`:
  `accordion.tsx:690-693`.
- `shouldOpen` takze porownuje tylko `item.instanceId`: `accordion.tsx:735-741`.

**Jak naprawic:**

1. Dodac do resolved item osobny `selectionId` / `itemId`, np. `source?.id ??
   instanceId`, analogicznie do Tabs.
2. Filtrowac/open match przez oba identyfikatory dla kompatybilnosci:
   `defaultOpenIds` powinno pasowac do saved item id oraz legacy slot instance
   id.
3. Zostawic DOM ids i slot markers oparte o `instanceId`, zeby nie popsuc
   stable slot/content ids.
4. Dodac regression w `tests/vitest/widgets/accordionWidget.test.tsx`: slots
   `item:1`/`item:2`, item ids `alpha`/`beta`, default `beta` => drugi details
   startuje open i summary `aria-expanded=true`.

**Status po remediacji (2026-06-01): Naprawione.**

- Resolved Accordion items carry both slot `instanceId` and normalized
  `selectionId`; public runtime matches default-open state against both.
- `normalizeAccordionData()` maps legacy positional ids such as `"2"` to the
  corresponding custom item id before default-open resolution.
- DOM ids, `data-coderso-accordion-item`, slot ids, and region ids stay based
  on stable slot instance ids.
- Renderer regressions cover custom `defaultOpenIds=["beta"]` and legacy
  `defaultOpenIds=["2"]` with `alpha` / `beta` item ids.

### ACC-31-05-02 - Unsafe style strings z import/API trafiaja do public inline CSS

**Objaw:** `/audit-31-05-accordion-unsafe-style` renderuje raw CSS strings:

```json
[
  "border-color:expression(alert(1));background-color:url(javascript:alert(1))",
  "color:url(javascript:alert(2));border-color:expression(alert(1))",
  "border-color:expression(alert(1))",
  "color:expression(alert(2))"
]
```

Normalny Visual color picker tego nie wprowadza, ale admin API/import moze
zapisac takie dane i public renderer je emituje.

**Dlaczego:**

- Accordion schema dopuszcza `surfaceColor`, `borderColor`,
  `summaryTextColor`, `descriptionTextColor` jako plain string:
  `core/widgets/core/accordion.tsx:111-118`.
- `normalizeAccordionColor()` tylko trimuje string i fallback:
  `accordion.tsx:318-319`.
- `normalizeAccordionData()` przekazuje te wartosci do style bez walidacji:
  `accordion.tsx:518-530`.
- Renderer emituje je w `containerStyle`, `summaryStyle`, `descriptionStyle`
  and panel border style: `accordion.tsx:708-720` and `accordion.tsx:790-798`.

**Jak naprawic:**

1. Dodac Accordion-owned safe color normalizer dla czterech color fields:
   dopuscic repo-approved hex/token/color-function subset, odrzucic reszte.
2. Uzyc go w `normalizeAccordionData()` zamiast `normalizeAccordionColor()` /
   raw `resolveClearableStyleValue()` dla Accordion color fields.
3. Dodac renderer regression: unsafe strings nie pojawiaja sie w SSR HTML.
4. Docelowo dodac shared safe-color helper, bo ten sam import/API class
   pojawia sie w kilku widgetach clearable-style.

**Status po remediacji (2026-06-01): Naprawione.**

- Accordion color resolution uses the shared bounded CSS color helper plus an
  Accordion-local allowlist for safe legacy hyphenated color tokens.
- Unsafe fragments (`url(`, `expression(`, `javascript:`, `data:`, semicolon
  injection, braces, and HTML-like delimiters) are dropped or resolved back to
  theme defaults before public inline style output.
- Runtime style assembly revalidates surface, border, summary text, and
  description text colors.
- SSR regressions cover unsafe-string removal and safe color / legacy-token
  preservation.

### ACC-31-05-03 - Repeatable Structure actions sa funkcjonalne, ale niepelne dla audytu/automatyzacji

**Objaw:** Visual Structure pokazuje:

```text
Add Item
Item 1 slot 1 item Move up Move down Remove
...
```

Inspect pokazal:

```json
{
  "unwrappedControls": [{ "tag": "BUTTON", "text": "Add Item" }],
  "sampleControls": [
    { "text": "Move up", "path": null, "ownership": "action" },
    { "text": "Move down", "path": null, "ownership": "action" },
    { "text": "Remove", "path": null, "ownership": "action" }
  ]
}
```

To nie blokuje autora dzisiaj, ale lamie stabilne raportowanie per option i
utrudnia automatyzacje shared Structure.

**Dlaczego:**

- Slot actions/handlers sa budowane w
  `core/admin/ui/pages/builder/BlockSettings.tsx:350-420`.
- Add actions renderuja sie jako plain `Button` bez metadata:
  `core/admin/ui/pages/builder/VisualPanel.tsx:168-181`.
- Slot row ma action ownership, ale nie ma path:
  `VisualPanel.tsx:186-191`.
- Move/Remove buttons nie maja `data-widget-control-path`:
  `VisualPanel.tsx:199-232`.

**Jak naprawic:**

1. Dodac path do `slotControls.addActions`, np. `slots.item`.
2. Owinac `Add Item` w shared action metadata.
3. Dla Move/Remove dodac action id z instance id (`item:1`, `item:2`) and path
   `slots.item`.
4. Dodac page-builder DOM test dla repeatable-slot widgetu.

**Status po remediacji (2026-06-01): Naprawione.**

- The shared Structure metadata fix from TASK-365 now covers Accordion
  repeatable slots through `slots.item`.
- `Add Item`, item rows, and item Move up / Move down / Remove actions expose
  stable action metadata with item-scoped ids such as
  `accordion.slot.item:1.move-up`.
- Accordion-specific VisualPanel regression coverage confirms the shared
  metadata contract.

## Co dziala

- Public multiple mode, single mode, all-collapsed and non-collapsible guard
  dzialaja dla canonical numeric slot/item ids.
- Native details/summary + runtime script synchronizuja `aria-expanded` po
  click/toggle.
- Wizard count truthfulness po TASK-343 jest poprawiona: count jest readonly i
  opisany jako Structure-owned.
- Visual owns variant, content, behavior/layout/style; Advanced jest read-only.
- Empty-slot placeholder nie leakuje do public runtime.
- Invalid enum/minItems/unknown payload jest fail-closed przez public widget
  validator.
- Custom item ids and legacy positional default ids now open the intended
  public item.
- Unsafe imported color strings no longer reach public inline styles.
- Repeatable item Structure actions expose stable `slots.item` metadata.

## Walidacja

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 4 files / 55 tests.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 6 files / 91 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `git diff --check` and `git diff --cached --check` - passed.
- `timeout 120s claude -p --dangerously-skip-permissions --max-budget-usd 1 "Review staged diff for TASK-366 Accordion only..."` - passed, no blockers.
