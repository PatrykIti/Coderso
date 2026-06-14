# TASK-464-06-L03: XSS Regression And Scanner Guard Coverage
# FileName: TASK-464-06-L03-XSS-Regression-And-Scanner-Guard-Coverage.md

**Parent Subtask:** TASK-464-06
**Priority:** High
**Category:** Pages / Admin UI / Security Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-464-06-L02
**Status:** ⏳ To Do

---

## Overview

Add XSS regression coverage and scanner-friendly dangerous-sink guards for the
extracted Page Editor authoring modules.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Add tests for script tags and event handler payloads.
- [ ] Add tests for `javascript:` and disallowed data URL payloads.
- [ ] Add tests for CSS/style payloads such as `url(javascript:)`.
- [ ] Add tests for unsafe template names/descriptions and control labels.
- [ ] Add dangerous-sink tests for extracted admin authoring modules.
- [ ] Run local security scans where tooling is available.

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

- New XSS-focused Vitest suites.
- `bun run scan:semgrep`
- `bun run scan:audit`
- `bun run scan:security:strict` where local tooling is available.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` if scanner policy changes.
- `_docs/_TASKS/TASK-464*.md`
