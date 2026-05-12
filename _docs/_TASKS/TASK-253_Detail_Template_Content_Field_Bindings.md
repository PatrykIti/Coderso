# TASK-253: Detail Template Content Field Bindings

# FileName: TASK-253_Detail_Template_Content_Field_Bindings.md

**Priority:** High
**Category:** CMS Content + Admin UI + Runtime + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-190 detail pages, TASK-252 widget inspector IA
**Status:** Done
**Started:** 2026-05-12
**Completed:** 2026-05-12

---

## Overview

Detail template editing must let admins bind selected widget props to fields from
the detail template content type. Static widget text remains useful as default
preview and fallback content, but it must not be the only persisted value when
the public detail page should render entry-specific content.

This task is scoped to detail templates only. Ordinary Pages keep literal widget
content until a separate page-binding contract is designed.

## Sub-Tasks

- Add a Data panel to the detail template editor for the currently selected
  block.
- Persist edits through the existing `DetailPageDocument.bindings` array.
- Preserve block `data` as fallback/default content.
- Reuse the existing public detail-page resolver contract instead of creating a
  new binding runtime.
- Prune bindings when their target block is deleted.

## Files Changed

- `core/admin/ui/content-types/DetailTemplateBindingPanel.tsx`
- `core/admin/ui/content-types/DetailTemplateEditorPage.tsx`
- `core/admin/ui/content-types/detailTemplateEditorModel.ts`
- `core/services/utils/bindingPropPaths.ts`
- `core/services/customScreens/bindingResolver.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `tests/vitest/ui/detail-template-editor.test.tsx`
- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/842-2026-05-12-detail-template-field-bindings.md`
- `_docs/_CHANGELOG/README.md`

## Implementation Pseudocode

```tsx
function DetailTemplateBindingPanel(props) {
  const blockBindings = props.bindings.filter(
    (binding) => binding.blockId === props.selectedBlock.id
  );

  return blockBindings.map((binding) => (
    <BindingRow
      propPath={binding.propPath}
      source={binding.source}
      transform={binding.transform}
      fallback={binding.fallback}
      required={binding.required}
      onChange={(next) => props.onChange(updateBinding(props.bindings, next))}
    />
  ));
}

function buildCurrentDocument() {
  return buildDetailTemplateDocumentUpdate(record, {
    name,
    titlePattern,
    blocks,
    bindings,
  });
}
```

Implementation notes:

- Source options are schema-first and include entry fields, safe entry meta, and
  existing computed detail-page sources.
- Secret-like field names are not advertised in the admin binding source list.
- `DetailTemplateEditorPage` passes binding state into widget editors through the
  existing `WidgetEditorContext`, so binding-aware widget controls can jump to
  the Data tab.
- No API route, permission, CSRF, rate-limit, nonce, or public write behavior is
  added by this task.

## Security Contract

- Visibility: internal admin UI editing only; rendered output remains public
  detail-page runtime output.
- Auth model: unchanged authenticated admin detail-page save flow.
- RBAC: unchanged `content:write` detail-page permissions.
- CSRF: unchanged admin write CSRF enforcement on `/detail-pages/:id`.
- Rate-limit bucket: unchanged admin detail-page write bucket.
- Reject-unknown validation: unchanged `DetailPageDocument` normalizer remains
  authoritative for binding ids, block ids, prop paths, sources, transforms, and
  fallback shape.
- Anti-abuse: no public write endpoint is introduced; nonce, HMAC, and reCAPTCHA
  are not applicable to this internal editor-only change.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/ui/custom-screen-binding-panel.test.tsx tests/vitest/assistant/blueprint-detail-page-fixtures.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- `bun run precommit`

## Validation Evidence

- `bun run test:vitest -- tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/ui/custom-screen-binding-panel.test.tsx tests/vitest/assistant/blueprint-detail-page-fixtures.test.ts` - passed, 3 files / 22 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun run scan:security:strict` - passed after rerun outside sandbox; the sandboxed attempt failed on Semgrep trust-store and Bun audit connectivity, not on findings.
- `bun run precommit` - passed.
- `git diff --check` - passed.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/842-2026-05-12-detail-template-field-bindings.md`

## Acceptance Criteria

- Detail template selected blocks expose editable content field bindings.
- Saving a draft includes `bindings` and keeps block fallback data intact.
- Deleting a block removes stale bindings for that block.
- Runtime uses the existing detail-page binding resolver with no new endpoint.
- Task board and changelog are synchronized.
