# TASK-543-03-L01: Close Failure, Keyboard, Viewport Flows, and Closure

# FileName: TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md

**Parent Task:** TASK-543
**Parent Subtask:** TASK-543-03
**Priority:** High
**Category:** UI Tests / Accessibility / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-543-01-L01, TASK-543-02-L01
**Status:** ⏳ To Do
**Changelog:** 1255 (pinned; create only at implementation closure)

---

## Scope and ownership

Rerun/smoke/docs-only leaf. The six named Posts Vitest/UI-integration files are read-only
inputs owned by TASK-543-01-L01 and TASK-543-02-L01. This leaf may edit only TASK-543
task-scoped screenshots and closeout evidence under the currently supported
`_docs/_workflows/_smoke/` path, Posts UX docs if behavior is documented, this family’s
statuses, _docs/_TASKS/README.md, changelog 1255, and _docs/_CHANGELOG/README.md. It must
not edit production source or tests. Read indexes fresh before closure.

## Implementation Pseudocode

Read-only source-test verification:

~~~ts
test initial and post-hydration clean Close:
  render shell from an authoritative saved revision; click Close;
  expect zero save requests and one canonical navigation;
  install another accepted authoritative hydration and repeat with zero writes.

test clean revert proof:
  edit and revert byte-exactly to the authoritative snapshot with no save pending;
  click Close; expect zero save requests;
  then start different-byte save A, revert to the authoritative bytes as exact revision B,
  and click Close while A remains pending;
  assert B is registered immediately, wire order is A -> B, B restores the exact clean
  bytes, and navigation waits for B even though derived dirty state is false.

test editor identity transition:
  transition from post A to authoritative post B while an A request is settling;
  assert B receives a freshly seeded persisted target and clean Close performs zero writes;
  settle A late and assert it cannot mutate B draft/baseline/error/revision state.

test dirty Close:
  defer save promise; click Close;
  assert pending state and no navigation;
  resolve; assert one navigation.

test active save plus newer edit:
  start save A, mutate to revision B, click Close;
  resolve A with server values different from B;
  assert B title/slug/document/featured image/metadata, dirty marker, selection and undo
  history remain byte-identical;
  assert the next request payload is exactly B, then navigate only after B resolves.

test active manual save:
  start manual save, then activate Close;
  assert Close awaits the same registered promise and does not duplicate the write;
  cover success and shared failure with no navigation on rejection.

test manual Save while background A is active:
  edit/capture B and activate manual Save while A is pending;
  resolve A; assert manual promise/toast remains pending and exact B request starts;
  edit C while B waits; resolve B; assert manual succeeds for B while C remains dirty;
  cover A rejection/retry and concurrent Close without a duplicate B request.

test exact queue order under post-A contention:
  while A is pending enqueue manual B, then capture/enqueue Close/background C;
  release A with both waiters runnable;
  assert request order and payload identity are exactly A -> B -> C;
  assert neither C start/success nor a higher revision counter can resolve manual B;
  assert same-revision joiners share one B promise/write.

test failure/retry/double:
  reject shared save; assert alert, draft retained, no navigation;
  retry succeeds; assert one navigation;
  double activation while pending invokes one chain and the Close control alone is
  disabled/aria-busy while editing remains available.

test PostsTable semantics:
  assert row has no synthetic activation;
  activate title link by keyboard;
  activate checkbox/action and assert no edit navigation.

browser viewport assertions:
  at 768/900/1024 px inspect visible author/date/status nodes and accessible names.
~~~

Each listed automated assertion must already exist in its owning source leaf's suite.
This closure leaf searches/reads and reruns those files; if a required assertion is absent
or weakened, return the defect to that source leaf and repeat its gate instead of editing
the test here.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell-wave.test.tsx \
  tests/vitest/ui/posts-table-wave.test.tsx \
  tests/vitest/ui-integration/post-list-restyle.test.tsx \
  tests/vitest/ui-integration/post-autosave-flow.test.tsx \
  tests/vitest/ui-integration/post-editor-keyboard-a11y.test.tsx
bun run gates:coderso
git diff --check
~~~

Re-run each named failure once in isolation.

## Runtime smoke

Restart the server and run a TASK-543 Playwright session with at least these distinct
flows: clean Close; dirty delayed-save Close; pending-write clean-revert restoration; save
failure stays then retry; double Close while pending; keyboard title/checkbox/action
behavior; and mid-width metadata at 768, 900, and 1024 px. Cover light/dark. Assert URL,
busy/alert state, retained draft text, focus/activation, computed visibility, accessible
names, request order where observable, and zero console errors. Keep post-hydration and
identity-transition stale-response cases as deterministic focused integration tests if the
browser flow cannot trigger those internal boundaries without test-only hooks.

TASK-545 lands later. Record the current task-scoped screenshots and concise closeout
facts only; do not depend on, pre-create, or claim validation by TASK-545's future durable
manifest/schema/`.gitignore` contract.

## Closure

Run fresh lenses for newest-draft saving, promise/error propagation, navigation
idempotence, table semantics, and responsive test integrity. Create changelog 1255, mark
all descendants Done, close the parent, and synchronize task/changelog indexes.
