# TASK-555-04-L03: Reviewed Apply Result and Open Site Components
# FileName: TASK-555-04-L03-Reviewed-Apply-Result-And-Open-Site-Components.md

**Parent Subtask:** TASK-555-04
**Priority:** High
**Category:** Admin UI / Reviewed Mutation / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-04-L02 receipt

---

## Overview

Build the reviewed takeover, apply-result, warning, and safe Open-site UI without
owning host state or transport.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Complete host-neutral reviewed mutation components. Sole writer:
`core/admin/ui/kits/curated/CuratedStarterTakeoverDialog.tsx`,
`CuratedStarterApplyResult.tsx`, `CuratedStarterActions.tsx`, and
`tests/vitest/ui-integration/curated-starter-reviewed-apply.test.tsx`.

## Forbidden Paths

Solution Kits/Setup hosts, TASK-489 UI, clients/server/DB/artifacts, all named forbidden
families, indexes/changelogs/workflows/smokes/root/TMP files.
The terminal TASK-545/TASK-548 files and tracked TASK-555 workflow are read-only.

## Security Contract

Internal callbacks only. UI permission gating is defense in depth. `ConfirmActionDialog`
is mandatory; no `window.confirm`. Host/client owns CSRF/admin_write. Accept only strict
preview/apply DTOs and validated same-origin relative public paths. Never persist or
display raw idempotency keys, claims, package/snapshots, actors, or settings payloads.

## Implementation Pseudocode

```tsx
<ConfirmActionDialog
  title="Install curated starter"
  requireTypedValue={detail.title}
  onConfirm={() => onApply({ previewId: preview.previewId, confirmSettingsTakeover: true })}
/>
```

Current preview -> explicit takeover review -> host callback -> committed result ->
effective settings/warnings/validation/Open site. A stale/failed response keeps review
state and exposes retry; success disables duplicate submit. Invalid public paths omit
Open site and show a safe error.

## Error Handling

Stale/conflict failures retain review state; committed warning results remain success;
unsafe public paths suppress navigation and show bounded copy.

## Testing Requirements

Test permission gating, preview required, takeover confirmation, focus return,
in-flight disable, stale/retry, committed warnings, effective settings, safe Open site,
provider-offline copy, and no browser persistence.

```bash
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/curated-starter-reviewed-apply.test.tsx
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/ui/kits/curated/*.ts* tests/vitest/ui-integration/curated-starter-reviewed-apply.test.tsx
```

All touched files <=1000 lines.

## Documentation Updates Required

TASK-555-07-L01 owns the documentation handoff before smoke; L03 is closure metadata
only.
