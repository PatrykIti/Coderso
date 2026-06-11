# TASK-423-01-L01: Map Responsive Deltas To Scoped Media Rules
# FileName: TASK-423-01-L01-Map-Responsive-Deltas-To-Scoped-Media-Rules.md

**Parent Subtask:** TASK-423-01
**Priority:** High
**Category:** Pages / Public Runtime / Rendering
**Estimated Effort:** Medium
**Dependencies:** TASK-423-01
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Implement the Bun-free responsive CSS builder module (`pageResponsiveCss.ts`)
that converts stored Page responsive deltas into stable, escaped,
selector-scoped `@media` rules for later runtime integration.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
export function buildResponsiveCss(document: PageDocumentV2): string {
  return ["tablet", "mobile"]
    .map((breakpoint) => renderBreakpointRules(document, breakpoint))
    .filter(Boolean)
    .join("\n");
}

function renderBreakpointRules(document, breakpoint) {
  const rules = collectResponsiveDeclarations(document, breakpoint);
  return rules.length === 0 ? "" : `@media (max-width:${maxWidth}px){${rules.join("")}}`;
}
```

Owner files:

- `core/services/pages/pageResponsiveCss.ts`
- `core/services/pages/pageDocumentV2.ts`
- `tests/vitest/services/page-responsive-css.test.ts`

Validation commands:

- `bun run test:vitest -- tests/vitest/services/page-responsive-css.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Walk unflattened sections and nested blocks.
- Emit declarations only for layout/style/spacing/visibility deltas.
- Escape every section/block id used in selectors.

Error handling:

- Unsupported `responsive[bp].props` stay diagnostics-only.
- Empty scopes emit nothing.

Regression-test shape:

- Vitest covers escaping, selector ordering, empty inputs, and unsupported-delta
  handling.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** unchanged public GET routes.
- **RBAC:** not applicable.
- **CSRF:** not applicable.
- **Rate-limit bucket:** unchanged.
- **Validation:** emitted CSS must use normalized/clamped values only.

---

## Testing Requirements

- New Vitest coverage for the responsive CSS builder.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed 2026-06-11 (see TASK-423-01): per-property delta mapping for section layout/style/spacing/visibility and block style/visibility, schema-clamped values only, id escaping, empty-doc short circuit.
