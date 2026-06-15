# TASK-464-06-L02: Implement Safe Authoring Value Helpers
# FileName: TASK-464-06-L02-Implement-Safe-Authoring-Value-Helpers.md

**Parent Subtask:** TASK-464-06
**Priority:** High
**Category:** Pages / Admin UI / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-464-06-L01
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Implement browser-safe authoring sanitizer helpers for editor mutation
boundaries: safe text, URLs, media URLs, color/style tokens, numeric clamps,
enum labels, tooltip labels, and inline-edit commits.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [x] Add safe authoring display-text helper for labels/tooltips/summaries.
- [x] Add safe URL/media URL helper with explicit protocols/policies.
- [x] Add safe color/style token helper.
- [x] Encode the TASK-464-06-L01 field-path policy as typed helper policies for
      link URLs, media URLs, embed URLs, safe HTML/embed content, colors,
      gradients, numerics, and enums.
- [x] Route inline-edit and registry mutation boundaries through helpers.
- [x] Add pure sanitizer tests.

---

## Implementation Pseudocode

```ts
export function sanitizeAuthoringDisplayText(input: unknown): string {
  return sanitizeStaticTextLabel(String(input ?? ""));
}

export function commitInlineAuthoringText(
  target: InlineEditableTarget,
  previous: string,
  raw: string
): string {
  return commitInlineText(target, previous, raw);
}

export function sanitizeAuthoringUrl(input: unknown, policy: AuthoringUrlPolicy): string | null {
  const value = String(input ?? "").trim();
  if (!value) return null;
  if (policy.kind === "link-url") return normalizeWidgetSafeHref(value);
  return isAllowedAuthoringUrl(value, policy) ? normalizeAuthoringSafeUrl(value, policy) : null;
}

export function sanitizeAuthoringControlValue(
  control: PageEditorControlDefinition,
  value: unknown
): unknown {
  if (control.input === "color") return normalizeSafeColorToken(value);
  if (control.input === "range" || control.input === "number") return clampControlNumber(control, value);
  if (control.input === "url") return sanitizeAuthoringUrl(value, control.urlPolicy);
  if (control.input === "media") return sanitizeAuthoringUrl(value, { kind: "media-url" });
  if (control.input === "select") return normalizeControlEnumValue(control, value);
  return sanitizeAuthoringDisplayText(value);
}
```

Expected data flow:

- User input is sanitized before document mutation.
- Inline-edit commits keep using the target-aware
  `commitInlineText(target, previous, raw)` path from `pageInlineEditContract`;
  generic display-text helpers are only for static labels, tooltips, summaries,
  and option text.
- Renderers receive normalized values.
- Field paths identified in TASK-464-06-L01 map to an explicit policy before
  mutation: link URL, media URL, embed URL, safe embed HTML, color, gradient,
  numeric, enum, or plain text.
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
- Reuse or consolidate existing sanitizer owners before adding new logic:
  `widgetSafeHref` for safe link hrefs, existing widget color normalizers for
  color-like controls, `pageInlineEditContract` for inline text, and TASK-463
  embed sanitizer owners for embed HTML/URLs.
- No broad allowlists for `javascript:`, event handlers, CSS `url()`, or raw
  HTML.
- Style helpers must reject CSS `url(...)` payloads unless a field-specific
  media URL policy owns that sink.
- Embed HTML must go through the existing TASK-463 sanitizer/normalizer owner;
  do not create a second raw HTML allowlist.
- No server imports or secrets.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts`
- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
