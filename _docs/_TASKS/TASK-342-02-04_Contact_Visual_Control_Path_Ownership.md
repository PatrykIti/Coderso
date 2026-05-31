# TASK-342-02-04: Contact Visual Control Path Ownership

# FileName: TASK-342-02-04_Contact_Visual_Control_Path_Ownership.md

**Priority:** High
**Category:** Widgets + Admin UI + Playwright + QA
**Estimated Effort:** Small
**Dependencies:** TASK-342-01, TASK-342-02
**Status:** Done (2026-05-28)

---

## Overview

Repair the `contact` metadata-gap by making the flagged Visual surface and
button style controls emit truthful persisted-path ownership metadata without
changing the current Contact UX.

## Source Findings

- `_docs/PLAYWRIGHT/27-05-2026/REPORT_CONTACT_WIDGET.md`
- `core/admin/ui/widgets/editors/ContactEditors.tsx`
- `tests/vitest/ui/contact-editor-wave.test.tsx`
- `tests/vitest/widgets/contact.test.tsx`

Current local evidence:

- Public runtime passes.
- Visual and Advanced render correctly.
- The metadata-gap is limited to the `contact.visual.surface-styling` section.

Flagged persisted fields:

- `style.background`
- `style.surfaceColor`
- `style.borderColor`
- `style.textColor`
- `style.mutedTextColor`
- `style.buttonBackgroundColor`
- `style.buttonTextColor`
- `style.buttonBorderColor`
- `style.borderWidth`
- `style.panelRadius`
- `style.buttonRadius`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add truthful `path` ownership to the flagged Visual controls or migrate them to a shared path-aware color/control seam. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Touch only if Contact is migrated to the shared path-aware color-control seam. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Touch only if a shared swatch-summary helper needs a small extension. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Add a strict assertion that the flagged Visual controls now expose persisted paths. |
| `tests/vitest/widgets/contact.test.tsx` | Extend only if contract-visible behavior changes. |

## Implementation Pseudocode

```ts
function ContactColorField({
  id,
  path,
  label,
  ...
}: {
  id: string;
  path: string;
  ...
}) {
  return <WidgetControlRow id={id} path={path} label={label} actions={...}>{...}</WidgetControlRow>;
}

path="style.background"
path="style.surfaceColor"
path="style.borderColor"
path="style.textColor"
path="style.mutedTextColor"
path="style.buttonBackgroundColor"
path="style.buttonTextColor"
path="style.buttonBorderColor"
path="style.borderWidth"
path="style.panelRadius"
path="style.buttonRadius"

test("contact visual controls expose persisted widget paths", async () => {
  const controls = collectWritableControls("contact", "visual");
  expect(controls).toContainEqual({ id: "contact.style.background", path: "style.background" });
  expect(controls).toContainEqual({ id: "contact.style.panelRadius", path: "style.panelRadius" });
  expect(controls).toContainEqual({ id: "contact.style.buttonRadius", path: "style.buttonRadius" });
});
```

Data flow:

- Keep the current Contact schema and runtime behavior unchanged.
- Repair only the persisted-path metadata exposed by the Visual controls.

Error handling:

- Preserve the current theme-default/transparent disabled-state behavior.
- Do not turn the Visual controls into read-only diagnostics to satisfy the
  smoke harness.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- targeted `playwright-cli` replay or single-widget smoke proving
  `contact` no longer reports `metadata-gap`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/27-05-2026/REPORT_CONTACT_WIDGET.md` when the
  metadata-gap is closed or superseded.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- `contact` no longer reports `metadata-gap` in the targeted rerun.
- The flagged Visual controls expose truthful persisted paths.
- Existing Contact editor behavior remains intact.

## Completion Notes (2026-05-28)

- `ContactEditors.tsx` now emits truthful persisted paths for the flagged
  surface-styling controls.
- Targeted validation passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
  - `bun scripts/playwright-widget-contract-smoke.ts --session task-342-02-contact --widget contact --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-02-contact.json --output-md .tmp/task-342-02-contact.md --strict`
