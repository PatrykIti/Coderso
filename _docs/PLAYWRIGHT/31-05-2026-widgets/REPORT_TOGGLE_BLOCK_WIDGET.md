# RAPORT: Toggle Block Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Toggle Block Rich`
> **Admin page id:** `2ff7ca6a-9032-4664-8666-b94cbfac13f2`
> **Public routes:** `/audit-31-05-toggle-block`, `/audit-31-05-toggle-block-rich`, `/audit-31-05-toggle-block-empty`, `/audit-31-05-toggle-block-unsafe-style`, `/audit-31-05-toggle-block-invalid`
> **Playwright sessions:** `codex-31-05-ui-toggle-fixture`, `codex-31-05-ui-toggle-public`, `codex-31-05-ui-toggle-interaction`, `codex-31-05-ui-toggle-admin`
> **Claude:** lokalny CLI nadal blokuje wspolprace: `401 Invalid authentication credentials`. Raport opiera sie na Playwright + audycie kodu Codex.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem
`toggle-block`. Przed testem przeczytano `_docs/_WIDGETS/TOGGLE_BLOCK.md`,
taski `TASK-292`, `TASK-256-05-04` i `TASK-252-05-10`, implementacje
`core/widgets/core/toggleBlock.tsx`, edytor
`core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`, historyczny raport
`_docs/PLAYWRIGHT/28-05-2026/REPORT_TOGGLE_BLOCK_WIDGET.md` oraz testy
`tests/vitest/widgets/toggleBlock.test.tsx` i
`tests/vitest/ui/toggle-block-editor-wave.test.tsx`.

Przez admin API utworzono i opublikowano fixture pages:

- `/audit-31-05-toggle-block` - default `switch` payload,
- `/audit-31-05-toggle-block-rich` - dwie instancje: `cards` z default
  `secondary`, motion `slide`, safe colors and nested slot content oraz
  `switch` z default `primary`, motion `fade` and nested slot content,
- `/audit-31-05-toggle-block-empty` - empty fixed panes, zeby sprawdzic public
  placeholder gating,
- `/audit-31-05-toggle-block-unsafe-style` - unsafe style strings in color
  fields, API/import edge,
- `/audit-31-05-toggle-block-invalid` - invalid enum payload.

Admin UI pass objal `Run setup again`, Wizard read-only setup summary, Visual
variant cards, labels, helper clear, default state, motion, accessibility copy,
Theme color controls, Pane cards, Pane authoring, shared Structure, block
layout/visibility and Advanced diagnostics. Public runtime sprawdzono realnym
DOM-em: two-state state, `role=radio`, roving `tabindex`, `aria-controls`,
regions, live status, runtime script dedupe, placeholder gating, invalid
payload, unsafe style strings, independent instances and mobile overflow.

Uwaga srodowiskowa: pierwszy admin pass po starcie dev servera trafil w Vite
`504 Outdated Optimize Dep` dla React deps. Cache Vite zostal odswiezony i
admin probe powtorzony. To nie zostalo sklasyfikowane jako defekt widgetu.

## Pokrycie UI

Przetestowane:

- Wizard: read-only one-time setup summary and return to Visual,
- Visual: variant, labels/helper, experience, accessibility, Theme, pane cards,
  pane authoring, Structure and block layout/visibility,
- Advanced: runtime, style and support summaries, plus read-only shared layout
  and visibility summaries,
