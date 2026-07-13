# 1255 - TASK-543 Posts Exit Safety and List Accessibility

Date: 2026-07-13
Version: Unreleased
Status: Draft — final closure audit found cross-session drain blocking; all validation and live-smoke evidence below is superseded until the fix is rerun
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

- The final targeted matrix passed 144/144 across 13 files, including the autosave/editor
  source suites, loaded-mock and SSR fail-closed boundary suites, PostsTable/list integration,
  PageRowActions, and the shared PageTable no-regression gate.
- Full Bun passed 1,687 tests with one intentional opt-in OpenAI live skip and zero
  failures. Sequential full Vitest passed 836/836 files and 6,865/6,865 tests. The combined
  executed total was 8,552 passing tests, one intentional skip, and zero failures.
- TypeScript, `precommit:check`, Admin build, browser-boundary check (776 files), Admin
  bundle budgets, and all five Coderso release gates passed. The Admin build emitted only
  the existing large-chunk warnings.
- Task-scoped Semgrep found zero TASK-543 issues. The strict scan completed Bun audit,
  Trivy vulnerability/config/secret, and Gitleaks history/worktree clean; its sole
  non-green result was the exact unchanged Semgrep finding at
  `_docs/_workflows/task-522-author.mjs:185`, owned by TASK-545. No suppression or scanner
  configuration changed.

## Live smoke

- The exact `coderso-dev-core-host /home/coder/project/Coderso` helper served
  `http://coderso-a.localhost:5173/admin/` and `http://coderso-a.localhost:3000` with
  HTTP and browser 200. The run used separate full
  `playwright-cli -s=wf543smoke --raw ...` commands; credentials were loaded from `.env`
  without printing or persisting their values.
- Seven distinct scenarios used one uniquely titled real-UI fixture: clean Close; delayed
  dirty Close with a visible pending boundary; pending B→A restoration; invalid-JSON save
  failure with retained draft and focused Retry, exactly one Retry PATCH without
  navigation, then a separate zero-write Close; double Close with one transport and one
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
| `task-543-wf543smoke-clean-final.png` | `070d66cdfae77213e370675c86d40f0e0e5e25505081820320bf4d5e146336c2` |
| `task-543-wf543smoke-delayed-final.png` | `fdb868ce4d252d695e10fb08e8dfa13a37a3fe5ca2d89dc73847c996bad1015e` |
| `task-543-wf543smoke-delayed-transient.png` | `9b41822de85b1c029d39b4de6567e6009efe33c022dbedfeb24faaab94d044ab` |
| `task-543-wf543smoke-double-final.png` | `0ec5aa3c8cd2a5e348ca2c3ba75d3553b8800b27fc20100bad2405c711460bdc` |
| `task-543-wf543smoke-double-transient.png` | `4411b4dc8731c7aec7600baa6d5f7a1c716bd5e56e13f8595b41412d6383e0b6` |
| `task-543-wf543smoke-failure-final.png` | `2aae7a2bc7e02190869d6753915df727d6f2b5d66ce1659e8d88fc73700b8379` |
| `task-543-wf543smoke-failure-transient.png` | `f7ed301005ea68233d19a7e45389c62f67b571c7a8cc1b6d4cf4e2898445c7f6` |
| `task-543-wf543smoke-keyboard-final.png` | `78471d0a16b434d97cdeac9564479d845e9b587fb1408451ce1e4672c8cde373` |
| `task-543-wf543smoke-responsive-final.png` | `d2f03aa7313fd3b3f2e4e1829b0f158ec8ae262ffef9deebf204258106581f41` |
| `task-543-wf543smoke-revert-final.png` | `070d66cdfae77213e370675c86d40f0e0e5e25505081820320bf4d5e146336c2` |
| `task-543-wf543smoke-revert-transient.png` | `7606cdda5ff5be461708fe2859477a7309b92bfd7ea5ac01b14ca842488380be` |

These PNGs are task-local smoke evidence, not a claim that TASK-545's future manifest
contract already exists.
