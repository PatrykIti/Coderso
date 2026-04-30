# TASK-248-04-02: Playwright Replay, Docs, Changelog, and Board Closure
# FileName: TASK-248-04-02_Playwright_Replay_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Coderso Custom Screens + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-248-03-03, TASK-248-04-01
**Status:** To Do

---

## Overview

Close the Custom Screens Workspace Builder V2 family with replay evidence,
source-of-truth docs updates, changelog entry, and task board synchronization.

This leaf must not introduce new product behavior. If replay finds a product or
security regression, open or update the owning implementation leaf before
closing the family.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-SCREENS-2026-04-30.md` or a dated V2 follow-up
  summary.
- `_docs/CMS_API.md`
- `_docs/CONTENT_TYPES_SPEC.md` if schema defaults were formalized.
- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*` docs for admin-scoped widgets.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache contracts
  changed.
- `_docs/_TASKS/TASK-248*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`

## Replay Contract

Run the replay after TASK-248-01-01 through TASK-248-04-01 are implemented:

1. Open `/admin/advanced/engine`.
2. Create or reuse a House Projects content type with required fields:
   `title`, `summary`, `areaM2`, `rooms`, `bathrooms`, `floors`,
   `priceFrom`, `location`, `projectStatus`, `featured`.
3. Open `/admin/advanced/custom-screens`.
4. Create a Custom Screen for that content type.
5. Configure `List View`:
   - columns for title, location, area, rooms, price, status,
   - default sort by updated date descending,
   - status filter when the schema has `projectStatus`,
   - row click to `Editor View`,
   - create mode to `Editor View`.
6. Configure `Editor View`:
   - header/summary section,
   - project basics group,
   - pricing/location group,
   - status/featured controls.
7. Save and activate the screen.
8. Open the screen from admin navigation.
9. Add a new house project through `Editor View` create mode.
10. Edit `areaM2` and `location` for an existing project.
11. Reload and verify the list columns show saved values.
12. Check browser console and network for:
    - no `entry_validation_failed` for valid create,
    - no `Invalid widget data` messages,
    - no unexpected 500 responses.

## Implementation Pseudocode

```ts
async function closeTask248WorkspaceBuilder() {
  const replay = await runHouseProjectsWorkspaceReplay();
  if (!replay.success) {
    throw new Error("task_248_replay_blocked");
  }

  updateSourceDocs({
    api: replay.apiContractChanges,
    cache: replay.cacheContractChanges,
    widgets: replay.widgetContractChanges,
    playwrightSummary: replay.evidencePath,
  });

  updateTaskStatuses({
    taskIds: [
      "TASK-248",
      "TASK-248-01",
      "TASK-248-01-01",
      "TASK-248-01-02",
      "TASK-248-02",
      "TASK-248-02-01",
      "TASK-248-02-02",
      "TASK-248-03",
      "TASK-248-03-01",
      "TASK-248-03-02",
      "TASK-248-03-03",
      "TASK-248-04",
      "TASK-248-04-01",
      "TASK-248-04-02",
    ],
    status: "Done",
    completedAt: "YYYY-MM-DD",
  });

  updateTaskBoardCounts();
  addChangelogEntry({ taskId: "TASK-248", evidence: replay.validation });
}
```

If any validation command is skipped, record the exact command, reason, and
replacement targeted suite in both the replay summary and changelog entry.

## Closure Checklist

```md
- [ ] Task statuses updated to Done with completion date.
- [ ] `_docs/_TASKS/README.md` rows moved to Done and counts updated.
- [ ] Changelog entry added with validation evidence.
- [ ] `_docs/_CHANGELOG/README.md` index updated.
- [ ] Source-of-truth docs updated for API/cache/widget behavior.
- [ ] Playwright replay summary includes screenshots, network findings, and any
      skipped checks with reasons.
```

## Security Contract

- Visibility: internal admin UI validation and docs only.
- Auth model: replay uses authenticated admin session.
- RBAC:
  - screen writes require `content:write`,
  - entry reads require `content:read`,
  - entry writes require `content:write`,
  - publish/unpublish requires `content:publish` if exercised.
- CSRF: replay must verify writes use existing CSRF-backed clients.
- Rate-limit bucket: existing admin buckets.
- Reject-unknown validation:
  - replay must confirm invalid/unknown V2 definition fields are not accepted,
  - valid entry create/update uses schema-normalized payloads,
  - errors stay machine-readable and do not leak stacks.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Run all targeted tests from TASK-248-01-01 through TASK-248-04-01.
- Playwright CLI replay with screenshots for:
  - `List View` builder,
  - `Editor View` builder,
  - rendered records table,
  - successful create entry flow,
  - successful edit entry flow.
- `bun run gates:coderso` when feasible; if an existing repo blocker prevents
  it, record the exact blocker and targeted replacement suites in the changelog.
- Before a manual implementation commit, run `bun run precommit` unless the
  commit is created through the configured git hook path and that hook runs
  automatically.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/*`
- `_docs/CMS_API.md`
- `_docs/CONTENT_TYPES_SPEC.md` if schema defaults changed.
- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. House Projects replay succeeds end to end.
2. Docs describe the final V2 API/cache/widget behavior.
3. Task statuses, README board counts, changelog entry, and changelog index are
   synchronized.
4. Any skipped checks include exact reasons and replacement validation.
