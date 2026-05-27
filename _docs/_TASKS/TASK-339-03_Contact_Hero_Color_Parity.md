# TASK-339-03: Contact Hero Color Parity

# FileName: TASK-339-03_Contact_Hero_Color_Parity.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Medium
**Dependencies:** TASK-339-01
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Align `contact` daily color authoring with the `hero` swatch-first contract
without widening scope into a fresh IA rewrite.

## Source Findings

- `core/.tmp/widget_audit_all.jsonl` reports `contact` already has a rich
  `Visual=8`, `Advanced=3` section split, but still exposes `3` raw daily color
  value inputs.
- `core/admin/ui/widgets/editors/ContactEditors.tsx` wraps `SharedColorControl`
  without `showValueInput={false}`.
- The section contract is already broad enough; this leaf is specifically about
  color-authoring parity, not a new section rewrite.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Switch Contact color fields to the same swatch-first daily-authoring surface used by `hero`. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Update Contact editor assertions to the swatch-first color surface. |
| `tests/vitest/widgets/contact.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/shared-color-control.test.tsx` | Keep shared color behavior aligned if the Contact slice needs additive shared coverage. |
| `_docs/_WIDGETS/CONTACT.md` | Document that Contact daily colors are swatch-first and clearable. |

## Implementation Pseudocode

```tsx
function ContactColorField(props: ...) {
  return (
    <SharedColorControl
      {...props}
      showValueInput={false}
    />
  );
}
```

Data flow:

- Keep the existing Contact sections, paths, and clear actions.
- Only the daily input shape changes.

Error handling:

- Keep saved custom/token compatibility copy.
- Do not widen Contact into raw token authoring again.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/ui/shared-color-control.test.tsx`
- Claude headless Playwright review for `contact` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/CONTACT.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Contact no longer exposes raw daily color value inputs.
- Contact keeps the current richer section IA.
- Contact color behavior matches the `hero` swatch-first daily-authoring model.
