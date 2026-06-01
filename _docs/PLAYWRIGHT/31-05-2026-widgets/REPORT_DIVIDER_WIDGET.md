# RAPORT: Divider Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz
> public runtime.
> **Strona admin:** `Audit 31-05 Divider`
> **Admin page id:** `2fbce7fe-72e8-4206-b3af-e39ab7b8f6d4`
> **Public routes:** `/audit-31-05-divider`,
> `/audit-31-05-divider-line`, `/audit-31-05-divider-dotted-custom`,
> `/audit-31-05-divider-spacer-only`, `/audit-31-05-divider-unsafe`,
> `/audit-31-05-divider-invalid`
> **Playwright sessions:** `codex-31-05-ui-divider-fixture`,
> `codex-31-05-ui-divider-public`, `codex-31-05-ui-divider-breakpoints`,
> `codex-31-05-ui-divider-admin`
> **Claude:** cross-check uruchomiony po naprawie lokalnego logowania. Claude
> potwierdzil glowny finding Playwright i doprecyzowal wage jako CSS-injection /
> contract violation, bez potwierdzonego XSS w nowoczesnej przegladarce.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem `divider`.
Przed testem przeczytano `_docs/_WIDGETS/DIVIDER.md`, taski `TASK-264`,
`TASK-256-05-03` i `TASK-252-05-07`, implementacje
`core/widgets/core/divider.tsx`, edytor
`core/admin/ui/widgets/editors/DividerEditors.tsx`, historyczny raport
`_docs/PLAYWRIGHT/28-05-2026/REPORT_DIVIDER_WIDGET.md` oraz testy
`tests/vitest/widgets/divider.test.tsx` i
`tests/vitest/ui/divider-editor-wave.test.tsx`.

Przez admin API utworzono i opublikowano fixture pages:

- `/audit-31-05-divider` - rich `label-center`, label, container-lg, dashed,
  wide dash, soft opacity, Hero/Standard spacing,
- `/audit-31-05-divider-line` - plain semantic line, full width, token color,
- `/audit-31-05-divider-dotted-custom` - custom 75% width, right aligned,
  dotted, faint opacity, no top space,
- `/audit-31-05-divider-spacer-only` - `label-center` payload with saved label
  but `visibility=spacer-only`,
- `/audit-31-05-divider-unsafe` - API/import edge with unsafe `color`,
  `labelColor`, `customWidth` and spacing strings,
- `/audit-31-05-divider-invalid` - invalid variant.

Admin UI pass objal `Run setup again`, Wizard read-only setup summary, Visual
variant/label/line/width/spacing controls, block layout/visibility and Advanced
diagnostics. Public runtime sprawdzono realnym DOM-em: `data-divider-*`
markers, role/ARIA semantics, label output, line style CSS, width/alignment,
spacing, spacer-only gating, invalid variant, unsafe style handling and
breakpoint overflow at 375/800/1280 px.

## Pokrycie UI

Przetestowane:

- Wizard: read-only divider style summary and live preview,
- Visual: variant cards, label text/clear, label color/typography/gap, line
  thickness, width modes, alignment, line color/style/opacity/dash pattern,
  visibility and top/bottom spacing,
- Advanced: read-only runtime and support summaries,
- public runtime: label-center, line, dotted custom, spacer-only, unsafe import,
  invalid variant and mobile/tablet/desktop widths,
