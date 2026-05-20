# TASK-314-02: Logo Cloud Shared Runtime Semantics Residuals

# FileName: TASK-314-02_Logo_Cloud_Shared_Runtime_Semantics_Residuals.md

**Priority:** High
**Category:** Widgets + Logo Cloud + Shared Contract + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-314
**Status:** Done (2026-05-19)

---

## Overview

Finish the Logo Cloud shared runtime semantics that were routed to
`TASK-256-06-02` but are still missing in the live checkout.

This leaf covers only the current shared runtime contract for existing fields:

- section-heading semantics for the existing Logo Cloud section shell;
- safe current handling for `logoHeight: "none"` so large source images do not
  blow through tile boundaries.

It must not add product-only header controls, per-logo `alt`, new layout modes,
tile radius/border-width, CTA output, or any `TASK-274`-owned schema expansion.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` - rows `BUG-02`, `BF-09`, and
  `BUG-05` capture the shared runtime residuals this leaf closes.
- `_docs/_TASKS/TASK-256-06-02_CTA_Banner_Logo_Cloud_and_Gallery_Media_Links.md`
  - Logo Cloud heading semantics and `logoHeight: "none"` safety were already
  marked as shared scope and must match the live owner before `TASK-274`
  expands product behavior.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/logoCloud.tsx` | Replace the hardcoded `<h3>` with the shared section-heading baseline for the existing header shell, prefer `aria-labelledby` when a title exists with a safe fallback label when it does not, and make `logoHeight: "none"` degrade to a bounded current-safe image presentation. |
| `tests/vitest/widgets/logoCloud.test.tsx` | Add regressions for shared heading semantics, section naming, and bounded `logoHeight: "none"` behavior. |
| `tests/vitest/widgets/renderer.test.tsx` | Update renderer assertions only if the shared runtime markers or section shell output change. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Add or update assertions so `logoHeight: "none"` stays schema-visible while runtime output remains bounded. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document the settled shared runtime heading/height baseline. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed/deferred status for BUG-02 / BF-09 / BUG-05 under the reopened shared family. |

## Implementation Pseudocode

```tsx
const sharedLogoCloudHeadingTag = "h2";
const logoCloudNoneHeightClassName = "h-auto max-h-16";

function LogoCloudBlock({ data, variant }: { data: LogoCloudData; variant: string }) {
  const sectionTitle = (normalized.header?.title ?? "").trim();
  const sectionTitleId = sectionTitle ? "logo-cloud-title" : undefined;
  const HeadingTag = sharedLogoCloudHeadingTag;
  const resolvedLogoHeightClassName =
    logoHeight === "none" ? logoCloudNoneHeightClassName : logoHeightClassMap[logoHeight];

  return (
    <section
      aria-label={sectionTitle ? undefined : "Partner logos"}
      aria-labelledby={sectionTitleId}
    >
      {sectionTitle ? <HeadingTag id={sectionTitleId}>{sectionTitle}</HeadingTag> : null}
      {/* existing description + logo items */}
    </section>
  );
}
```

Error handling:

- The shared heading fix must not add a new widget-owned `headingLevel` field;
  `TASK-274` still treats heading controls as out of scope.
- When the title is empty, the section must still expose a stable fallback name
  instead of an empty `aria-labelledby`.
- `logoHeight: "none"` must remain visible in normalized data and diagnostics,
  but runtime output must no longer allow arbitrarily tall images to escape the
  tile.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged public runtime read-only rendering and authenticated
  admin editing.
- RBAC: unchanged page/template/widget write permission.
- CSRF: unchanged admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged. This leaf must use the current schema
  only and cannot introduce new product fields.
- Anti-abuse: do not introduce raw HTML, arbitrary style strings, or unsafe DOM
  ids while repairing the shared section shell.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_TASKS/TASK-314-02_Logo_Cloud_Shared_Runtime_Semantics_Residuals.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Logo Cloud no longer hardcodes a section title as `<h3>` for the current
  shared section shell.
- The section has an honest accessible name whether the title is present or
  omitted.
- `logoHeight: "none"` remains part of the schema while runtime rendering stays
  bounded and safe for large assets.

## Completion Notes

- 2026-05-19: Logo Cloud now renders section titles through the shared `<h2>`
  baseline with `aria-labelledby`, keeps the fallback section label when the
  title is omitted, and caps `logoHeight: "none"` images with `max-h-16`.
- Validation:
  - `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
