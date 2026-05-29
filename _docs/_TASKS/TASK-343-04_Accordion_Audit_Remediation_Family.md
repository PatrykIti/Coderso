# TASK-343-04: Accordion Audit Remediation Family

# FileName: TASK-343-04_Accordion_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Accordion + Admin Preview + UX + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close the confirmed Accordion truthfulness drift: a misleading Wizard count that
does not own real panel count, cross-instance `<details name>` collisions
between canvas and live preview, and stale `aria-expanded` in admin preview.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_ACCORDION_WIDGET.md:154-160`
- `core/admin/ui/widgets/editors/AccordionEditors.tsx:399-520,606-1124`
- `core/widgets/core/accordion.tsx:566-799`

## Sub-Tasks

- [ ] Replace or retire the misleading Wizard count so it no longer pretends to
  change the real slot-owned render count.
- [ ] Scope single-open group names per render instance so canvas and wizard
  preview do not fight each other.
- [ ] Synchronize admin-preview `aria-expanded` with real `<details open>` state
  even when the runtime script does not execute.
- [ ] Add regression coverage for slot truthfulness and preview isolation.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Remove misleading Wizard count ownership or redirect it to truthful structure guidance. |
| `core/widgets/core/accordion.tsx` | Isolate group names per preview instance and keep ARIA state truthful in admin preview. |
| `tests/vitest/widgets/accordion.test.tsx` | Cover group-name isolation and render semantics. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Cover Wizard truthfulness and admin-preview ARIA updates. |

## Implementation Pseudocode

```ts
function resolveAccordionGroupName(blockId: string, instanceId: string) {
  return `accordion-${blockId}-${instanceId}-group`;
}

function syncAccordionAria(details: HTMLDetailsElement) {
  const trigger = details.querySelector("[data-coderso-accordion-trigger]");
  trigger?.setAttribute("aria-expanded", details.open ? "true" : "false");
}
```

Preferred UX decision:

- Wizard should stop pretending to own panel count; real structure changes must
  go through slot controls.

## Regression Test Shape

- Changing Wizard count does not silently claim ownership of render count.
- Canvas and live preview no longer close each other in single-open mode.
- Toggling admin preview details updates `aria-expanded`.

## Security Contract

No API routes are added. Schema stays strict; no raw HTML or script widening.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/accordion.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_ACCORDION_WIDGET.md`.
- Update `_docs/_WIDGETS/ACCORDION.md` if Wizard/preview ownership changes.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Accordion no longer presents two conflicting owners for item count.
- Canvas and wizard preview are isolated in single-open mode.
- Admin preview ARIA state matches visible open/closed state.

