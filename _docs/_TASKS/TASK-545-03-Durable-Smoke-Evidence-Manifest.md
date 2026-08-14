# TASK-545-03: Durable Smoke Evidence Manifest

# FileName: TASK-545-03-Durable-Smoke-Evidence-Manifest.md

**Parent Task:** TASK-545
**Priority:** High
**Category:** Workflow Evidence / Runtime Smoke / Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-545-01-L02, TASK-545-02
**Status:** ✅ Done
**Completed:** 2026-08-14
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Define one evidence-family contract: a strict, versioned smoke manifest plus its
integrity-bound `resume-checkpoint.json` under the canonical real-repository path
`_docs/_workflows/_smoke/evidence/task-###/<validated-session>/`, verify the
matching statically registered shared-runtime report, screenshot hashes and
visible assertions, and narrowly unignore that path. Existing loose
screenshots are not retroactively fabricated into evidence. Every scenario names
one or more strict variants; every variant names an `admin|public` surface,
theme, viewport, assertions, and console errors, while every scenario carries
at least one reviewed screenshot/hash. A manifest
containing Admin variants must cover both Admin light and dark without inventing
duplicate scenario IDs.

Manifest scenarios are a pure projection of generic shared-runner scenario
results. L01 extends the shared adapter result type with optional strict visible
variants/assertions/scenario screenshots for legacy compatibility, then requires
those fields for every manifest-bearing suite. Exact scenario pass/title/order,
variants, assertion actual/expected values, console arrays, screenshot ownership,
and the report's global screenshot union must match byte-for-byte; a workflow
cannot fabricate evidence after the adapter returns.

Each manifest binds to the tested source state through mandatory `gitHead`,
`workingTreeDirty`, and `workingTreeSha256` fields. The digest is calculated from
HEAD plus sorted porcelain path/state/content records, including untracked files and
excluding only the manifest's own evidence directory. Validation against the current
expected task/revision runs immediately after smoke and before task/changelog closure
mutates metadata. The validator derives the evidence directory from the real Git root,
task ID, and report-bound validated session; it rejects caller-selected roots,
unregistered suites/profiles, suite/task/session mismatches, symlinked components,
same-basename alternates, and traversal. Tracking proof is a separate owner-controlled phase: phase 1 validates
identity/schema/file set/hashes, atomically writes the strict checkpoint, returns an exact
`owner_action_required` owning-workflow resume argv/command plus task/run/checkpoint hash,
and pauses. The repository
owner reviews and stages only the canonical evidence directory. The resumed closure-only
branch verifies the unchanged checkpoint, exact executing workflow, and tracked parity; it
never replays implementation. The standalone evidence validator is diagnostic, not the
owner's closure entrypoint.

The product suite is always authored through
`docs/develop/runtime-smoke-cookbook.md`. This family consumes the exact shared
runner report and evidence paths; it does not own any task adapter, server,
Playwright, worker, polling, DB cleanup, lifecycle, screenshot, or report
implementation.

The executing owner is derived only from its `import.meta.url`; callers cannot supply a
workflow path. The six post-TASK-554 tracked migration entries stay exact for
TASK-545 closure. The exact `task-554-closeout.mjs` guard is an inventory-only
`closeout` exception, never a smoke-evidence owning resume entry. A future owner must be canonical
`_docs/_workflows/task-<matching-id>-(author-audit|implement|fix).mjs` (`TASK-9999` is the
only four-digit exception), tracked, regular/no-symlink, byte-identical to `git show HEAD`,
task/suffix-bound, and green in TASK-545 static-contract/import gates.

