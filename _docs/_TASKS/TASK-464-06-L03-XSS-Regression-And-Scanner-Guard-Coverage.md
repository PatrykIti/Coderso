# TASK-464-06-L03: XSS Regression And Scanner Guard Coverage
# FileName: TASK-464-06-L03-XSS-Regression-And-Scanner-Guard-Coverage.md

**Parent Subtask:** TASK-464-06
**Priority:** High
**Category:** Pages / Admin UI / Security Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-464-06-L02
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Add XSS regression coverage and scanner-friendly dangerous-sink guards for the
extracted Page Editor authoring modules.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [x] Add tests for script tags and event handler payloads.
- [x] Add tests for `javascript:` and disallowed data URL payloads.
- [x] Add tests for CSS/style payloads such as `url(javascript:)`.
- [x] Add tests for unsafe template names/descriptions and control labels.
- [x] Add dangerous-sink tests for extracted admin authoring modules.
- [x] Run local security scans where tooling is available.
- [x] Run local CodeQL CLI when available; otherwise record that GitHub code
      scanning/CodeQL is the final confirmation gate.

---

## Implementation Pseudocode

```ts
const xssPayloads = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "javascript:alert(1)",
  "url(javascript:alert(1))"
];

test.each(xssPayloads)("authoring input is sanitized: %s", (payload) => {
  const view = renderPageEditorWithPayload(payload);
  expect(view.container.querySelector("script")).toBeNull();
  expect(view.container.innerHTML).not.toContain("onerror=");
  expect(view.container.innerHTML).not.toContain("javascript:");
});
```

Expected data flow:

- Tests exercise mutation and render-adjacent boundaries.
- Scanner run output is recorded in task closeout/changelog.

Error handling:

- If scanner tooling is unavailable locally, record the skipped command and
  leave CI as the remaining gate.
- If local CodeQL CLI is unavailable, record that GitHub code scanning/CodeQL
  remains the required final confirmation for the TASK-463/TASK-464 security
  class.

Regression-test shape:

- Tests cover editor canvas, floating panel controls, command palette,
  template picker, and host appearance paths where applicable.

---

## Security Contract

- Do not add scanner suppressions unless absolutely necessary; any suppression
  needs owner, reason, expiry, and ticket in `_docs/SECURITY_SPEC.md`.
- No secrets in fixtures or scanner artifacts.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx tests/vitest/pages/page-authoring-sanitizers.test.ts`
- `bun run scan:semgrep`
- `bun run scan:audit`
- `bun run scan:security:strict` where local tooling is available.
- Local CodeQL CLI for the Pages/Admin UI query pack where available; otherwise
  GitHub code scanning/CodeQL final confirmation is required before closure.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` if scanner policy changes.
- `_docs/_TASKS/TASK-464*.md`
