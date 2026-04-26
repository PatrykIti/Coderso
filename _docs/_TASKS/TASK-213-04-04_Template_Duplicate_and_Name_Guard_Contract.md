# TASK-213-04-04: Template Duplicate and Name Guard Contract
# FileName: TASK-213-04-04_Template_Duplicate_and_Name_Guard_Contract.md

**Priority:** Medium
**Category:** Widget Templates + Domain/API + Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-213-04
**Status:** To Do

---

## Overview

Fix the duplicate-name contract behind `UX-6` and the duplicate action required
by `BUG-4`.

Business outcome: editors can duplicate reusable templates safely, and the list
does not accumulate indistinguishable `test`, `test1`, and duplicate-name rows
without an intentional contract.

Technical contract: duplicate/name handling belongs in
`widgetTemplateService.ts` and route error mapping, not in React components.
Routes remain orchestration-only: validate, authorize, delegate, map known
errors. If the implementation chooses a DB uniqueness constraint instead of a
service-level suffix/reject policy, include the full migration artifacts
required by `AGENTS.md`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/widgets/widgetTemplateService.ts`
- `core/server/routes/widgetTemplateRoutes.ts`
- `core/server/validation/widgetSchemas.ts`
- `core/admin/services/widgetTemplatesClient.ts`
- `tests/unit/widgets/widgetTemplateService.test.ts`
- `tests/integration/routes/widgetTemplates.test.ts`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- DB migration files only if a persistence-level uniqueness constraint is added:
  - `core/db/migrations/*.sql`
  - `core/db/migrations/meta/*_snapshot.json`
  - `core/db/migrations/meta/_journal.json`

## Implementation Direction

Choose one explicit name policy and test it:

1. Reject create/update conflicts with `widget_template_name_conflict`; or
2. For duplicate only, generate a visible unique suffix such as `Template copy`
   / `Template copy 2`.

Pseudocode:

```ts
async function assertTemplateNameAvailable(name: string, exceptId?: string) {
  const normalizedName = normalizeTemplateName(name);
  const templates = await listWidgetTemplates();
  const conflict = templates.find(
    (item) =>
      item.id !== exceptId &&
      normalizeTemplateName(item.name) === normalizedName
  );
  if (conflict) {
    throw new WidgetTemplateError("widget_template_name_conflict");
  }
}

async function duplicateWidgetTemplate(id: string) {
  const source = await getWidgetTemplate(id);
  const nextName = await buildAvailableCopyName(source.name);
  return createWidgetTemplate({
    ...source,
    id: undefined,
    name: nextName,
    status: "draft",
    revisionId: undefined,
    previewToken: undefined,
  });
}
```

Route mapping:

```ts
try {
  return json(await duplicateWidgetTemplate(params.id));
} catch (error) {
  throw mapWidgetTemplateError(error);
}
```

Do not let callers provide arbitrary copied blocks/settings for duplicate. The
server should load the source template and decide exactly which fields are safe
to copy.

## Security Contract

- Endpoint visibility: internal admin routes only; no public write endpoint.
- Auth model: existing admin session or internal API-key scope.
- RBAC: `widgets:write` for duplicate/create/update.
- CSRF: duplicate/create/update writes keep CSRF.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation:
  - duplicate route accepts only the current template id and optional strict
    fields if the route already supports them;
  - name conflicts map to `widget_template_name_conflict` or an equivalent
    known machine-readable code through `mapWidgetTemplateError`.
- Anti-abuse:
  - duplicate re-checks source identity and current permissions server-side;
  - duplicate does not copy volatile revision/runtime preview tokens;
  - errors and toasts do not expose raw blocks/settings payloads.

## Testing Requirements

- `tests/unit/widgets/widgetTemplateService.test.ts`
  - create/update conflict handling;
  - duplicate suffix/rejection policy;
  - duplicate copies only allowed template fields.
- `tests/integration/routes/widgetTemplates.test.ts`
  - duplicate route registration is internal-admin scoped if a route is added;
  - `mapWidgetTemplateError` covers name conflict, not found, invalid payload,
    and duplicate conflict cases;
  - duplicate/create/update require auth/RBAC/CSRF.
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
  - client duplicate helper normalizes response and updates/invalidates cache.
- Manual Playwright:
  - duplicate a template with an existing copy and verify the resulting name is
    intentional and visible.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/CMS_API.md` if route payloads/errors change
- `docs/coderso/widget-template-editor.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if client cache behavior
  changes

## Acceptance Criteria

1. Duplicate behavior is service-owned and tested.
2. Duplicate-name conflicts are rejected or resolved by an explicit policy.
3. Route errors are machine-readable and mapped at the route boundary.
4. No duplicate route accepts caller-supplied raw copied payloads.
