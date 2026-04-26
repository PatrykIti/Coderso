# TASK-213-04-01: Template Save Toasts and Primary CTA
# FileName: TASK-213-04-01_Template_Save_Toasts_and_Primary_CTA.md

**Priority:** Medium
**Category:** Widget Templates + Admin/UI + Notifications
**Estimated Effort:** Medium
**Dependencies:** TASK-213-04, TASK-174-03-03, TASK-208
**Status:** Done (2026-04-26)

---

## Overview

Fix the feedback and creation-entry parts of `BUG-3` and `BUG-6` from the
Widget Library report.

Business outcome: editors should know when a template create/update actually
saved, and they should see one obvious Templates-tab creation action without
searching around filters.

Technical contract: keep save/create mutations in the existing template editor
and list shell seams. Use the shared Admin UI action-toast path from `TASK-208`
and `TASK-211-02`; do not add a second toast host or a template-only feedback
system. Row cleanup actions and duplicate/name guards are owned by
`TASK-213-04-03` and `TASK-213-04-04`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/services/widgetTemplatesClient.ts`
- `tests/vitest/ui/widget-template-editor.test.tsx`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`

## Implementation Direction

Use the existing template editor save handlers and the Widget Library Templates
tab header. Add a small toast adapter only if it is reused by both create and
update paths; otherwise call the shared action-toast helper directly.

Pseudocode:

```ts
async function handleSave() {
  const action = isNew ? "create" : "update";
  try {
    const saved = await saveTemplate(input);
    widgetTemplateToasts.success(action, saved.name);
    if (isNew) navigate(templateEditHref(saved.id));
  } catch (error) {
    widgetTemplateToasts.error(action, error);
    setError(resolveWidgetTemplateError(error));
  }
}
```

Templates-tab CTA:

```tsx
<Button variant="default" asChild>
  <AdminLink href={templateCreateHref}>
    <Plus className="h-4 w-4" />
    New Template
  </AdminLink>
</Button>
```

Keep the CTA in the list header/action area, not hidden inside the category
filter cluster.

Error handling must remain bounded. Use machine-readable errors already exposed
by the template API where available, but do not broaden this leaf into new route
contracts.

## Security Contract

- Endpoint visibility: existing internal admin template routes only; no public
  write endpoint is introduced.
- Auth model: existing admin session or internal API-key scope. Public
  nonce/HMAC/reCAPTCHA hardening is not applicable because this remains an
  internal admin write flow.
- RBAC: `widgets:read` for list/edit and `widgets:write` for create/update.
- CSRF: all writes keep CSRF.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation:
  - create/update payloads keep strict route schemas in
    `core/server/validation/widgetSchemas.ts`;
  - route modules stay orchestration-only if existing error mapping needs a
    bounded display helper.
- Anti-abuse:
  - toasts do not include raw blocks/settings payloads;
  - error copy must not expose stack traces, SQL, auth headers, or private
    settings values.

## Testing Requirements

- `tests/vitest/ui/widget-template-editor.test.tsx`
  - create/update success and error toasts;
  - create navigation does not happen before the save promise resolves.
- `tests/vitest/ui/widget-library.test.tsx`
  - `New Template` appears as the primary Templates-tab action;
  - the CTA remains visible with category filters/search present.
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
  - cache update or invalidation after create/update if client behavior changes.
- Manual Playwright:
  - create a new template and verify the success toast plus edit route;
  - update an existing template and verify the save toast remains visible.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-template-editor.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache behavior changes

## Acceptance Criteria

1. Template create/update emits visible shared feedback.
2. `New Template` is exposed as the clear primary creation action.
3. Save failure copy is bounded and does not claim success.
4. Tests cover awaited success/error feedback and CTA placement.
