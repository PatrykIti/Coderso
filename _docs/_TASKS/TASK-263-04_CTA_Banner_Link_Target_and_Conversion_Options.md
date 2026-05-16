# TASK-263-04: CTA Banner Link Target and Conversion Options

# FileName: TASK-263-04_CTA_Banner_Link_Target_and_Conversion_Options.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI + Link Safety
**Estimated Effort:** Large
**Dependencies:** TASK-263, TASK-263-02, TASK-256-06-02, TASK-256-07
**Status:** To Do

---

## Overview

Add CTA Banner-owned conversion options for action links and action presentation.

This leaf covers the product features from the CTA report that are specific to
CTA actions: new-tab target policy, safe rel output, button icons, optional
tertiary text CTA, and description visibility. If target/rel handling needs a
shared `resolveWidgetLinkAttrs()` helper, land that through TASK-256-06-02 or a
new shared safe-link task first instead of duplicating external-link detection
inside CTA Banner.

## Sub-Tasks

- [ ] Add an allowlisted new-tab policy for each CTA action. Prefer a boolean
  `openInNewTab` or enum over raw `target` strings.
- [ ] Derive safe `rel` attributes from the target policy and URL kind; do not
  persist arbitrary raw `rel` text unless a shared link helper explicitly owns
  that contract.
- [ ] Add allowlisted icon placement for primary and secondary CTA buttons.
- [ ] Add optional tertiary text CTA with label, href, target policy, and safe
  link normalization.
- [ ] Add a description visibility toggle so users can hide the support line
  without destructively clearing copy.
- [ ] Keep icon and tertiary fields in Wizard/Visual only where they help
  conversion setup; reserve raw technical controls for Advanced if needed.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/ctaBanner.tsx` | Extend action schema/defaults/normalizer for target policy, icons, tertiary CTA, and description visibility; render safe link attrs. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Add Visual/Wizard controls for target policy, icons, tertiary CTA, and description visibility. |
| `core/widgets/core/widgetSafeHref.ts` | Touch only if a shared safe-link attr helper already owns target/rel behavior or this leaf first splits a shared task. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | Cover safe target/rel output, icon enum rendering, tertiary CTA visibility, description toggle, and backwards compatibility. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | Cover editor controls for target policy, icon fields, tertiary CTA, and description toggle. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Run/update only if shared target/rel helper behavior changes. |
| `tests/unit/widgets/validator.test.ts` | Update when schema/defaults change. |
| `_docs/_WIDGETS/CTA_BANNER.md` | Document action link and conversion options. |

## Implementation Pseudocode

```ts
type CtaActionTarget = "same-tab" | "new-tab";
type CtaActionIcon = "none" | "arrow-right" | "chevron-right" | "external-link";

type CtaBannerAction = {
  label?: string;
  href?: string;
  target?: CtaActionTarget;
  icon?: CtaActionIcon;
};

type CtaBannerData = {
  content?: {
    showDescription?: boolean;
  };
  actions?: {
    tertiaryCta?: CtaBannerAction;
  };
};
```

Safe link attrs:

```ts
function resolveCtaLinkAttrs(action: CtaBannerAction) {
  const href = normalizeWidgetSafeHref(action.href, safeHrefOptions);
  if (!href) return null;
  if (action.target === "new-tab") {
    return { href, target: "_blank", rel: "noopener noreferrer" };
  }
  return { href };
}
```

Renderer flow:

```tsx
const actions = [primaryCta, secondaryCta, tertiaryCta]
  .filter((action) => isEnabledAction(action))
  .map((action) => ({ action, attrs: resolveCtaLinkAttrs(action) }))
  .filter((entry) => entry.attrs);
```

Error handling:

- Invalid icon and target values fall back to `none` and `same-tab`.
- Tertiary CTA renders only when enabled and both normalized label and href are
  non-empty.
- `showDescription=false` hides the description but preserves text in widget
  data.
- Unsafe URLs never produce raw `href`, `target`, or `rel` output.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: all new action and content fields must be explicit
  schema fields with `additionalProperties: false`.
- Anti-abuse: target and rel are allowlisted/derived. Do not persist arbitrary
  target strings, rel strings, SVGs, icon components, scripts, event handlers,
  raw HTML, or untrusted classes.
- Secret handling: action links must not be used for secret storage; docs and
  tests must not include private URLs or tokens.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if the
  shared link helper changes
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CTA_BANNER.md` with target policy, generated rel,
  icons, tertiary CTA, and description visibility.
- Update `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` rows BF-02, BF-03,
  BF-08, and BF-09 after validation.

## Changelog Policy

- Covered by the TASK-263 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- CTA links can intentionally open in a new tab and always emit safe rel attrs.
- CTA icon choices are fixed enums and render safely.
- Optional tertiary CTA behaves like a first-class CTA action without changing
  public security posture.
- Users can hide the description without losing saved copy.
