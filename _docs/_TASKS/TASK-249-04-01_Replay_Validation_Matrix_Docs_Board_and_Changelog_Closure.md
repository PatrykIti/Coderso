# TASK-249-04-01: Replay, Validation Matrix, Docs, Board, and Changelog Closure
# FileName: TASK-249-04-01_Replay_Validation_Matrix_Docs_Board_and_Changelog_Closure.md

**Priority:** Medium
**Category:** Coderso Custom Screens + QA + Docs Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-249-03-02
**Status:** To Do

---

## Overview

Replay the final workflow end to end, capture the validation matrix, and update
the source docs and task board only after the V3 workspace cutover is proven.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_TASKS/TASK-249*.md`

## Replay Contract

Run the House Projects flow against the final implementation:

1. open `/admin/advanced/custom-screens`,
2. create or load a screen bound to House Projects,
3. confirm the builder topbar shows `Preview`, `List View`, `Editor View`, and
   `Save`,
4. confirm `List View` edits the table preview from the left-panel library and
   right-panel inspector,
5. confirm the sidebar shortcut opens the records list,
6. confirm `New record` opens the screen-owned editor,
7. confirm an existing record opens the same screen-owned editor,
8. confirm there is no `Classic editor`, `Legacy drawer`, `Open records`, or
   `Builder` residue in the active V3 flow.

## Implementation Pseudocode

```ts
const replayAssertions = [
  assertNotVisible("Open records"),
  assertNotVisible("Classic editor"),
  assertNotVisible("Legacy drawer"),
  assertVisible("List View"),
  assertVisible("Editor View"),
  assertVisible("Preview"),
  assertVisible("Save"),
];
```

```ts
const validationMatrix = {
  lint: "bun --cwd core lint",
  types: "bun --cwd core lint:types",
  gates: "bun run gates:coderso",
  vitest: [
    "tests/vitest/ui/custom-screens-page.test.tsx",
    "tests/vitest/ui/custom-screen-records.test.tsx",
    "tests/vitest/admin/custom-screen-schemas.test.ts",
    "tests/vitest/customScreens/customScreenService.test.ts",
  ],
  bun: [
    "tests/integration/routes/customScreensRoutes.test.ts",
    "tests/integration/routes/contentEntryRoutes.test.ts",
  ],
};
```

## Security Contract

- Visibility: internal admin replay plus source docs only.
- Auth model: authenticated admin session for replay.
- RBAC: replay uses only existing content permissions required by the final
  flow.
- CSRF: any replayed writes continue through the existing admin clients.
- Rate-limit bucket: unchanged current admin buckets.
- Reject-unknown validation: closure docs must match the final V3 contract and
  must not retain stale fallback prose.
- Anti-abuse: no public flow is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- targeted Vitest suites from TASK-249-01 through TASK-249-03
- targeted Bun route suites from TASK-249-01 and TASK-249-03
- Playwright replay evidence

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

## Acceptance Criteria

1. Replay confirms the final UX and the absence of legacy active-path residue.
2. Validation evidence is captured before the task family is marked done.
3. Docs, board, and changelog are synchronized with the final V3 contract.
