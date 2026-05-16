# TASK-264-05: Divider Runtime DOM Marker Hygiene

# FileName: TASK-264-05_Divider_Runtime_DOM_Marker_Hygiene.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Security Hygiene
**Estimated Effort:** Small
**Dependencies:** TASK-256-05-03, TASK-264
**Status:** To Do

---

## Overview

Clean up Divider runtime data markers from
`_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` row R3.

The current renderer exposes raw style values such as
`data-divider-color="var(--color-border)"`. The report classifies this as a
DOM tech leak. This leaf decides and implements the Divider-local marker policy
without changing shared widget analytics or testing markers.

## Scope Boundary

This leaf does not remove deterministic markers that tests, QA, or runtime
diagnostics legitimately use. It removes or sanitizes only raw style-token
markers that expose implementation details without user value.

Shared separator semantics remain TASK-256-05-03. This leaf should run after
that baseline so DOM evidence is collected once.

## Sub-Tasks

- [ ] Inventory current `data-divider-*` markers in `DividerBlock`.
- [ ] Classify each marker as required QA marker, useful resolved marker, or raw
  style leak.
- [ ] Remove raw style-value markers or replace them with bounded categories
  such as `data-divider-color-kind="token|hex|custom"`.
- [ ] Keep stable markers for variant, thickness, width mode, margins, and
  label presence unless tests/docs prove they are unnecessary.
- [ ] Update SSR tests and report evidence with the final marker policy.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/divider.tsx` | Remove or sanitize raw color/style data markers while preserving useful deterministic QA markers. |
| `tests/vitest/widgets/divider.test.tsx` | Add assertions that raw CSS variable values are not emitted in data attributes and required QA markers remain. |
| `_docs/_WIDGETS/DIVIDER.md` | Document final runtime marker contract. |
| `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` | Mark R3 as fixed/deferred with DOM evidence after validation. |

## Implementation Pseudocode

```ts
function resolveDividerColorMarker(value: string | undefined) {
  if (!value) return "default";
  if (value.startsWith("var(")) return "token";
  if (hexColorPattern.test(value)) return "hex";
  return "custom";
}

function getDividerDataAttributes(normalized: DividerData) {
  return {
    "data-divider": "true",
    "data-divider-variant": resolvedVariant,
    "data-divider-color-kind": resolveDividerColorMarker(normalized.color),
  };
}
```

Error handling:

- Do not expose raw user-authored style strings in data attributes.
- Keep visible style output unchanged; only metadata changes.
- If downstream tests rely on `data-divider-color`, update them to assert the
  visible style or sanitized marker instead of keeping the raw marker.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless a previous TASK-264 leaf changes
  schema.
- Anti-abuse: data attributes must not expose raw untrusted style strings,
  scripts, privileged tokens, or secrets.
- Secret handling: no secrets in Divider DOM markers, diagnostics, reports, or
  changelog entries.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx` only if
  editor diagnostics copy changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/DIVIDER.md`.
- Update `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` row R3 after validation.

## Changelog Policy

- Covered by the TASK-264 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Public Divider DOM no longer exposes raw CSS variable or custom color values
  through `data-divider-*` attributes.
- Existing visible rendering and useful QA markers remain stable.
- Runtime tests cover the final marker policy.
