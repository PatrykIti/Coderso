# TASK-442-01-L01: Empty List Persistence Ordered Toggle And Shared Editing Surface
# FileName: TASK-442-01-L01-Empty-List-Persistence-Ordered-Toggle-And-Shared-Editing-Surface.md

**Parent Subtask:** TASK-442-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-442-01
**Status:** ⏳ To Do

---

## Overview

Preserve a freshly inserted List block through save/publish even when it is
still empty, and adopt the shared editing/toggle surfaces for items and ordered
state.

---

## Implementation Pseudocode

```ts
const block = createDefaultListBlock();
expect(roundTrip(block)).toContain("list");
renderToggleControl("ordered");
renderInlineEditableListItems(block.props.items);
```

Expected data flow:

- Empty default lists remain persisted draft/published state until the author
  decides otherwise.
- Ordered writes through a boolean owner field, not a select string.
- List items use the shared editing surface without breaking runtime markup.

Error handling:

- Empty item collections no longer prune the whole block/page.
- Invalid item payloads still fail closed through the existing schema owner.

Regression-test shape:

- Vitest coverage for empty/populated list round-trip and UI coverage for the
  ordered toggle/editing surface.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned List fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- List runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

