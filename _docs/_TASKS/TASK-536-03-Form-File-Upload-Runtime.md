# TASK-536-03: Form File Upload Runtime

# FileName: TASK-536-03-Form-File-Upload-Runtime.md

**Parent Task:** TASK-536
**Priority:** Critical
**Category:** Forms Block / Public Runtime / Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-536-02
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Complete the browser contract for Form file fields. The render leaf provides a native,
accessible upload control and a named media-ID companion. The runtime leaf uploads every
selected file to the existing endpoint before submission, writes only returned IDs,
blocks navigation/submission while work is pending, releases action locks after an
ordinary failure so the same selection can retry, and keeps the final request unsent
until success. It serializes single versus multiple values in the shape already required
by Forms validation.

`core/widgets` is a legacy implementation namespace here. `form-embed`, `contact`, and
`newsletter` are existing public block/section renderers that consume this shared Forms
runtime; this subtask changes only their compatible browser behavior. It adds no
non-dashboard widget, editor control, authoring section, registry/module-pack entry, or
new block type.

## Grounded anchors

- core/widgets/core/formEmbed.tsx:1116-1161 renders an unnamed file input and a named
  hidden companion; required is currently placed only on the hidden control.
- core/widgets/core/formRuntimeScript.ts:69-117 reads named controls only.
- formRuntimeScript.ts:294-409 excludes hidden controls from native step validation.
- formRuntimeScript.ts:454-480 serializes only JSON and :597-626 submits without upload.
- core/services/forms/validation.ts:393-499 expects one owned media ID or an ordered ID
  array and rechecks required/multiple/ownership.

## Leaves

| Leaf | Scope | Source ownership |
|---|---|---|
| TASK-536-03-L01 | Accessible native control, hidden ID representation, and status DOM | formEmbed.tsx |
| TASK-536-03-L02 | Upload-before-submit state machine and payload integration | formRuntimeScript.ts |

## Hard invariants

- Raw filename/fake path and File objects never enter submission JSON or progress cache.
- A required file input participates in native validation; the hidden companion does not
  pretend to be a native required control.
- Multiple files preserve browser selection order and submit string[]; single submits a
  string. Zero files submits no stale value.
- Changing a selection invalidates prior IDs. Hidden/conditionally-disabled fields do not
  upload or submit old IDs.
- Each protected HTTP write gets its own captcha token when captcha is enabled.
- Pending uploads disable actions. Failed uploads prevent the final request, show a
  field-associated retryable error, and release action locks for retry.
- The native input, named hidden value, and status node share the exact non-empty field
  identity through `data-form-file-input`, `data-form-file-value`, and
  `data-form-file-status`; malformed or duplicate triples fail closed.
- Each event computes one registry whose hidden-input WeakMap carries the trusted
  identity/multiple shape through conditional, progress, navigation, upload, and payload
  helpers; generic serialization never infers that shape from marker membership alone.

## Security Contract

The static runtime calls existing POST /forms/:id/uploads and POST
/forms/:id/submissions only for a form whose resolved `submissionAccess` is `public`.
It sends the form-bound nonce and the currently configured captcha token; it never calls
media/admin CSRF endpoints, accepts an API key, or requests media:write. The existing
Form renderer keeps internal forms behind its noninteractive runtime boundary; internal
session/API-key writes remain a server/API-client contract owned by TASK-536-04. Server
ownership validation remains authoritative; browser state is not trusted.

## Compatibility and land order

Land L01 before L02. Existing field JSON and endpoint URLs remain unchanged. Legacy
rendered pages without the new status markers must fail safely rather than throw; the
current page release must use matching render/runtime versions. No file IDs are restored
from localStorage because ownership/liveness cannot be re-established client-side.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/widgets/formRuntimeScript.test.ts \
  tests/vitest/forms/fileField.test.ts
~~~

Browser scenarios are owned by TASK-536-05-L01.
