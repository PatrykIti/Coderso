# TASK-275-05-03: Navigation Visual Style Tokens

# FileName: TASK-275-05-03_Navigation_Visual_Style_Tokens.md

**Priority:** Medium
**Category:** Widgets + Navigation + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-275, TASK-275-03, TASK-275-05
**Status:** Done (2026-05-19)

---

## Overview

Add bounded Navigation-owned visual tokens: hover/active colors, underline
policy, letter spacing, shadow, backdrop blur, dropdown direction, and bounded
motion tokens. Click/touch submenu behavior and baseline state hooks stay in
TASK-275-03; this leaf owns configurable styling, direction, and animation
tokens that consume those hooks.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:97-102` - hover color, active
  color, and underline controls are missing. Active-link detection itself is
  owned by TASK-275-05-02.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:127-140,147-149` - letter
  spacing, shadow, backdrop blur, dropdown animation, and dropdown direction
  controls are missing.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:185` - Navigation color inputs
  allow manual hex entry without live validation feedback.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:215,226,234-235` - contrast,
  dropdown animation, letter spacing, and backdrop blur market-standard gaps are
  noted; generic contrast validation remains routed to shared owner `TASK-299`.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:433,436-438,440` -
  visual-token and dropdown-animation rows appear in lower-priority backlog.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/navigation.tsx` | Add schema/default/normalizer/render support for bounded style tokens such as `linkHoverColor`, `linkActiveColor`, `linkUnderline`, `letterSpacing`, `shadow`, `backdropBlur`, `dropdownDirection`, and bounded motion. Use tokenized classes or validated color values only. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Add Visual controls with clear behavior for optional tokens and Navigation-local live validation feedback for manual hex color inputs. Keep Advanced technical-only unless TASK-256 changes mode ownership. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert style tokens render deterministic output and unknown values normalize safely. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert controls update and clear token fields without serializing empty sentinels, and manual hex color fields show deterministic live validation feedback. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Run/update if new fields interact with `none` or clearable token semantics. |
| `tests/unit/widgets/validator.test.ts` | Update schema/default assertions for persisted token fields. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document visual token ranges, clear behavior, dropdown direction, and motion policy. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Record fixed/deferred evidence for visual token rows and keep generic contrast validation routed to shared owner `TASK-299`. |

## Implementation Pseudocode

```tsx
type NavigationVisualStyle = {
  linkHoverColor?: string;
  linkActiveColor?: string;
  linkUnderline?: "none" | "hover" | "always";
  letterSpacing?: "normal" | "wide" | "wider";
  shadow?: "none" | "sm" | "md" | "lg";
  backdropBlur?: "none" | "sm" | "md";
  dropdownDirection?: "bottom" | "top" | "auto";
  motion?: "none" | "subtle" | "standard";
};

function normalizeNavigationVisualStyle(input: unknown): NavigationVisualStyle {
  return {
    linkUnderline: normalizeEnum(input.linkUnderline, ["none", "hover", "always"], "hover"),
    letterSpacing: normalizeEnum(input.letterSpacing, ["normal", "wide", "wider"], "normal"),
    shadow: normalizeEnum(input.shadow, ["none", "sm", "md", "lg"], "none"),
    backdropBlur: normalizeEnum(input.backdropBlur, ["none", "sm", "md"], "none"),
    dropdownDirection: normalizeEnum(input.dropdownDirection, ["bottom", "top", "auto"], "bottom"),
    motion: normalizeEnum(input.motion, ["none", "subtle", "standard"], "standard"),
  };
}
```

Error handling:

- Unknown tokens normalize to documented defaults.
- Clear controls remove optional keys rather than serializing empty strings.
- Color fields must use existing validated color input patterns; no raw CSS
  blocks, arbitrary classes, or style object passthrough.
- Navigation-local hex feedback must not become a shared color-input framework
  unless TASK-256 creates that owner.
- Dropdown direction changes must not reimplement submenu click/touch state from
  TASK-275-03.
- Dropdown animation tokens must consume TASK-275-03 state hooks instead of
  adding a second submenu controller.

## Data Flow

1. Admin edits bounded Visual controls for Navigation visual style and color
   values.
2. `navigationSchema` and `normalizeNavigationData()` clamp tokens and optional
   color values.
3. `NavigationEditors.tsx` gives immediate Navigation-local feedback for manual
   hex color values while persistence still goes through schema/normalizer
   checks.
4. `navigation.tsx` maps normalized values to deterministic classes/styles and
   root/submenu data attributes.
5. Vitest validates normalized output, clear behavior, editor feedback, and SSR
   rendering.
6. Docs/report distinguish Navigation-owned style controls from shared generic
   contrast validation.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: every persisted style field must be strict in
  `navigationSchema`.
- Anti-abuse: no raw class names, raw CSS, raw HTML, script, or unbounded motion
  values. Color values must pass existing validated input patterns.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  clear/none-adjacent fields are added.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux`
- `bun scripts/coderso-release-gates.ts --gate security`
- `bun scripts/coderso-release-gates.ts --gate performance` when public motion
  behavior changes.
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-05-03_Navigation_Visual_Style_Tokens.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Visual style fields are bounded, schema-backed, normalized, tested, and
  documented.
- Clear controls do not persist empty sentinels.
- Manual hex color inputs provide Navigation-local live validation feedback
  without introducing a shared color framework.
- Dropdown direction is implemented as styling/direction only; interaction state
  remains TASK-275-03.
- Shared contrast validation remains routed outside TASK-275 through `TASK-299`.
