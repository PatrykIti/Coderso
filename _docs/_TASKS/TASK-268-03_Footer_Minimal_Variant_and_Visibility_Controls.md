# TASK-268-03: Footer Minimal Variant and Visibility Controls

# FileName: TASK-268-03_Footer_Minimal_Variant_and_Visibility_Controls.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-268, TASK-268-01, TASK-268-02
**Status:** To Do

---

## Overview

Make the Footer `minimal` variant truthful and add Footer-owned visibility
controls for the legal/social strips.

The report shows that `minimal` is currently just the standard column layout
with one column. It also notes that the legal strip always renders, even when the
user does not want a legal/social row. This leaf fixes those Footer-specific
runtime and editor mismatches after legal/brand normalization is stable.

## Scope Boundary

This leaf owns:

- A true `minimal` Footer render shape, for example one horizontal/stacking row
  with brand/legal links/social actions rather than a single content column.
- Backward-compatible behavior for existing `minimal` blocks.
- `legal.enabled` or equivalent strip visibility controls that do not destroy
  configured legal data.
- `social.enabled` or equivalent social visibility controls that do not destroy
  configured social data.
- Empty-state behavior for legal/social rows so public runtime does not render
  empty wrappers.

This leaf does not own global variant-selection helpers, shared editor mode
navigation, or public slot placeholder gating. It must preserve the existing
`bottom` slot contract or explicitly document a compatible minimal-slot
placement.

## Sub-Tasks

- [ ] Define the desired `minimal` variant contract in `_docs/_WIDGETS/FOOTER.md`
  before implementing code.
- [ ] Add non-destructive visibility fields for legal and social areas.
- [ ] Render `minimal` through a dedicated branch that uses normalized legal,
  brand, social, and bottom-slot data without pretending it is a column grid.
- [ ] Keep `columns-2` and `columns-3` output unchanged except for visibility
  controls.
- [ ] Do not delete or rewrite stored column data when switching to/from
  `minimal`.
- [ ] Add Wizard/Visual controls for legal/social visibility with clear copy
  that data is preserved while hidden.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/footer.tsx` | Extend schema/defaults/normalization and render a dedicated minimal variant plus optional legal/social strips. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add visibility controls and minimal-variant copy/controls in the appropriate mode. |
| `tests/vitest/widgets/footer.test.tsx` | Cover minimal output shape, preserved hidden data, legal/social hidden output, and bottom slot placement. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover visibility toggles and minimal editor copy. |
| `tests/vitest/widgets/renderer.test.tsx` | Update if renderer integration should assert minimal/bottom slot output. |
| `tests/unit/widgets/validator.test.ts` | Update when schema fields are added. |
| `_docs/_WIDGETS/FOOTER.md` | Document minimal variant and non-destructive visibility controls. |

## Implementation Pseudocode

```ts
type FooterLegal = {
  enabled?: boolean;
  copyright?: string;
  privacy?: string;
  privacyLabel?: string;
  terms?: string;
  termsLabel?: string;
};

type FooterData = {
  socialEnabled?: boolean;
  legal?: FooterLegal;
};

function isLegalVisible(legal: NormalizedFooterLegal, bottomSlotCount: number) {
  return legal.enabled !== false && (legal.hasContent || bottomSlotCount > 0);
}

function isSocialVisible(data: FooterData, social: FooterSocial[]) {
  return data.socialEnabled !== false && social.length > 0;
}

function renderMinimalFooter(context: FooterRenderContext) {
  return (
    <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-4">
      <FooterBrandBlock brand={context.brand} />
      <FooterLegalLinks legal={context.legal} />
      <FooterSocialLinks social={context.social} />
    </div>
  );
}
```

Error handling:

- Missing `enabled` fields default to visible to preserve legacy output.
- Empty legal/social data must not render empty public wrappers.
- Hidden legal/social data stays in the payload so toggles are reversible.
- Slot content remains visible according to the documented minimal placement.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: visibility fields must be explicit booleans and
  unknown payload keys must still reject.
- Anti-abuse: hiding/showing legal or social areas must not bypass safe href,
  icon allowlist, or plain-text normalization from TASK-268-01 and TASK-268-02.
- Secret handling: no secrets in visibility data, docs, tests, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` because this
  leaf changes public Footer renderer output and slot/strip placement.
- `bun test tests/unit/widgets/validator.test.ts` when schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before moving this leaf to `Done` or committing it independently, also run
  `git diff --check`, `bun run gates:coderso`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/FOOTER.md` with the minimal render contract, slot
  placement, and legal/social visibility behavior.
- Update `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` rows for minimal variant and
  legal/social always-rendered behavior after validation.

## Changelog Policy

- Covered by the TASK-268 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- `minimal` no longer renders as only the first normal column plus the same
  standard column layout.
- Legal/social strips can be hidden without deleting configured content.
- Empty legal/social wrappers do not appear in public output.
- Switching variants preserves existing column/legal/social data.
- Admin preview and public runtime agree on minimal behavior.
