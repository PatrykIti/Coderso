# TASK-343-27: Tabs Audit Remediation Family

# FileName: TASK-343-27_Tabs_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Tabs + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, TASK-343-04, TASK-343-30
**Status:** To Do

---

## Overview

Close Tabs drift where the schema admits a dead `triggerOverflow=scroll` path,
Wizard tab count diverges from slot-rendered tabs, Structure removal lacks the
destructive confirmation used by Wizard, and color reset/default behavior is
inconsistent.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_TABS_WIDGET.md:172-215`
- `core/admin/ui/widgets/editors/TabsEditors.tsx`
- `core/widgets/core/tabs.tsx`

## Sub-Tasks

- [ ] Either implement `triggerOverflow=scroll` end-to-end or remove/reject the
  dead schema value with a migration-safe adapter.
- [ ] Align Wizard count ownership with slot-rendered tabs, following the
  Accordion decision from `TASK-343-04`.
- [ ] Add a consistent destructive confirmation/recovery path for Structure
  removal and Wizard count reduction; if Structure removal is owned by shared
  slot controls, coordinate the change in `BlockSettings`/`VisualPanel` instead
  of hiding it inside Tabs-only editors.
- [ ] Coordinate color default/Clear semantics with `TASK-343-30`.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | Fix count ownership, destructive confirmation, and color-state copy. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Touch if repeatable slot removal confirmation is shared slot-control behavior. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Touch if Structure removal messaging/confirmation is rendered by shared Visual slot controls. |
| `core/widgets/core/tabs.tsx` | Implement or reject `triggerOverflow=scroll` truthfully. |
| `tests/vitest/widgets/tabs.test.tsx` | Cover overflow normalization/rendering and slot-count semantics. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | Cover Wizard/Structure count and confirmation behavior. |

## Implementation Pseudocode

```ts
function normalizeTriggerOverflow(value: unknown): TabsTriggerOverflow {
  if (value === "scroll" && supportsScrollableTabs()) return "scroll";
  return "wrap";
}

function resolveTabsCountOwner(mode: "wizard" | "structure") {
  return mode === "structure" ? "slots" : "guidance_only";
}
```

`supportsScrollableTabs` and `resolveTabsCountOwner` are implementation targets,
not current helpers. If scroll support is not implemented, replace the branch
with a migration-safe reject/normalize adapter.

## Regression Test Shape

- `scroll` cannot remain a dead allowed value.
- Wizard count cannot claim to change slot-rendered tab count unless it does.
- All destructive tab-count reductions use the same confirmation policy.

## Security Contract

No API routes are added. Nested widget slot safety remains unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_TABS_WIDGET.md`.
- Update `_docs/_WIDGETS/TABS.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Tabs has no dead schema/render path for trigger overflow.
- Count ownership and destructive removal semantics are truthful.