- Claude cross-check: niezalezny read-only review kodu i wynikow Playwright.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial rich render | Otwarta `/audit-31-05-divider` | Visual root istnieje; preview `label-center`, `Audit divider`, dashed, container-lg. | HTTP 200, rootCount `1`, `data-divider-variant=label-center`, `thickness=5`, `color-kind=hex`, `width-kind=container-lg`, `line-style=dashed`, `visibility=line`, `has-label=true`. | Dziala | Normalizer and renderer keep saved rich data. | Brak. |
| Variant: Line | `/audit-31-05-divider-line` | Visual variant card exists; line variant available. | `role=separator`, `aria-orientation=horizontal`, no label, solid 2px token-colored line. | Dziala | Unlabelled visible divider renders semantic separator. | Brak. |
| Variant: Label center | Rich fixture | Label controls visible only for `label-center`; preview shows label. | Label text renders as React text, no role separator on labeled flex wrapper, two decorative `span[aria-hidden=true]` line segments. | Dziala z niuansem | This matches current v2 behavior and previous report nuance. | No fix required unless product wants labeled separators announced semantically. |
| Variant: Dashed baseline | Rich fixture and line-style select | Dashed option available; `Line style` owns final style. | `variant=label-center`, `line-style=dashed`, repeating-linear-gradient dash 14/8 for `wide`. | Dziala | Variant seeds default; persisted `lineStyle` owns runtime. | Brak. |
| Center label text | Rich fixture | Input and Clear are wrapped under `path=label`; text shown in preview. | Label text `Audit divider`, class `text-base font-semibold uppercase tracking-wider`, `white-space: nowrap`. | Dziala | Renderer trims and renders label as text content. | Brak. |
| Label clear | Admin inspect | Clear button exists for label, path `label`; no duplicate writable path. | Nie dotyczy bez zapisu w tym probe. | Dziala | `ClearableInputField` writes default empty label. | Brak. |
| Label color | Rich fixture | Swatch input under `path=labelColor`; helper says `Selected color`. | Hex label color computes to `rgb(30, 136, 229)`, opacity `0.75`. | Dziala dla UI hex/token | Visual uses `SharedColorControl` without raw value input. | Brak dla UI; API/import edge opisany w findingu. |
| Label size / weight / transform / tracking / gap | Rich fixture | Large, Semi-bold, Uppercase, Wide, Comfortable label gap. | Classes `text-base`, `font-semibold`, `uppercase`, `tracking-wider`, wrapper `gap-4`. | Dziala | Bounded enum tokens map to class maps. | Brak. |
| Thickness | Rich and dotted fixtures | Visual exposes 1-8 thickness labels; selected `Bold` for 5px and 8px max in dotted fixture. | Public attrs `thickness=5` and `8`; computed line heights `5px` and `8px`. | Dziala | `clampThickness()` clamps to 1-8. | Brak. |
| Width mode: full | `/audit-31-05-divider-line` | Full width option available; alignment controls hidden in full mode. | `width-mode=full`, `width-kind=full`, wrapper width fills content area. | Dziala | Full mode omits inline width. | Brak. |
| Width mode: container | Rich fixture | Container width and alignment controls visible; selected Wide content width, Center. | `width-kind=container-lg`, style `width:min(100%, 64rem)`, 1024px at 1280. | Dziala | `dividerContainerWidthCssValueMap.lg` resolves to `min(100%, 64rem)`. | Brak. |
| Width mode: custom | Dotted fixture | Custom width preset path exists in Visual. | `width-mode=custom`, `width-kind=custom`, style `width:75%`, right aligned with `ml-auto`. | Dziala | `resolveCustomWidth()` accepts bounded CSS lengths and percentages. | Brak. |
| Horizontal alignment | Dotted custom fixture | Alignment select visible when width is non-full. | Right alignment uses `ml-auto`; at 1280 wrapper width 768px with left auto margin. | Dziala | `dividerAlignmentClassMap.right` maps to `ml-auto`. | Brak. |
| Line color | Rich and dotted fixtures | Swatch input under `path=color`; helper says `Selected color`. | Hex colors paint dashed/dotted gradients: `#00897b` and `#d81b60`. | Dziala dla UI hex/token | Visual authoring is swatch-first and no raw input is shown. | Brak dla UI; API/import edge opisany w findingu. |
| Line style: solid | Line fixture | Solid option available. | `line-style=solid`, `background-color: var(--color-border)`, no background image. | Dziala | Solid branch uses `backgroundColor`. | Brak. |
| Line style: dashed | Rich fixture | Dash pattern visible only when line is visible and dashed. | `repeating-linear-gradient(90deg, #00897b 0 14px, transparent 14px 22px)`. | Dziala | Dash pattern token `wide` maps to 14/8. | Brak. |
| Line style: dotted | Dotted fixture | Dotted option available; dash pattern hidden by condition. | `radial-gradient(circle, #d81b60 58%, transparent 60%)`, background size `16px 8px`. | Dziala | Dotted branch derives dot spacing from thickness. | Brak. |
| Opacity / Line emphasis | Rich and dotted fixtures | Selected `Soft` and `Faint`. | Line opacity `0.75` / `0.25`; label opacity also `0.75` for label-center. | Dziala z niuansem | One opacity token is applied to both line and label in current model. | Split line/text opacity only if product requires it. |
| Visibility: visible line | Rich fixture | Visibility select shows `Visible line`; dash pattern visible. | One wrapper child, label and line segments visible, `has-label=true`. | Dziala | `hasLabel` requires visible line and non-empty label. | Brak. |
| Visibility: spacer-only | `/audit-31-05-divider-spacer-only` | Fixture stores saved label but spacer-only visibility. | `visibility=spacer-only`, `has-label=false`, `childElementCount=0`, no label text, margins preserved. | Dziala | Renderer returns no visible child when spacer-only. | Brak. |
| Top / bottom spacing | Rich, dotted and spacer-only fixtures | Top/bottom comboboxes wrapped under `marginTop` / `marginBottom`. | Hero/Standard => `96px/48px`; none/Large section => `0px/80px`; Section/Card => `64px/32px`. | Dziala | Token map resolves spacing values; `none` kind is marked separately. | Brak. |
| Breakpoints and overflow | 375/800/1280 on rich and dotted fixtures | Nie dotyczy admin. | No horizontal overflow. Rich wrapper: 375/800/1024px; custom 75% wrapper: 281.25/600/768px. | Dziala | `min(100%, 64rem)` and percent custom width stay bounded. | Brak. |
| Unsafe custom width and spacing | `/audit-31-05-divider-unsafe` | Nieosiagalne przez normalny UI; API/import edge. | `customWidth` falls back to `320px`; invalid spacing falls back to token defaults `24px/24px`; no raw unsafe width/spacing strings. | Dziala fail-safe | `resolveCustomWidth()` and `resolveTokenOrPx()` validate length grammar. | Brak. |
| Unsafe color strings | `/audit-31-05-divider-unsafe` | Nieosiagalne przez normalny UI; API/import edge. | Raw `url(javascript:alert(1))` and `expression(alert(2))` appear in inline style attributes. | Nie dziala | `color` and `labelColor` are plain strings normalized only by non-empty check. | Add bounded color sanitizer at `normalizeDividerData()` and tests. |
| Invalid variant | `/audit-31-05-divider-invalid` | Nieosiagalne przez normalny UI; API/import edge. | HTTP 200, rootCount `0`, body contains `Invalid widget data`, no raw invalid payload rendered. | Dziala fail-closed | Widget validator rejects invalid variant. | Brak. |
| Wizard | `Run setup again` | Wizard root exists; `writablePaths=[]`, `readonlyPaths=["variant"]`, preview matches rich state. | Nie dotyczy bez zapisu. | Dziala | Contract marks Wizard as setup/read-only. | Brak. |
| Visual ownership | Rich admin inspect | Sections: Preview, Variant and label, Line style and width, Spacing around divider, Block layout, Visibility; duplicate writable paths `[]`, unwrapped controls `[]`. | Public output matches saved Visual-owned values. | Dziala | Editor contract and metadata align. | Brak. |
| Advanced diagnostics | Rich admin inspect | Advanced root exists; `writablePaths=[]`, `rawControlCount=0`, no unwrapped controls; summaries show Label center, dashed/Bold/Soft, container-lg center, Hero/Standard, label. | Nie dotyczy bez zapisu. | Dziala | Advanced uses readonly summary rows and shared readonly layout/visibility summaries. | Brak. |
| Slots / Structure | Inspect widget definition and admin UI | No Structure section for Divider; no add/move/remove controls. | Atomic layout widget renders no slots. | Dziala | Divider has no slots by product contract. | Brak. |

