# 1256 - TASK-544 Media Folder Reliability and Error Recovery

Date: 2026-07-12
Version: Unreleased
Tasks: TASK-544, TASK-544-01, TASK-544-01-L01, TASK-544-02,
TASK-544-02-L01, TASK-544-03, TASK-544-03-L01, TASK-544-04,
TASK-544-04-L01

## Key Changes

### Database conflict and browser-cache reliability

- Concurrent create/update violations map to `media_folder_slug_conflict` only for
  PostgreSQL 23505 on the owned `media_folders_slug_idx` constraint. The existing
  centralized route mapper returns the bounded 409 without exposing database details;
  unrelated failures are not laundered.
- Folder-list promise dedupe now clears in `finally` only for the matching identity.
  Forced reads and invalidation advance a generation, so stale completions cannot clear
  or overwrite a newer request. Network rows are projected to the exact six-field browser
  contract before return or persistence, and malformed cache envelopes are evicted.
- Existing mutation invalidation and `cacheBus` broadcasts remain success-only.

### Visible, state-preserving recovery

- Load/create/rename/reorder/delete failures keep the last good tree, draft, selection,
  order, and filter ownership intact while exposing fixed, accessible, operation-specific
  Retry actions. Form dismissal and reconciliation require the current immutable attempt,
  token, target, generation, and draft identity.
- Mount, cross-tab, and Retry loads use a separate generation-scoped pending identity.
  A stale load cannot clear newer busy state or replace mutation pending. Successful delete
  updates both folder-filter owners only when each still targets the deleted folder.
- Keyboard/touch/coarse-pointer actions, bounded alert geometry, and the existing rail
  tokens remain intact.

No endpoint, migration, RBAC, rate-limit, strict-schema, or internal Admin security
contract changed. No Dashboard widget or non-Dashboard widget/editor surface was added.

## Audit, validation, and smoke

- Targeted Bun service/route coverage passed 36/36; the four targeted Vitest suites
  passed 78/78. Full `bun run test` passed Bun 1,687 with one optional live OpenAI skip
  and zero failures across 261 files, plus Vitest 6,794/6,794 across 836 files.
- Core lint/types, `precommit:check`, Admin build (2,637 modules; chunk warnings only),
  Admin boundary (776 files), Admin bundle, and all five release gates passed. Targeted
  Semgrep found zero TASK-544 issues. The strict scan was non-green only for the exact
  unchanged `_docs/_workflows/task-522-author.mjs:185` finding owned by TASK-545; Bun
  audit, Trivy, and Gitleaks were clean, without suppression.
- Fresh source, test-integrity, post-implementation, and smoke audits reported zero
  High/Medium/Low findings.
- The first live run found a real background-load busy-state drift; the generation guard
  and old-first/newer-generation regression were added before final validation. The smoke
  contract was also corrected after browser `Buffer` proved unavailable, CLI-installed
  routes required an explicit page-side unroute, native dialog acceptance poisoned the
  named session, and successful Retry consumption made the button correctly absent.
  Attempts with stale retry expectations or incorrect probe chronology were discarded.
- Final smoke used `coderso-dev-core-host` and separate full task-scoped
  `playwright-cli` commands for five canonical list/create/rename/reorder/delete flows.
  Light/dark and wide/narrow scenarios asserted visible state, geometry, counters, and
  confirmation behavior with five distinct valid PNG hashes and zero canonical console
  errors, warnings, or page errors. All nine fixtures, the DB prefix, setup/theme state,
  routes, session, helper processes, and ports were cleaned or restored.
- Credential fills redirect output to `/dev/null`; the recent workflow-artifact scan found
  zero credential-value hits. Older ignored local artifacts predate this task and remain
  out of scope pending separate user-authorized hygiene; no secret values are recorded.

## Canonical screenshots

| Flow | SHA-256 |
|---|---|
| `task-544-wf544smoke-final4-list-retry.png` | `8c5828656ed43cc18a17d95c5ad64831a0556dd45d9125b44255a2eb0d3c59ad` |
| `task-544-wf544smoke-final4-create-retry.png` | `50c11eda345d66eb1034962706f103cd334c4e8059b52d96a019489f5a736dcc` |
| `task-544-wf544smoke-final4-rename-retry.png` | `56c422f73cf19199fc1f62b28d693983ae3d640c843046892739247199364400` |
| `task-544-wf544smoke-final4-reorder-retry.png` | `52885b12659d335495a9273aa172d52cc7cbc763f730c302556ded4c636f24a7` |
| `task-544-wf544smoke-final4-delete-retry.png` | `422a8234367e8f7ad9c0476ae183a090df1c44322f0b0ac5fe90cfa41901930f` |

These screenshots remain task-local smoke evidence. TASK-545 owns the future durable
manifest and `.gitignore` evidence contract.