That tracked pass freezes the audited runtime snapshot. Subsequent closure may change only
the exact task family, task index, date-resolved pinned changelog file, and changelog index.
A resume computes the current revision first. With no canonical closure delta or pinned
changelog/index state, stale checkpoint/run-bound same-repository temp/journal alone is cleaned and the
`frozen` branch returns current-canonical-UTC `closureIdentity`. Changelog closure calls exact
owner export `writeOrResumeOrderedDurableChangelogFileThenIndexV1` with marker
`ordered-durable-changelog-file-then-index@v1`: no-replace changelog file +
file/directory fsync, then index CAS via a
same-directory temp/rename + file/directory fsync. Valid states are only `none`, `file-only`,
and `both`; index-only, corruption, and multiple candidates fail. Recovery derives identity
from exactly one strict regular non-symlink file and zero or one matching index row before
allowlisting, accepts file-only as the exact first prefix, completes the index idempotently,
then later metadata, and validates both. Its returned identity is the sole downstream
authority, so a crash across UTC midnight keeps the changelog date.
A final metadata-delta validation returns the new revision and sorted allowed paths; any
source/test/config/runtime-doc/workflow/evidence/HEAD or other-task delta requires a fresh
smoke. Resume recovers only allowlisted partial closure metadata after a crash and is
idempotent after completed closure; delta checks are read-only. Agents never stage or commit
evidence themselves.

## Fresh baseline

The reproducible baseline is the NUL-safe output of
`git ls-files -z -- '_docs/_workflows/_smoke/**'`: exactly 17 tracked files, all
present in the clean isolated checkout, with zero TASK-511 files and no
validated TASK-545 scenario manifest. Deleted TASK-511 screenshots are
Git-history-only context, not current evidence. Filesystem-only ignored artifacts
are deliberately excluded because CI and a fresh clone cannot reproduce them.
`.gitignore:19-20` still ignores global JPG/PNG and `.gitignore:63` ignores the
workflow parent, so L02 must re-include every traversed evidence parent while
re-ignoring all non-evidence workflow/smoke siblings. The durability defect
therefore remains without relying on an obsolete local-worktree count.

## Sub-Tasks

| ID | Title | Exclusive ownership | Status |
|---|---|---|---|
| TASK-545-03-L01 | Define and validate smoke evidence manifests | generic shared-runner visible-evidence result/normalizer, manifest schema, exact type declarations, report-equality validator, evidence-directory revision digest, focused tests | ⏳ To Do |
| TASK-545-03-L02 | Track evidence screenshots | narrow `.gitignore` plus evidence docs only | ⏳ To Do |
| TASK-545-03-L03 | Checkpoint and owner resume | phase-1 checkpoint schema, atomic no-overwrite checkpoint, owner_action_required pause, exact-path/hash tracked resume, closure-resume state machine | ⏳ To Do |
| TASK-545-03-L04 | Closure metadata delta and closure-delta CLI | closure metadata mutation plan, ordered-durable changelog-then-index writer, metadata-only delta validation, closure-delta CLI | ⏳ To Do |
| TASK-545-03-L05 | TASK-548 committed bootstrap gate | six-path committed-bootstrap receipt types plus normalize/require authorization | ⏳ To Do |

## Security Contract

Evidence uses synthetic fixtures only. Manifests/screenshots/checkpoints contain no session
cookie, CSRF token, API key, secret, email, PII, raw customer content, private
URL query token, sensitive log, file body, or environment value. Validator errors expose
bounded codes/counts and canonical repository-relative paths/hashes only.
No scanner exception or public/product surface.

The owner review/stage checkpoint is mandatory external coordination, not an implicit
agent permission. If the owner does not stage the reviewed evidence, the UI task remains
open with an `owner_action_required` result.

## Testing Requirements

- Run the manifest/checkpoint, shared visible-evidence adapter, Git tracking,
  crash-recovery, and metadata-delta tests owned by L01/L03/L04.
- Verify both ignored and narrowly unignored evidence paths using asserted
  `git check-ignore` exit codes.
- Run repository type checks, touched-file line counts, and `git diff --check`.
- A manifest-bearing UI workflow must also complete its registered shared
  runtime-smoke suite before the owner review/stage checkpoint.

## Documentation Updates Required

- L02 owns `_docs/_workflows/SMOKE_EVIDENCE.md` and the narrow `.gitignore`
  guidance; product suites continue to use
  `docs/develop/runtime-smoke-cookbook.md`.
- Record closure only in changelog 1257 and the TASK-545 board family through
  TASK-545-04-L03.