## Znaleziska do poprawy

### DIV-31-05-01 - Unsafe `color` and `labelColor` strings leak into inline CSS

**Status:** confirmed by Playwright and Claude cross-check.

**Wplyw:** medium. Claude correctly notes this is not confirmed XSS in modern
browsers, because React writes through style properties and the browser rejects
the example values for actual painting. It is still a product/security contract
violation and CSS-injection surface: API/imported data can put raw `url(...)`,
`expression(...)` or other unbounded CSS strings into public inline style
attributes.

**Evidence:**

- `/audit-31-05-divider-unsafe` rendered `data-divider-color-kind="custom"` and
  inline line style containing
  `background-image:repeating-linear-gradient(90deg, url(javascript:alert(1)) ...`.
- The label rendered inline `style="color:expression(alert(2));opacity:1"`.
- `customWidth`, `marginTop` and `marginBottom` did not leak their unsafe input;
  they fell back to `320px` and default token spacing. The gap is specific to
  color values.

**Why / code:**

- Schema allows raw color strings: `core/widgets/core/divider.tsx:181-189`.
- `resolveString()` only checks non-empty strings:
  `core/widgets/core/divider.tsx:360-361`.
- `normalizeDividerData()` passes `color` and `labelColor` through that helper:
  `core/widgets/core/divider.tsx:465-472`.
