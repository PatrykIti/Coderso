# TASK-464-06: Centralize Authoring Sanitizers And XSS Guardrails
# FileName: TASK-464-06-Centralize-Authoring-Sanitizers-And-XSS-Guardrails.md

**Parent Task:** TASK-464
**Priority:** High
**Category:** Pages / Admin UI / Security
**Estimated Effort:** Large
**Dependencies:** TASK-464-02, TASK-464-03, TASK-464-04, TASK-464-05
**Status:** ⏳ To Do

---

## Overview

Centralize the Page Editor authoring sanitizer and XSS guard contract so the
new reusable modules are safe by construction and scanner-friendly. Existing
sanitizers such as `pageInlineEditContract` and the TASK-463 embed hardening
must remain the source of truth where they already own behavior; this task
connects all authoring inputs and render-adjacent values to owned helpers.

Hard constraint: **no UX/UI changes**. Sanitizer work must not change visible
copy, layout, formatting, current allowed safe rich/embed behavior, or control
UX except where current behavior is demonstrably unsafe and the task records a
fail-closed equivalent.

---

## Sub-Tasks

- [ ] [TASK-464-06-L01](TASK-464-06-L01-Authoring-Sink-Inventory-And-Sanitizer-Contract.md): Authoring sink inventory and sanitizer contract.
- [ ] [TASK-464-06-L02](TASK-464-06-L02-Implement-Safe-Authoring-Value-Helpers.md): Implement safe authoring value helpers.
- [ ] [TASK-464-06-L03](TASK-464-06-L03-XSS-Regression-And-Scanner-Guard-Coverage.md): XSS regression and scanner guard coverage.

---

## Implementation Pseudocode

```ts
export function sanitizeAuthoringText(input: unknown): string {
  return sanitizeInlineText(String(input ?? ""));
}

export function sanitizeAuthoringUrl(input: unknown, policy: UrlPolicy): string | null {
  const value = String(input ?? "").trim();
  if (!value) return null;
  if (!isAllowedUrlProtocol(value, policy)) return null;
  return normalizeSafeUrl(value);
}

export function sanitizeAuthoringStyleValue(
  control: PageEditorControlDefinition,
  value: unknown
): unknown {
  switch (control.input) {
    case "color":
      return normalizeSafeColorToken(value);
    case "range":
    case "number":
      return clampNumericControlValue(control, value);
    default:
      return value;
  }
}

export function assertNoAuthoringDangerousHtml(rendered: HTMLElement) {
  expect(rendered.querySelector("script")).toBeNull();
  expect(rendered.innerHTML).not.toContain("onerror=");
  expect(rendered.innerHTML).not.toContain("javascript:");
}
```

Expected data flow:

- Inline edit commits go through the inline-edit sanitizer before document
  mutation.
- Media/source controls normalize URL-like input before persistence.
- Registry controls clamp enum/number/style values before mutation.
- Host appearance panels receive sanitized update helpers or must use the same
  sanitizer helpers before writing into the document draft.
- Public/runtime rendering remains protected by the Page v2 render pipeline;
  admin authoring modules must not introduce weaker parallel rendering paths.

Error handling:

- Unsafe URL, color, style, or embed-like input fails closed to `null`, a
  default value, or the existing invalid-control state; it must not be stored as
  raw unsafe text.
- Sanitizer failures return bounded user-safe errors or no-op mutations; they
  must not throw raw payloads into console/user-visible messages.

Regression-test shape:

- Tests cover `<script>`, event-handler attributes, `javascript:` URLs, data
  URLs where disallowed, CSS `url(javascript:)`, malformed colors, unsafe media
  URLs, unsafe template names/descriptions, unsafe tooltip/control labels, and
  inline-edit payloads.
- Tests assert no new `dangerouslySetInnerHTML` appears in extracted admin
  authoring modules.
- Tests assert safe current behavior remains safe and unchanged.

---

## Security Contract

- No new endpoints.
- No new public write paths.
- No raw HTML rendering in admin authoring modules.
- No sanitizer bypass for host appearance panels or future reusable consumers.
- No secrets or privileged settings in browser cache, localStorage, debug
  payloads, scanner artifacts, or test fixtures.
- If scanner allowlists are touched, record owner, reason, expiry, and ticket
  in `_docs/SECURITY_SPEC.md`; do not add broad suppressions for this work.

---

## Testing Requirements

- New targeted Vitest suites for authoring sanitizers and dangerous sink guards.
- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- Security scans from `_docs/SECURITY_SPEC.md` where local tools are available:
  `bun run scan:semgrep`, `bun run scan:audit`, and `bun run scan:security:strict`
  before closure.

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
- `_docs/_CHANGELOG/` on completion.
