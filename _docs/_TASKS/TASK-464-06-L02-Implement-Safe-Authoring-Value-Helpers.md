# TASK-464-06-L02: Implement Safe Authoring Value Helpers
# FileName: TASK-464-06-L02-Implement-Safe-Authoring-Value-Helpers.md

**Parent Subtask:** TASK-464-06
**Priority:** High
**Category:** Pages / Admin UI / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-464-06-L01
**Status:** ⏳ To Do

---

## Overview

Implement browser-safe authoring sanitizer helpers for editor mutation
boundaries: safe text, URLs, media URLs, color/style tokens, numeric clamps,
enum labels, tooltip labels, and inline-edit commits.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Add safe authoring text helper.
- [ ] Add safe URL/media URL helper with explicit protocols/policies.
- [ ] Add safe color/style token helper.
- [ ] Route inline-edit and registry mutation boundaries through helpers.
- [ ] Add pure sanitizer tests.

---

## Implementation Pseudocode

```ts
export function sanitizeAuthoringText(input: unknown): string {
  return sanitizeInlineText(String(input ?? ""));
}

export function sanitizeAuthoringUrl(input: unknown, policy: AuthoringUrlPolicy): string | null {
  const value = String(input ?? "").trim();
  if (!value) return null;
  return isAllowedAuthoringUrl(value, policy) ? normalizeSafeUrl(value) : null;
}

export function sanitizeAuthoringControlValue(
  control: PageEditorControlDefinition,
  value: unknown
): unknown {
  if (control.input === "color") return normalizeSafeColorToken(value);
  if (control.input === "range" || control.input === "number") return clampControlNumber(control, value);
  return value;
}
```

Expected data flow:

- User input is sanitized before document mutation.
- Renderers receive normalized values.
- Public renderer safety remains intact and separate.

Error handling:

- Unsafe values fail closed to null/default/no-op.
- Errors must not echo raw payloads.

Regression-test shape:

- Valid safe values round-trip unchanged.
- Unsafe values fail closed.

---

## Security Contract

- Helpers must be pure and browser-safe.
- No broad allowlists for `javascript:`, event handlers, CSS `url()`, or raw
  HTML.
- No server imports or secrets.

---

## Testing Requirements

- New Vitest sanitizer suite.
- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