- Renderer then emits the values into `backgroundColor`,
  `radial-gradient(...)`, `repeating-linear-gradient(...)` and label `color`:
  `core/widgets/core/divider.tsx:512-535` and
  `core/widgets/core/divider.tsx:609-617`.
- Visual normal authoring is safer because `ColorField` uses
  `SharedColorControl` with `showValueInput={false}`:
  `core/admin/ui/widgets/editors/DividerEditors.tsx:261-283`.

**How to fix:**

- Add a Divider-owned safe color resolver near the existing length resolvers.
  Accept known safe values needed by product (`#rgb`, `#rrggbb`, theme tokens
  like `var(--color-border)`, and optionally bounded `rgb()/rgba()/hsl()/hsla()`
  if the shared color contract requires them). Reject `url(`, `expression(`,
  semicolons, braces and unknown raw CSS.
- Use sanitized `color` first, then sanitize `labelColor` with fallback to the
  already sanitized line color.
- Keep `data-divider-color-kind` deterministic, but do not let `custom` mean
  "render raw string".
- Add regressions to `tests/vitest/widgets/divider.test.tsx`:
  normalization fallback for unsafe color and labelColor, no `javascript:` /
  `expression(` in `renderToString()`, and positive cases for hex and
  `var(--color-border)`.
- Re-run the unsafe Playwright route and assert `styleAttributesWithUnsafe=[]`.

## Claude cross-check

Claude was run after local auth was repaired, in read-only mode with `Read/Grep`
tools only. It reviewed the Divider docs, source and tests plus the Playwright
evidence above.

Claude independently confirmed:

- editor ownership matches `dividerEditorContract`,
- numeric, enum, custom width and spacing normalizers are bounded,
- label text is safe React text content,
- spacer-only and label gating are correct,
- the only actionable defect in this pass is the raw `color` / `labelColor`
  style leak.

Claude's caveat is included in the finding: do not overstate this as proven XSS;
fix it as a normalization trust-boundary and CSS-injection contract issue.

## Co dziala

- Public marker contract is deterministic and does not expose raw
  `data-divider-color` or resolved raw width markers.
- `line`, `label-center`, dotted custom and spacer-only render correctly.
- Width modes (`full`, `container`, `custom`) and alignment work without mobile
  overflow.
- `customWidth` and spacing values reject unsafe imported strings and fall back
  safely.
- Wizard and Advanced are read-only; Visual owns daily editing.
- Invalid variants fail closed with `Invalid widget data`.

## Kodowe punkty kontroli

- Editor contract ownership:
  `core/widgets/core/divider.tsx:71-175`.
- Schema string color fields:
  `core/widgets/core/divider.tsx:177-199`.
- Safe width and spacing parsing:
  `core/widgets/core/divider.tsx:330-347`.
- Unsafe color pass-through:
  `core/widgets/core/divider.tsx:360-361` and
  `core/widgets/core/divider.tsx:465-472`.
- Runtime style output:
  `core/widgets/core/divider.tsx:512-535` and
  `core/widgets/core/divider.tsx:609-617`.
- Visual color controls hide raw value input:
  `core/admin/ui/widgets/editors/DividerEditors.tsx:261-283`.

## Walidacja

- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx`
  - PASS: 5 files, 52 tests.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `git diff --check -- _docs/PLAYWRIGHT/31-05-2026-widgets/README.md` -
  PASS.
- `perl -ne 'print "$ARGV:$.: trailing whitespace\n" if /[ \t]$/; print "$ARGV:$.: space before tab\n" if / \t/;' ...`
  on Divider report and Playwright scripts - PASS.
- `LC_ALL=C rg -n "[^\x00-\x7F]" ...` on Divider report and Playwright
  scripts - PASS (no non-ASCII).