- public runtime: default, rich two-instance, empty, unsafe-style, invalid and
  375px mobile view.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-toggle-block` | Default data normalizuje sie do `View A` / `View B`, helper visible. | HTTP 200, rootCount `1`, `variant=switch`, `state=primary`, one runtime script, no public placeholder. | Dziala | `toggleBlockDefaults` and `normalizeToggleBlockData()` keep safe defaults. | Brak. |
| Cards variant | Rich fixture, first block | Visual Variant pokazuje `Cards` selected; Advanced `Variant=Cards`. | Public first root `variant=cards`, rounded-2xl/p-5/shadow, trigger grid one column on mobile. | Dziala | Bounded variant map in renderer and editor. | Brak. |
| Switch variant | Rich fixture, second block | Visual can own variant path `variant`; second fixture uses switch. | Public second root `variant=switch`, compact segmented trigger. | Dziala | `resolveVariant()` falls back to `switch`. | Brak. |
| Labels | Visual rich | Primary `Monthly`, Secondary `Annual`; writable paths `labels.primary`, `labels.secondary`. | Trigger/status labels render: `Annual active`, `Summary selected`. | Dziala | Labels are normalized and stored as fixed two-state labels. | Brak. |
| Helper copy and clear | Visual rich | Helper has Clear; first block shows `Choose billing rhythm.`, second block helper hidden. | First public root has helper text, second/empty routes have no helper `<p>`. | Dziala | Explicit empty helper normalizes to hidden string. | Brak. |
| Default state | Rich fixture | Visual `Default state=Secondary pane`; Advanced `Opening pane Annual (secondary)`. | First root starts secondary visible, second starts primary visible. | Dziala | `options.defaultState` bounded to primary/secondary. | Brak. |
| Motion none/fade/slide | Default, rich cards, rich switch | Visual exposes `None`, `Fade`, `Slide`; rich shows `Slide`. | Default has no motion classes; switch emits fade classes; cards emits slide classes. | Dziala | `motionClassMap` is bounded and reduced-motion aware. | Brak. |
| Accessibility label and status | Visual rich | Accessibility owns `labels.ariaLabel`, `labels.selectedSuffix`; Advanced shows `Billing period switch - suffix: active`. | Public radiogroup label is `Billing period switch`; live status updates `Monthly active` / `Annual active`. | Dziala | Runtime script updates status from active trigger label + suffix. | Brak. |
| Theme safe colors | Visual rich | Four swatch-only controls, four Clear buttons, no raw value input; Advanced mirrors saved hex values. | Public emits safe hex border/background and CSS vars; active trigger uses contrast var, inactive text can use accent. | Dziala for UI-safe values | Visual uses `SharedColorControl` with `showValueInput={false}`. | Brak for normal UI; patrz import/API gap. |
| Pane cards tokens | Visual rich | Primary `Soft/Compact/Small/Strong`, Secondary `Contrast/Spacious/Large/Strong`; Advanced mirrors both. | Public pane classes match `p-3 rounded-md bg-[var(--color-bg)]` and `p-6 rounded-xl bg-[var(--color-surface)]`, border width `2px`. | Dziala | Pane tokens are enum-normalized and class-mapped. | Brak. |
| Public click switch | Rich public | Nie dotyczy admin static preview. | Click first root Primary: state `primary`, primary `aria-checked=true`, primary pane visible, second root unchanged. | Dziala | Runtime binds per root and syncs trigger/pane/status together. | Brak. |
| Public keyboard | Rich public | Visual copy says editor preview static; public pages mount keyboard switching. | ArrowRight => secondary, ArrowLeft => primary, End => secondary, Home => primary; focus moves to active trigger. | Dziala | Runtime delegated `keydown` handles Arrow/Home/End and roving tab index. | Brak. |
| Multiple instances / script dedupe | Rich public | Admin canvas renders two blocks on same page. | Two independent roots, one shared runtime script, changing root #2 does not mutate root #1. | Dziala | Shared runtime script registry dedupes by id and root stores bound dataset flag. | Brak. |
| Empty public panes | `/audit-31-05-toggle-block-empty` | Admin preview can show authoring guidance. | Public body does not contain `Use the page builder to add widgets`; panes are empty and hidden/visible state remains correct. | Dziala | Empty placeholder is gated through render context. | Brak. |
| Mobile 375px | Resize to `375x812` on rich public | Nie dotyczy admin. | `clientWidth=375`, `scrollWidth=375`, overflow `false`; cards trigger grid one track `333px`. | Dziala | Responsive grid collapses cards variant to one column. | Brak. |
| Wizard | `Run setup again` | Wizard root exists, `writablePaths=[]`, `readonlyPaths=["variant"]`, no raw controls; `Finish setup and open Visual` works. | Nie dotyczy bez zapisu. | Dziala | Wizard is now read-only setup summary. | Brak. |
| Visual ownership | Rich admin inspect | Sections: Variant, Labels, Experience, Accessibility, Theme, Pane cards, Pane authoring, Structure, Block layout, Visibility; duplicate writable paths `[]`, unwrapped controls `[]`. | Public output matches saved Visual-owned data. | Dziala | `toggleBlockEditorContract` and editor sections align. | Brak. |
| Advanced diagnostics | Rich admin after returning from Wizard | Advanced root exists, `writablePaths=[]`, `rawControlCount=0`, unwrapped controls `[]`; summaries mirror saved variant, default, motion, labels and style. | Nie dotyczy bez zapisu. | Dziala | Advanced uses readonly summary rows and shared readonly layout/visibility summaries. | Brak. |
| Shared Structure | Visual rich | Fixed `Primary Pane slot` and `Secondary Pane slot`, each `1 item`; no add action; Move up/down disabled. | Public slot content renders as spacer child in both panes. | Dziala | Toggle Block intentionally owns exactly two fixed slots. Disabled fixed-slot move actions are not product actions. | Brak. |
| Invalid payload | `/audit-31-05-toggle-block-invalid` | Nieosiagalne przez normalny UI; API/import edge. | HTTP 200, rootCount `0`, `Invalid widget data`, no raw invalid strings. | Dziala fail-closed; route gap shared | Widget schema rejects invalid enums, but admin API allowed save/publish fixture. | Wspolna walidacja save/publish/import widget blocks. |
| Unsafe style strings | `/audit-31-05-toggle-block-unsafe-style` | Nieosiagalne przez normalny UI color picker; API/import edge. | HTTP 200 and widget renders raw `url(javascript:...)` / `expression(...)` in inline style and CSS custom properties. | Nie dziala security/value validation | Style schema accepts any string, shared normalizer only trims, renderer emits inline style. | Patrz `TGL-31-05-01`. |

## Znaleziska do poprawy

### TGL-31-05-01 - Unsafe style strings z import/API trafiaja do public inline CSS

**Objaw:** `/audit-31-05-toggle-block-unsafe-style` renderuje raw CSS strings:

```json
[
  "border-color:expression(alert(2));background-color:url(javascript:alert(1));--nextless-toggle-accent:url(javascript:alert(3));--nextless-toggle-accent-contrast:expression(alert(4))",
  "border-color:expression(alert(2));color:url(javascript:alert(3))",
  "border-color:expression(alert(2));border-width:1px"
]
```

Normalny Visual UI tego nie wprowadza, bo Theme uzywa swatch-only
`SharedColorControl`, ale admin API/import moze zapisac taki payload i public
renderer emituje go w inline CSS.

**Dlaczego:**

- `toggleBlockSchema` dopuszcza `surfaceColor`, `borderColor`, `accentColor`
  and `accentContrastColor` jako plain string:
  `core/widgets/core/toggleBlock.tsx:119-122`.
- `resolveClearableStyleValue()` tylko trimuje string:
  `core/widgets/core/clearableStyle.ts:3-7`.
- `normalizeToggleBlockStyle()` przekazuje te wartosci dalej:
  `core/widgets/core/toggleBlock.tsx:382-393`.
- Renderer emituje je jako `backgroundColor`, `borderColor`, inactive trigger
  `color` and CSS custom properties:
  `core/widgets/core/toggleBlock.tsx:671-699` and
  `core/widgets/core/toggleBlock.tsx:715-729`.
- Visual ogranicza normalna authoring path przez `showValueInput={false}`:
  `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx:496-543`.

**Jak naprawic:**

1. Dodac Toggle Block-owned safe color normalizer albo shared safe-color helper
   dla clearable color fields.
2. Dopuszczac tylko approved subset, np. hex, `rgb/rgba`, `hsl/hsla` and
   repo-approved theme tokens; odrzucac `url(`, `expression(`, control chars
   and unknown CSS functions.
3. Uzyc helpera w `normalizeToggleBlockStyle()` przed rendererem.
4. Zmienic `toggleBlockSchema` z plain `string` na pattern/format owned by the
   same helper, zachowujac compatibility przez normalizer.
5. Dodac regression w `tests/vitest/widgets/toggleBlock.test.tsx`: unsafe
   imported strings nie pojawiaja sie w SSR HTML, a UI-safe hex nadal renderuje.

## Co dziala

- Two-state runtime jest interaktywny: click, ArrowLeft/Right/Up/Down, Home,
  End, roving tab index, `aria-checked`, `hidden` panes and live status sync.
- Multiple instances on one page are independent and share one runtime script.
- Default/switch/cards/motion/labels/helper/accessibility/pane-token options
  renderuja sie zgodnie z Visual and Advanced.
- Wizard is read-only setup summary; Advanced is read-only diagnostics.
- Fixed two-pane Structure is truthful: no Add pane, disabled move controls,
  slot content renders on public.
- Empty-slot placeholder does not leak to public runtime.
- Invalid enum payload fails closed in public renderer.

## Walidacja

- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx`
  - PASS: 4 files, 50 tests.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `git diff --check -- _docs/PLAYWRIGHT/31-05-2026-widgets/README.md` -
  PASS.
- `perl -ne 'print "$ARGV:$.: trailing whitespace\n" if /[ \t]$/; print "$ARGV:$.: space before tab\n" if / \t/;' ...`
  on Toggle Block report and Playwright scripts - PASS.
- `LC_ALL=C rg -n "[^\x00-\x7F]" ...` on Toggle Block report and Playwright
  scripts - PASS (no non-ASCII after replacing the copied admin separator).
