# TASK-444-01-L01: Divider Dedicated Controls And Runtime Guard
# FileName: TASK-444-01-L01-Divider-Dedicated-Controls-And-Runtime-Guard.md

**Parent Subtask:** TASK-444-01
**Priority:** Low
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Small
**Dependencies:** TASK-444-01
**Status:** ⏳ To Do

---

## Overview

Adopt the shared dedicated controls for Divider tone/style/visibility while
preserving the currently-correct `<hr>` runtime output.

---

## Implementation Pseudocode

```tsx
renderBlockControls(getBlockControlsForType("divider"));
expect(renderPublishedDivider(block)).toContain("<hr");
```

Expected data flow:

- Divider tone/style controls move to the dedicated widgets.
- Published runtime keeps rendering a real divider element.

Error handling:

- Unsupported tones fall back to the current neutral default.
- Control migration must not alter divider persistence semantics.

Regression-test shape:

- UI coverage for dedicated controls and runtime coverage for divider output.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Divider fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

