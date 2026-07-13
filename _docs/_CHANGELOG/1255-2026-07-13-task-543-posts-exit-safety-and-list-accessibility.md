# 1255 - TASK-543 Posts Exit Safety and List Accessibility

Date: 2026-07-13
Version: Unreleased
Tasks: TASK-543, TASK-543-01, TASK-543-01-L01, TASK-543-02,
TASK-543-02-L01, TASK-543-03, TASK-543-03-L01

## Key Changes

### Latest-draft exit safety

- Close is now an awaited persistence boundary. It coalesces with an admitted save,
  captures any newer exact draft, preserves ascending write order, and navigates only
  after the latest required target is durable or already proven clean.
- Route identity, mounted state, response-derived baselines, authoritative restore/reload
  barriers, and cache-refresh generations prevent stale requests from replacing a newer
  draft or falsely satisfying Close.
- A failed Close keeps the draft and editor state intact, exposes and focuses `Retry now`,
  and does not navigate. Retry performs the manual save without navigation; a separate
  clean Close then returns to Posts without a redundant write. Repeated Close activation
  shares one transport chain and one navigation.

### Native Posts-list interaction and responsive metadata

- A table row is now passive. The title AdminLink is the sole row navigation target,
  while the checkbox and actions trigger retain their native, independent keyboard and
  pointer behavior.
- The shared icon-only action trigger has a bounded accessible default and Posts supplies
  a contextual `Actions for <title>` label.
- Status, author, and published/date context have one visible semantic representation at
  each breakpoint. Author/date remains available through the mid-width layout before the
  dedicated large-screen columns take over.

No route, endpoint, request schema, database migration, RBAC, CSRF, rate-limit, or
security contract changed. No Dashboard widget or non-Dashboard widget/editor surface
was added.

## Validation

- The final targeted matrix passed 159/159 across 13 files, including the autosave/editor
  source suites, loaded-mock and SSR fail-closed boundary suites, PostsTable/list integration,
  PageRowActions, and the shared PageTable no-regression gate.
- Full Bun passed 1,687 tests with one intentional opt-in OpenAI live skip and zero
  failures. Sequential full Vitest passed 836/836 files and 6,880/6,880 tests. The combined
  executed total was 8,567 passing tests, one intentional skip, and zero failures.
- TypeScript, `precommit:check`, Admin build, browser-boundary check (776 files), Admin
  bundle budgets, and all five Coderso release gates passed. The Admin build emitted only
  the existing large-chunk warnings.
- Task-scoped Semgrep found zero TASK-543 issues. The strict scan completed Bun audit,
  Trivy vulnerability/config/secret, and Gitleaks history/worktree clean; its sole
  non-green result was the exact unchanged Semgrep finding at
  `_docs/_workflows/task-522-author.mjs:185`, owned by TASK-545. No suppression or scanner
  configuration changed.
- Three independent final audit lenses found one stale board-statistics count and two stale
  current `8`-suite references (parent contract and workflow). All were corrected; fresh
  re-audits reported 0 HIGH / 0 MEDIUM / 0 LOW across source, evidence, graph, docs, and
  security boundaries.

## Live smoke

- The exact `coderso-dev-core-host /home/coder/project/Coderso` helper served
  `http://coderso-a.localhost:5173/admin/` and `http://coderso-a.localhost:3000` with
  HTTP and browser 200. The run used separate full
  `playwright-cli -s=wf543smoke --raw ...` commands; credentials were loaded from `.env`
  without printing or persisting their values.
- Seven distinct scenarios used one uniquely titled real-UI fixture: clean Close; delayed
  dirty Close with a visible pending boundary; pending B→A restoration; invalid-JSON save
  failure with retained draft and focused Retry, then the required autosave → base PATCH →
  metadata PATCH retry chain without navigation and a separate zero-write Close; double Close
  with one transport and one
  replace navigation; native keyboard title/checkbox/actions behavior with a passive row;
  and responsive metadata at 390, 768, 900, and 1024 px.
- Light and dark coverage produced zero console errors, warnings, or page errors. The one
  fixture was deleted through the UI and proved absent after reload; theme, task routes,
  named session, helper PIDs, and owned ports were restored or removed.
- `_docs/_workflows/task-543-implement.mjs` was syntax-checked and audit-hardened, but its
  overstrict future receipt/result schema was not executed as a canonical producer. The
  manual command-by-command live run above is the executed TASK-543 proof. TASK-545 owns
  the future durable smoke manifest and generalized workflow evidence contract.

## Task-scoped screenshots

| Screenshot | SHA-256 |
|---|---|
| `task-543-wf543smoke-clean-close-final.png` | `44b4120dc4cc746945fe72fe136326f977e44bc9eba39b30b63f0c88b7dd259d` |
| `task-543-wf543smoke-dirty-delayed-close-transient.png` | `761f617e63bf8b3e29d48cc2c4886605f90ba814e47646f576b71fb774e05911` |
| `task-543-wf543smoke-dirty-delayed-close-final.png` | `3504eaad14bad923b0399dada9825bf7981fc5ddd8513a44b666cb302b8b35a4` |
| `task-543-wf543smoke-pending-revert-restoration-transient.png` | `79bfd001b3b3080b1c183f9ea303ac4a35d0890f6d9a287c03a1ba6de9468002` |
| `task-543-wf543smoke-pending-revert-restoration-final.png` | `fff91148a431939192f1e1f1aa0473630d7de5401ca16e9d829b778c0cc41937` |
| `task-543-wf543smoke-failure-retry-transient.png` | `2b61fd8e5948c94f339c1b29856647a59efaf9a5fbaf4aec70012ddf147a4262` |
| `task-543-wf543smoke-failure-retry-final.png` | `ba3e12a7896cd9d1b5c8a4a95d1f094f0761b1c6ce4c4ffa4db049b141ba920f` |
| `task-543-wf543smoke-double-close-transient.png` | `1c18c43b790072c91b4ec0b85518a876b8f0b586681e80bb4319b599db5efbee` |
| `task-543-wf543smoke-double-close-final.png` | `c1d76caa9c99a6783228f38cfe4210b6427209d75e7f923aa90a07833ef388c4` |
| `task-543-wf543smoke-table-keyboard-final.png` | `5bb75ccdd3c0e277fdbebf687c53148a7a081a3e7f22c70d65d8950b228099ea` |
| `task-543-wf543smoke-mid-viewport-metadata-final.png` | `a02816ab2a3cd1548d6a6d6c59d8e8ca7a0255a3ca21b0afea7d248d84b22677` |

These PNGs are task-local smoke evidence, not a claim that TASK-545's future manifest
contract already exists.
