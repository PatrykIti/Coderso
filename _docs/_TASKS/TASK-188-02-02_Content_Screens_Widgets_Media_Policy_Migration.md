# TASK-188-02-02: Content Screens Widgets Media Policy Migration
# FileName: TASK-188-02-02_Content_Screens_Widgets_Media_Policy_Migration.md

**Priority:** High
**Category:** Assistant/Core + Policy Migration
**Estimated Effort:** Medium
**Dependencies:** TASK-188-01, TASK-188-02
**Status:** Done (2026-04-19)

---

## Overview

Move Content Types, Entries, Custom Screens, Widget Templates, and Media Reference policy data into `assistantOperationPolicy`.

## Sub-Tasks

No child task files.

## Policy Entries

- `content-type`
  - actions: `content-type.upsert`, `content-type.delete`
  - destructive: delete allowed only when `entryCount=0`
- `entry`
  - actions: `entry.upsert-draft`, `entry.update`, `entry.delete`, `media.reference.attach`
  - active-context targeting required for update/delete unless later catalog entries are added
- `custom-screen`
  - status mapping: `published/opublikowane -> active`
  - fields/actions: metadata, sidebar, widget patch
- `widget-template`
  - fields/actions: metadata/settings, block patch, delete
  - ambiguity policy: page-instance vs reusable-template target
- `media`
  - read-only inspection,
  - upload is gated,
  - existing media reference attach is executable for entry targets only

## Files to Change

- `core/services/assistant/operationPolicy/cmsResourcePolicies.ts`
- `tests/vitest/assistant/operation-policy-coverage.test.ts`

## Pseudocode

```ts
entry: {
  targetPolicy: { activeContextKinds: ["entry", "custom-screen-entry"] },
  actions: {
    update: entryUpdateMapping,
    delete: entryDeleteMapping,
    attachMedia: mediaReferenceAttachMapping,
  },
}
```

## Security Contract

- Visibility: internal policy data.
- RBAC: content/widgets/media permissions reflected.
- Reject-unknown validation: no raw upload action.
- Anti-abuse: media upload stays gated; entry ids remain advisory until re-resolved.
- Secret handling: no entry raw values or media signed URLs in provider guidance.

## Testing Requirements

- Policy coverage for all listed actions.
- Media upload prompt remains gated.
- Active widget template block patch policy exists.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if widget pack coverage changes
- changelog on completion

## Completion Notes (2026-04-19)

- Added operation policy entries for `content-type`, `entry`, `custom-screen`, `widget-template`, and `media`.
- Added policy coverage for content type upsert/delete, entry draft/update/delete/media attach, custom screen metadata/widget actions, widget template metadata/block actions, and media reference/upload gating.
- Extended `assistantOperationPolicy` aggregate with the new resource policies.
- Added Vitest coverage for actions, aliases, status mappings, media upload gating, widget block patch policy, and secret redaction flags.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/operation-policy-schema.test.ts tests/vitest/assistant/operation-policy-lookup.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
