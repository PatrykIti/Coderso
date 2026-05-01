# 783 - TASK-248 custom screens runtime contract follow-up

**Date:** 2026-05-01
**Version:** Unreleased
**Tasks:** TASK-248, TASK-248-01-02, TASK-248-02-02, TASK-248-03-02, TASK-248-03-03

## Key Changes

### Custom Screens Runtime

- Closed the `Editor View` contract gap so Custom Screen record routes only act
  as writable editors when the screen has writable bindings; collection-only
  and dashboard screens stay read-only and fall back to the classic entry flow.
- Wired the records page to persisted `List View` runtime state for search,
  enabled filters, default sort, and bulk actions instead of treating
  `definition.listView` as display-only data.
- Added bulk publish, move-to-draft, and delete actions for Custom Screen
  records while keeping the existing entry client/cache contracts.

### Admin Error Feedback

- Propagated field-aware domain error details for slug, media, and relation
  failures through content-entry route mapping.
- Mapped Custom Screen `Editor View` save failures to inline field feedback so
  schema validation and field-specific API errors no longer collapse into a
  generic banner.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun test tests/integration/routes/contentEntriesRoutes.test.ts` - passed.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screen-list-view.test.ts tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/customScreens/customScreenService.test.ts tests/vitest/ui/custom-screen-route-params.test.ts` - passed.
