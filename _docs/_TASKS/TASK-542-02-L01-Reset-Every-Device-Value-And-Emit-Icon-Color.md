# TASK-542-02-L01: Reset Every Device Value and Emit Icon Color

# FileName: TASK-542-02-L01-Reset-Every-Device-Value-And-Emit-Icon-Color.md

**Parent Task:** TASK-542
**Parent Subtask:** TASK-542-02
**Priority:** High
**Category:** Menus / Responsive CSS
**Estimated Effort:** Medium
**Dependencies:** TASK-541-03-L01, TASK-542-01-L01
**Status:** ⏳ To Do
**Changelog:** 1254 (pinned; closure only)

---

## Exclusive ownership

- `core/site/menuDocumentCss.ts`

Do not edit menu model, `siteShell.tsx`, MenuDesignEditor, tests, or TASK-541.

## Grounded anchors

- Brand icon emits size only: `menuDocumentCss.ts:470-479`.
- Divider early-off path: `:537-574`.
- Indicator/underline positive-only path: `:576-618`.
- Caret positive/negative asymmetry: `:621-645`.
- Flyout none early return: `:647-690`.
- Container missing-axis default `0`: `:813-833`.
- Brand compare keys omit iconColor: `:905-921`.
- Total device re-emission: `:1001-1022,1102-1114`.
- Device branches/scrolled delta: `:1238-1261,1288-1358`.
- Default constant: `menuDocumentV2.ts:875`.

## Exact neutralizer matrix

| Explicit effective value | Required reset at matching selector/specificity |
|---|---|
| `itemDividerShow:false` | `border-inline-end:none;border-block-end:none` for top items; `border-block-end:none` for dropdown items |
| orientation changes | clear the former divider axis before emitting the new axis |
| `indicator:"none"` | `::before{content:none}` plus stale indicator transition/transform/opacity neutralization as needed |
| `hoverUnderline:false` | hover/focus `text-decoration:none` |
| `showCaret:true` after false | restore the canonical base caret `content` literal |
| `caretRotateOnOpen:false` | rest/open `transform:none`, non-transforming display, and `transition:none` |
| `flyoutAnimation:"none"` | restore base hidden `display:none` and hover/focus `display:grid`; reset visibility/opacity/transform/transition |
| L2 OFF after L1 ON | emit the same resets on exact L2 selectors so descendant L1 selectors cannot win |
| one `containerPadding*` axis | missing axis uses `MENU_SHELL_SUBLIST_PADDING` (6), not 0 |
| responsive `brand.iconColor` | base/device scoped `svg{color:<canonical>}`; compare list includes `iconColor` |

## Implementation Pseudocode

```ts
function brandIconDecls(style: BrandStyle): string[] {
  return compact([
    style.iconSize != null ? `width:${style.iconSize}px` : null,
    style.iconSize != null ? `height:${style.iconSize}px` : null,
    style.iconColor != null ? `color:${style.iconColor}` : null,
  ]);
}

const BRAND_STYLE_COMPARE_KEYS = [existing, "iconSize", "iconColor"];

function levelNeutralizerRules(previous, next, level, context): string[] {
  const rules = [];
  if (previous.itemDividerShow === true && next.itemDividerShow === false) ...;
  if (previous.indicator !== "none" && next.indicator === "none") ...;
  if (previous.hoverUnderline === true && next.hoverUnderline === false) ...;
  if (previous.showCaret === false && next.showCaret === true) ...;
  if (previous.caretRotateOnOpen === true && next.caretRotateOnOpen === false) ...;
  if (previous.flyoutAnimation !== "none" && next.flyoutAnimation === "none") ...;
  return rules;
}

function collectLevelDeltaRules(doc, device) {
  const desktop = resolve...desktop;
  const resolved = resolve...device;
  return [
    ...navLevelRules(resolved, options),
    ...neutralizersForDeviceAndDepth(desktop, resolved),
  ];
}

const padding = x != null || y != null
  ? `padding:${y ?? MENU_SHELL_SUBLIST_PADDING}px ${x ?? MENU_SHELL_SUBLIST_PADDING}px`
  : null;
```

Depth resets compare resolved L2 against the effective shallower style that its
selector inherits, not only desktop/device records. Device resets compare each
tablet/mobile effective value directly to desktop because mobile inherits
desktop, not tablet. Keep tablet/mobile media boundaries and current source order.

Use the exact base caret content already emitted by `navNestingRules`; define one
shared literal/helper in this file rather than two strings. Flyout reset must
restore both rest and open reachability, not merely opacity.

## Error/compatibility flow

CSS generation is total and throws no new domain error. Invalid model values
never arrive after TASK-541/542-01. Unauthored keys emit nothing; explicit reset
values emit deterministic literals. No `!important` is added to compensate for
wrong selector/order.

## Tests owned by TASK-542-04

`tests/vitest/site/menu-document-css.test.ts` gets table-driven base→tablet,
base→mobile, L1→L2, orientation, all OFF values, padding X-only/Y-only/neither,
icon base/tablet/mobile, and no-override byte-identity goldens. Include combined
effects so one reset cannot mask another.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/site/menu-document-css.test.ts \
  tests/vitest/services/menu-document-v2.test.ts
bun test tests/unit/site/menu-document-render.test.tsx
```

Rerun a named failing file once in isolation.
