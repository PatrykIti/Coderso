# TASK-451-02-L01: Normalize Preview Dialog Labels And Add Surface Affordances
# FileName: TASK-451-02-L01-Normalize-Preview-Dialog-Labels-And-Add-Surface-Affordances.md

**Parent Subtask:** TASK-451-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-451-02, TASK-451-01-L01
**Status:** ⏳ To Do

---

## Overview

Normalize toolbar labels that currently leak block content or inconsistent
capitalization, and close the remaining add-surface/shell parity gaps noted by
the cross-parity audit.

---

## Implementation Pseudocode

```tsx
const toolbarLabel = resolveToolbarTargetLabel(target, {
  fallbackToTypeName: true,
  preferUserContentOnlyWhenStable: true,
});
```

Expected data flow:

- Toolbar labels prefer stable human type names over placeholder/default copy.
- Add-section/add-block affordances remain capability-aware.
- Preview dialog shell matches the restored route behavior.

Error handling:

- Missing labels fall back to type-safe defaults.
- Shell polish must not alter save/publish behavior.

Regression-test shape:

- Vitest UI coverage for toolbar labels and preview-shell interactions.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes beyond the restored preview flow.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** shell polish must not expose extra preview/token data.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

