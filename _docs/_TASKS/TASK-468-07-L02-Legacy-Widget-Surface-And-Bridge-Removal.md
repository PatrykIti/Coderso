# TASK-468-07-L02: Legacy Widget Surface And Bridge Removal
# FileName: TASK-468-07-L02-Legacy-Widget-Surface-And-Bridge-Removal.md

**Parent Subtask:** TASK-468-07
**Priority:** High
**Category:** Custom Screens / Legacy Removal
**Estimated Effort:** Large
**Dependencies:** TASK-468-07-L01
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Remove the legacy Custom Screen widget authoring/runtime surfaces after V4
editor, runtime, assistant, and backfill verification are complete. This leaf
removes active code paths before database columns are dropped.

## Sub-Tasks

- [x] Remove `custom-screen-builder` editor usage and stale registration.
- [x] Remove `screen-field-value`, `screen-field-group`, `screen-two-column`,
  and related bridge widgets from active Custom Screen paths.
- [x] Remove widget bridge adapters from Custom Screen record runtime.
- [x] Keep any reusable generic widgets that are still used by Page/Widget
  product surfaces.
- [x] Add import/bundle tests proving legacy screen widget surfaces are gone.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/**` | Remove screen-only widget registrations or mark fully retired when safe. |
| `core/admin/ui/custom-screens/**` | Remove bridge imports and fallback paths. |
| `core/services/customScreens/**` | Remove legacy active widget mapping after V4 migration. |
| `core/services/assistant/blueprints/blueprintAdminSurfaceComposer.ts` | Remove legacy widget generation from assistant-created Custom Screens. |
| `core/services/assistant/blueprints/catalogFamilyBlueprint.ts` | Ensure catalog family screen generation no longer emits legacy widget blocks. |
| `tests/vitest/customScreens/**` | Update tests from bridge expectations to V4 runtime expectations. |
| `tests/vitest/assistant/blueprint-admin-surface-composer.test.ts` | Assert assistant blueprints emit V4 screen contracts and no retired widget ids. |
| `_docs/WIDGETS.md` | Remove retired screen widget references. |

## Implementation Pseudocode

```ts
function assertLegacyScreenWidgetsAreRetired(registry: WidgetRegistry) {
  for (const id of [
    "custom-screen-builder",
    "screen-record-header",
    "screen-field-value",
    "screen-field-group",
    "screen-two-column",
  ]) {
    expect(registry.has(id)).toBe(false);
  }
}
```

Data flow:

- V4 screen runtime remains active for editor/list/record views.
- Legacy screen widget ids may appear only in migration fixtures and retired
  docs/changelog notes.
- Assistant blueprint, planner, schema, and executor tests must assert absence
  of legacy widget ids rather than preserve old expectations.
- Generic widgets used elsewhere remain untouched.

Error handling:

- If any active screen route still imports a removed widget, tests/bundle guards
  fail before DB cleanup.
- Unsupported legacy placeholders must continue to render through V4 runtime
  until rows are repaired or accepted.

Regression-test shape:

```ts
test("screen-only widgets are not registered after V4 cutover", () => {
  const registry = loadWidgetRegistry();
  expect(registry.get("custom-screen-builder")).toBeUndefined();
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** removing legacy widget surfaces must not create
  permissive fallback payload handling.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** retired widget fixtures must not snapshot secrets or raw
  protected entry values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md` and retired per-widget docs if they exist.

## Acceptance Criteria

1. Legacy screen-only widgets are no longer active editor/runtime dependencies.
2. Generic widgets outside Custom Screens are preserved.
3. Bundle/import tests prove bridge removal before DB columns are dropped.
