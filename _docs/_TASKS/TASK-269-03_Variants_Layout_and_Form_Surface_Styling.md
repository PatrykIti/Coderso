# TASK-269-03: Variants, Layout, and Form Surface Styling

# FileName: TASK-269-03_Variants_Layout_and_Form_Surface_Styling.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI + Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-269-02, TASK-310
**Status:** Done (2026-05-18)

---

## Overview

Make the Form Embed visual contract truthful.

`_docs/_WIDGETS/FORM_EMBED.md` documents `standard`, `card`, and `inline`
variants, but `formEmbed.tsx` currently normalizes every variant to `standard`.
The report also calls out hardcoded section padding, coupled spacing/gap, title
typography, label/helper colors, submit button colors, and section semantics.
This leaf must first reconcile the variant contract across docs, registry,
renderer, and tests. Stale docs alone are not approval for product expansion:
either implement extra variants with clear product proof or narrow the docs and
tests back to the truthful `standard` contract before landing the rest of the
Form Embed-owned visual controls. Generic clear/color-token behavior stays in
TASK-310 shared scope.

## Scope Boundary

This leaf owns Form Embed visual output:

- truthful variant contract across docs, widget registry, renderer, and tests;
- independent section max-width, horizontal/vertical padding, and field gap
  controls where they are Form Embed-specific;
- title heading level/typography/color controls constrained to safe enums;
- label/helper text color controls constrained to existing token/hex behavior;
- submit button background/text color and style state;
- section `aria-label` / `aria-labelledby` and heading-level policy for this
  widget;
- truthful border color application for Form Embed field controls.

This leaf does not own the shared color picker CSS-variable fallback, generic
clear controls, global heading hierarchy helpers, or unrelated widget variants.
Rows U3 and U4 stay in TASK-310 shared scope; this leaf may only consume the
shared helper/adoption result and must not re-implement widget-local picker or
clear semantics.

## Sub-Tasks

- [ ] Reconcile the live variant contract first: either implement extra
  variants with explicit product proof or narrow docs/registry/tests back to
  the truthful `standard` owner contract.
- [ ] If extra variants remain in scope after that reconciliation, extend
  `FormEmbedVariantId`, widget registry variants, schema/defaults, and
  normalizer without destructive legacy data rewrites.
- [ ] Split layout spacing into safe Form Embed controls for section padding and
  internal field gap; preserve legacy `layout.spacing` as a backward-compatible
  adapter.
- [ ] Add bounded style fields for title typography, label color, helper color,
  submit button background, and submit button text.
- [ ] Add section accessible naming and heading-level behavior that can render a
  valid heading without assuming page-level hierarchy.
- [ ] Apply field `borderColor` consistently with border width classes and
  inline styles without relying on dynamic Tailwind class generation.
- [ ] Update Visual/Advanced editor controls for only Form Embed-owned visual
  fields.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/formEmbed.tsx` | Extend variant union/schema/defaults/normalizer/render, layout controls, style fields, section semantics, and border color handling. |
| `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` | Add Visual/Advanced controls for Form Embed variants and new bounded style fields. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover variants, layout/style fields, section naming, heading output, submit colors, and backward compatibility. |
| `tests/vitest/ui/form-embed-editor-wave.test.tsx` | Cover Visual/Advanced controls for variants and style fields. |
| `tests/unit/widgets/validator.test.ts` | Cover schema acceptance/rejection when variants or schema fields change. |
| `_docs/_WIDGETS/FORM_EMBED.md` | Sync variant/layout/style contract. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Form Embed readiness/completeness changes. |

## Implementation Pseudocode

```ts
export type FormEmbedVariantId = "standard" | "card" | "inline";

type FormEmbedLayout = {
  alignment?: "start" | "center" | "end";
  width?: "none" | "sm" | "md" | "lg" | "xl";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  sectionWidth?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  sectionPaddingY?: "none" | "sm" | "md" | "lg" | "xl";
  fieldGap?: "sm" | "md" | "lg";
  buttonAlignment?: "start" | "center" | "end";
};

type FormEmbedStyle = {
  titleSize?: "sm" | "md" | "lg";
  titleWeight?: "medium" | "semibold" | "bold";
  titleColor?: string;
  labelColor?: string;
  helperColor?: string;
  submitBackground?: string;
  submitTextColor?: string;
};

function resolveFormEmbedVariant(value: string): FormEmbedVariantId {
  return value === "card" || value === "inline" ? value : "standard";
}
```

Renderer shape:

```tsx
const sectionLabelId = title ? `${instanceId}-title` : undefined;

<section
  aria-labelledby={sectionLabelId}
  aria-label={sectionLabelId ? undefined : "Form"}
  data-form-embed-variant={resolvedVariant}
>
  <FormEmbedSurface variant={resolvedVariant}>
    <Heading as={resolvedHeadingLevel} id={sectionLabelId} className={titleClassName}>
      {title}
    </Heading>
    <FormFields labelStyle={labelStyle} helperStyle={helperStyle} />
  </FormEmbedSurface>
</section>
```

Error handling:

- Unknown variants normalize to `standard` and remain non-destructive.
- Legacy `layout.spacing` continues to drive current spacing until explicit new
  controls are set.
- Invalid enum values fall back to current defaults.
- Color fields render through the same safe string handling as current style
  values and must not become arbitrary CSS blocks.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new layout/style fields must be explicitly
  allowlisted by `formEmbedSchema`.
- Anti-abuse: visual fields are plain strings or enums; no arbitrary HTML,
  script, event handlers, or untrusted style blocks.
- Secret handling: visual config must not carry provider keys, CAPTCHA secrets,
  nonce secrets, raw form submissions, or private URLs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
  if shared clear/none adjacency is touched
- `bun test tests/unit/widgets/validator.test.ts` when schema/variant metadata changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FORM_EMBED.md` with variant, layout, typography, and
  submit button styling behavior.
- Update `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` rows C1, W4-W10, A1,
  and A2 after validation.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if the implemented variants change
  pack readiness or completeness.

## Changelog Policy

- Covered by the TASK-269 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- The Form Embed variant contract is truthful across docs, widget registry,
  renderer, and tests; stale docs alone do not force product expansion.
- Layout controls can change section padding/max width and form density without
  corrupting existing `layout.spacing` data.
- Title, label, helper, border, and submit button styles are configurable
  through bounded Form Embed schema fields.
- Section naming and heading output are accessible and covered by tests.
