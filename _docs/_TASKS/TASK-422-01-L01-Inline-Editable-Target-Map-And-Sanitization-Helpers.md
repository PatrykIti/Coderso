# TASK-422-01-L01: Inline Editable Target Map And Sanitization Helpers
# FileName: TASK-422-01-L01-Inline-Editable-Target-Map-And-Sanitization-Helpers.md

**Parent Subtask:** TASK-422-01
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-422-01
**Status:** ⏳ To Do

---

## Overview

Implement the Bun-free owner module that defines which block props are
inline-editable and how raw canvas text is sanitized before it re-enters the
Page document contract.

---

## Implementation Pseudocode

```ts
export const inlineEditableTargets = defineInlineEditableTargets([
  { blockType: "heading", propPath: "text", multiline: false, allowEmpty: false },
  { blockType: "text", propPath: "text", multiline: true, allowEmpty: false },
  { blockType: "quote", propPath: "cite", multiline: false, allowEmpty: true },
]);

export function commitInlineText(target, previous, raw) {
  const next = sanitizeInlineText(target, raw);
  return next.length === 0 && !target.allowEmpty ? previous : next;
}
```

Expected data flow:

- Resolve editable targets from `PageBlockV2` owner metadata.
- Strip markup/control characters before the value reaches Page props.
- Return previous values for required empty commits.

Error handling:

- Unknown targets fail closed to `null`.
- Sanitization never emits raw HTML.

Regression-test shape:

- Vitest covers target resolution, multiline vs single-line sanitization, and
  empty-value fallback.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** helpers must only emit schema-valid plain/sanitized text.

---

## Testing Requirements

- New Vitest coverage for the inline-edit owner module.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

