# TASK-468-01-L01: Current State Inventory And Drift Freeze
# FileName: TASK-468-01-L01-Current-State-Inventory-And-Drift-Freeze.md

**Parent Subtask:** TASK-468-01
**Priority:** High
**Category:** Custom Screens / Architecture / Audit
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Inventory the current Custom Screens implementation before changing the
contract. This leaf freezes the real V3 behavior, known drift, and source owners
so later leaves do not rediscover or silently change scope.

## Sub-Tasks

- [ ] Map every V3 Custom Screens source owner and active legacy widget path.
- [ ] Record every admin UI entry point that reads `blocks` / `bindings`.
- [ ] Record assistant, cache, and route validation owners.
- [ ] Resolve the documented `screen-record-header` write-capability drift.
- [ ] Produce a final drift checklist consumed by TASK-468-01-L02.

## Files To Change

| File | Required change |
|---|---|
| `_docs/CMS_API.md` | Record current V3 behavior and the corrected write-capability decision. |
| `_docs/WIDGETS.md` | Mark screen widgets as legacy migration inputs. |
| `_docs/ARCHITECTURE.md` | Record current Custom Screens owners and planned V4 boundary. |
| `_docs/PAGE_MODEL.md` | Keep Page-vs-Screen boundary explicit. |
| `_docs/CMS_SPEC.md` | Record that V3 legacy screens remain until V4 migration lands. |

## Implementation Pseudocode

```ts
type CustomScreenCurrentStateInventory = {
  schemaOwners: string[];
  serviceOwners: string[];
  adminUiOwners: string[];
  assistantOwners: string[];
  legacyWidgetTypes: string[];
  writeBindingDrift: Array<{ source: string; claim: string; decision: string }>;
};

function buildInventory(): CustomScreenCurrentStateInventory {
  return {
    schemaOwners: ["core/services/customScreens/customScreenSchemas.ts"],
    serviceOwners: ["core/services/customScreens/customScreenService.ts"],
    adminUiOwners: [
      "core/admin/ui/custom-screens/CustomScreenEditorPage.tsx",
      "core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx",
    ],
    assistantOwners: ["core/services/assistant/actionExecutorService.ts"],
    legacyWidgetTypes: [
      "screen-record-header",
      "screen-field-value",
      "screen-field-group",
      "screen-two-column",
    ],
    writeBindingDrift: [],
  };
}
```

Data flow:

- Read docs and source owners.
- Record exact owner files and line-relevant decisions in docs.
- Do not change production code in this leaf.

Error handling:

- If source and docs disagree, record the disagreement and assign a decision to
  TASK-468-01-L02 instead of choosing implicitly.
- If an owner is unclear, add it to the inventory as a blocking open question.

Regression-test shape:

```ts
test("inventory lists every legacy screen widget type", () => {
  expect(inventory.legacyWidgetTypes).toEqual([
    "screen-record-header",
    "screen-field-value",
    "screen-field-group",
    "screen-two-column",
  ]);
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** no schema behavior changes in this leaf.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** inventory must not include raw entry data, cookies,
  tokens, provider keys, or storage credentials.

## Testing Requirements

- `git diff --check`
- Read-only drift audit prompt covering source/docs inventory.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/ARCHITECTURE.md`
- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md`

## Acceptance Criteria

1. Current V3 owners and legacy paths are documented.
2. Write-capability drift is assigned to an explicit V4 decision.
3. Page v2 remains out of scope for direct Custom Screen storage.
4. TASK-468-01-L02 can freeze the V4 contract from this inventory.
