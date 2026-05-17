# TASK-289-04: Team Header Surface Typography and CTA Controls

# FileName: TASK-289-04_Team_Header_Surface_Typography_and_CTA_Controls.md

**Priority:** Medium
**Category:** Widgets + Team + Runtime Render + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-289, TASK-256-02, TASK-256-04, TASK-256-06-04
**Status:** To Do

---

## Overview

Add bounded Team section presentation controls after TASK-256 establishes the
baseline heading, section labeling, safe link, and token behavior.

This leaf owns Team-specific section background, header eyebrow, header
alignment/title-size controls, card border width, optional section CTA, and
local contrast feedback for Team colors. It must not reimplement TASK-256
heading hierarchy, section ARIA, safe href, or clear/none token helpers.

## Source Findings

- `REPORT_TEAM_WIDGET.md:270-273` - BF-01 section background is missing.
- `REPORT_TEAM_WIDGET.md:281-283,290-292` - BF-03 heading level is TASK-256, while
  BF-05 header alignment/title size is Team presentation scope.
- `REPORT_TEAM_WIDGET.md:298-312` - BF-07 contrast feedback, BF-08 eyebrow,
  BF-09 CTA, and BF-10 card border width are Team product controls.

## Sub-Tasks

- [ ] Add schema/default/normalizer fields for Team header eyebrow and bounded
  presentation controls.
- [ ] Add section background controls using existing clearable style/token
  patterns from TASK-256 rather than raw class names.
- [ ] Add header alignment and title-size presets that work with the final
  TASK-256 heading-level contract.
- [ ] Add a bounded card border-width token instead of arbitrary CSS.
- [ ] Add an optional CTA model below the Team section using safe href behavior
  from TASK-256.
- [ ] Add editor-only contrast feedback for Team section/card color
  combinations without blocking saves unless the repo already has a blocking
  contrast pattern.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/team.tsx` | Extend Team schema/defaults/normalizer, render section background, eyebrow, header alignment/title size, CTA, border-width token, and data markers. |
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Add Wizard/Visual/Advanced controls in the appropriate mode, with clearable fields using existing shared controls. |
| `tests/vitest/widgets/team.test.tsx` | Cover rendering and normalization for new presentation fields and legacy fallback. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Cover editor controls, clear behavior, contrast feedback, and CTA field updates. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Extend only if CTA safe-link behavior changes helper coverage. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Cover style-token adjacency if new clear/none fields are added. |
| `tests/unit/widgets/validator.test.ts` | Cover schema acceptance/rejection for new fields. |
| `_docs/_WIDGETS/TEAM.md` | Document new header/surface/CTA fields. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update if the added controls change pack readiness/completeness. |

## Implementation Pseudocode

```tsx
type TeamHeader = {
  eyebrow?: string;
  title?: string;
  description?: string;
  align?: "left" | "center" | "right";
  titleSize?: "xl" | "2xl" | "3xl";
};

type TeamStyle = {
  sectionBackground?: string;
  cardSurface?: string;
  cardBorder?: string;
  cardBorderWidth?: "none" | "thin" | "medium";
};

type TeamCta = {
  label?: string;
  url?: string;
  target?: "self" | "blank";
};

function renderTeamCta(cta: TeamCta | undefined) {
  const href = normalizeWidgetSafeHref(cta?.url, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });
  if (!cta?.label || !href) return null;
  return <a href={href}>{cta.label}</a>;
}
```

Data flow:

- Extend `teamSchema` with explicit enums and `additionalProperties: false`.
- Normalize missing legacy fields to defaults without rewriting old persisted
  payloads destructively.
- Use `resolveClearableStyleValue` and TASK-256 clear semantics for color-like
  fields.
- Keep CTA link safety in shared helper ownership.

Error handling:

- Invalid enum values normalize to defaults.
- Empty CTA labels or unsafe URLs do not render a public link and show editor
  feedback.
- Contrast feedback must be computed from bounded color values; CSS variables
  should show advisory copy if exact contrast cannot be computed locally.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new fields must be schema-bound and covered by
  validator tests.
- Anti-abuse: CTA URL must use TASK-256 safe href behavior; presentation fields
  must not accept raw HTML, scripts, arbitrary class names, inline event
  handlers, or secrets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if CTA
  helper behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  new clear/none fields are added.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring
  changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`
- `_docs/WIDGETS.md` only if a global widget contract changes
- `_docs/WIDGET_PACK_MATRIX.md` if pack readiness changes

## Acceptance Criteria

- Team has bounded section/header/card/CTA presentation controls without raw CSS
  or unbounded class payloads.
- New fields are schema-owned, normalized, tested, and backward compatible.
- TASK-256 remains the owner for baseline heading hierarchy, section ARIA, safe
  link output, and clear/none semantics.
