# TASK-274-05: Logo Cloud Tile Link and CTA Controls

# FileName: TASK-274-05_Logo_Cloud_Tile_Link_and_CTA_Controls.md

**Priority:** Medium
**Category:** Widgets + Logo Cloud + Runtime Render + Admin UI + Link UX
**Estimated Effort:** Large
**Dependencies:** TASK-274, TASK-256-02, TASK-256-06-02, TASK-274-04, TASK-313-01
**Status:** To Do

---

## Overview

Add Logo Cloud-specific product controls for tile shape, user-facing link
target behavior, and an optional trust-section CTA below the logo list.

Source report findings:

- UX-09 missing `target="_blank"` option for logo links
- BF-08 missing tile `borderRadius` and `borderWidth`
- BF-11 missing CTA below the logo section

Explicitly out of scope:

- Implementing base safe href normalization, external-link detection, or
  `rel="noopener noreferrer"` by hand; TASK-256 owns shared link attributes.
- Adding arbitrary CSS strings for radius/width.
- Adding public write behavior or tracking callbacks.

Precondition:

- `TASK-256-06-02` already provides the shared `resolveWidgetLinkAttrs()`
  helper at current `HEAD`; this leaf must consume that helper directly instead
  of recreating safe-href logic locally.
- `TASK-313-01` still owns the shared Logo Cloud link-input feedback residual.
  `TASK-274-05` may reuse that feedback once landed, but runtime target/CTA
  work is not blocked on a missing helper anymore.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/logoCloud.tsx` | Add bounded tile radius/width, a global Logo Cloud link-target style field, optional CTA schema/default/normalizer/rendering, and runtime markers. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Add Visual controls for tile radius/width, one global `Open logo links in new tab` switch in `Display style`, and CTA label/href/visibility. |
| `tests/vitest/widgets/logoCloud.test.tsx` | Cover tile classes/markers, link target behavior through shared helper, CTA rendering, and unsafe CTA omission. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Run as regression when this leaf consumes the shared helper; do not edit helper ownership from TASK-274-05. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Cover controls and update flow. |
| `tests/vitest/widgets/renderer.test.tsx` | Update if shared renderer output assertions change. |
| `tests/unit/widgets/validator.test.ts` | Cover schema changes only if intentionally expanding the generic Bun validator suite. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document tile/link/CTA fields. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed evidence for UX-09/BF-08/BF-11. |

## Implementation Pseudocode

```tsx
type LogoCloudTileRadius = "none" | "sm" | "md" | "lg" | "xl" | "full";
type LogoCloudBorderWidth = "none" | "sm" | "md";
type LogoCloudLinkTarget = "same-tab" | "new-tab";

type LogoCloudCta = {
  enabled?: boolean;
  label?: string;
  href?: string;
  target?: LogoCloudLinkTarget;
};

type SharedWidgetLinkAttrs = false | {
  href: string;
  target?: "_blank";
  rel?: string;
};

type SharedWidgetLinkAttrsResolver = (
  href: string | undefined,
  options: {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openInNewTab?: boolean,
  },
  ) => SharedWidgetLinkAttrs;

function resolveLogoLinkAttrs(
  resolveWidgetLinkAttrs: SharedWidgetLinkAttrsResolver,
  href: string | undefined,
  openInNewTab: boolean,
) {
  return resolveWidgetLinkAttrs(href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openInNewTab,
  });
}

function LogoCloudItem({ logo, openLinksInNewTab, resolveWidgetLinkAttrs }: LogoCloudItemProps) {
  const attrs = resolveLogoLinkAttrs(resolveWidgetLinkAttrs, logo.href, openLinksInNewTab);
  if (!attrs) return <div>{content}</div>;
  return <a {...attrs}>{content}</a>;
}

function LogoCloudCta({ cta, resolveWidgetLinkAttrs }: LogoCloudCtaProps) {
  if (!cta.enabled || !cta.label?.trim()) return null;
  const attrs = resolveLogoLinkAttrs(resolveWidgetLinkAttrs, cta.href, cta.target ?? "same-tab");
  if (!attrs) return null;
  return <a {...attrs} data-logo-cloud-cta="true">{cta.label}</a>;
}
```

Editor data flow:

1. Add tile radius and border width as bounded selects, not free-form CSS.
2. Add one global `Open logo links in new tab` switch in `Display style`; do
   not widen Logo Cloud into per-logo target complexity when the current owner
   model only stores `logos[].href`.
3. Add CTA controls with enable toggle, label, href, and target. Reuse shared
   safe-href feedback when `TASK-313-01` exposes it.
4. Render CTA only when enabled, label is present, and safe href resolves.
5. Before implementation, bind the pseudocode above to the exact exported
   `resolveWidgetLinkAttrs()` helper signature. If the shared helper changes
   under `TASK-313`, update this task before coding rather than adapting
   locally.

Error handling:

- Unsafe logo/CTA href values must fail closed through the shared safe helper.
- If the shared helper shape changes unexpectedly, update this task before
  coding rather than recreating helper ownership locally.
- Unknown radius/width/target values normalize to defaults.
- Disabled CTA preserves data but does not render.
- Empty CTA label or href does not render a blank or broken link.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin page/template save flow.
- Reject-unknown validation: new tile/link/CTA fields must be schema-owned and
  validator-tested.
- Anti-abuse: all links must use TASK-256 shared safe href/link-attribute
  behavior; no `javascript:`, `data:`, `vbscript:`, protocol-relative URLs,
  raw HTML, scripts, unbounded classes, tracking code, or secrets may be
  persisted or rendered.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when
  link target/CTA behavior consumes TASK-256 shared link attributes. Do not edit
  shared helper ownership in this leaf.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers change.
- `bun test tests/unit/widgets/validator.test.ts` only when intentionally adding
  Logo Cloud coverage to the generic Bun validator suite.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/WIDGETS.md` only if global link/CTA docs change.
- `_docs/_TASKS/README.md` on status transition.
- `_docs/_CHANGELOG/README.md` and a changelog entry when this leaf is completed
  independently or through TASK-274-06 closure.

## Acceptance Criteria

- Tile shape controls are bounded and schema-owned.
- Logo link target behavior is user-configurable only through shared safe link
  attributes.
- Optional CTA renders safely and omits unsafe or incomplete links.
- Tests prove no unsafe href path is reintroduced.
