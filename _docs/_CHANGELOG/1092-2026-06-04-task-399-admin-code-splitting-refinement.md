# 1092 - TASK-399 admin code-splitting refinement

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-399, TASK-399-01, TASK-399-02, TASK-399-03, TASK-399-04, TASK-399-05

## Key Changes

### Admin UI / Build Performance

- Refined TASK-399 after the committed first draft so the implementation plan
  matches the current `AdminApp` route table and Vite 8 / Rolldown behavior.
- Corrected `/preview` to remain an eager public route for this first family.
- Clarified that `TASK-399-01` only creates bootstrap-safe seams, while
  `TASK-399-02` migrates representative lazy routes and `TASK-399-03` owns the
  full protected route inventory.
- Replaced the assistant runtime cache pseudocode with the real in-memory
  cache/promise contract currently owned by `AssistantPanel`.

### QA / Release Gates

- Added explicit route inventory, SSR, denied-route, setup-wizard, and
  route-error-boundary expectations.
- Clarified that the bundle guard must resolve initial entry scripts from
  `core/dist/client/index.html`, write `.tmp/admin-bundle-report.json`, and run
  in a PR gate.
- Expanded Docker/runtime serving expectations for hashed lazy chunks, deep
  links, and admin asset routing tests.

## Validation

- Fresh Claude CLI review with `--effort xhigh` after the first task draft
  commit.
- Fresh agent review pass after the first task draft commit.
