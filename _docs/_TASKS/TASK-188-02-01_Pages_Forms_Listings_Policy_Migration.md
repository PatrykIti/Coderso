# TASK-188-02-01: Pages Forms Listings Policy Migration
# FileName: TASK-188-02-01_Pages_Forms_Listings_Policy_Migration.md

**Priority:** High
**Category:** Assistant/Core + Policy Migration
**Estimated Effort:** Medium
**Dependencies:** TASK-188-01, TASK-188-02
**Status:** To Do

---

## Overview

Move Pages, Forms, Listing Query, and Listing Template policy data into `assistantOperationPolicy`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/operationPolicy/cmsResourcePolicies.ts`
- `tests/vitest/assistant/operation-policy-coverage.test.ts`
- `tests/vitest/assistant/operation-policy-resolver.test.ts`

## Policy Entries

- `page`
  - aliases: `page`, `pages`, `strona`, `strony`
  - filters: `status`
  - fields: `title`, `slug`, `status`, `settings.showInNav`
  - actions: `page.upsert`, `page.update`, `page.delete`, `page.widget.patch`
- `form`
  - aliases: `form`, `forms`, `formularz`, `formularze`
  - filters: `status`, `visibility/submissionAccess`
  - fields: `name`, `slug`, `status`, `submissionAccess`
  - actions: `form.upsert`, `form.update`, `form.archive`, `form.delete`, `form.automation.upsert`
- `listing-query`
  - aliases: `listing query`, `query listingu`
  - fields: `name`, `limit`, `includeDrafts`, `filters`
  - actions: `listing-query.upsert`, `listing-query.update`, `listing-query.delete`, `listing-query.filters.patch`
- `listing-template`
  - aliases: `listing template`, `szablon listingu`
  - fields: `name`, `slug`, `layout`, `card`
  - actions: `listing-template.upsert`, `listing-template.update`, `listing-template.delete`, `listing-template.card.patch`

## Pseudocode

```ts
export const pagePolicy = resourcePolicy({
  kind: "page",
  aliases: [...],
  filters: { status: statusFilterPolicy(...) },
  fields: {
    title: fieldPolicy({ aliases: ["title", "tytuł"], action: pageUpdate("title") }),
  },
  destructive: filteredAllDeletePolicy,
});
```

## Testing Requirements

- Policy coverage includes all listed actions.
- Alias/filter/field lookups pass for Polish and English terms.
- Existing page/form/listing resolver/mapper tests remain green.

## Security Contract

- Visibility: internal policy data.
- Auth model: no runtime change.
- RBAC: content/forms permissions reflected but not enforced here.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: unknown fields/actions rejected by policy schema.
- Anti-abuse: destructive delete defaults deny unless filtered/exact/reviewed.
- Secret handling: form submissions remain excluded from policy/provider context.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- changelog on completion
