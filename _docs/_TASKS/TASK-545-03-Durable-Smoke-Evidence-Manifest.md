# TASK-545-03: Durable Smoke Evidence Manifest

# FileName: TASK-545-03-Durable-Smoke-Evidence-Manifest.md

**Parent Task:** TASK-545
**Priority:** High
**Category:** Workflow Evidence / Runtime Smoke / Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-545-01-L02, TASK-545-02
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Scope

Define one evidence-family contract: a strict, versioned smoke manifest plus its
integrity-bound `resume-checkpoint.json` under the canonical real-repository path
`_docs/_workflows/_smoke/evidence/task-###/`, verify screenshot hashes and visible
assertions, and narrowly unignore that path. Existing loose
screenshots are not retroactively fabricated into evidence. Every scenario names
an `admin|public` surface and theme; a manifest containing admin scenarios must
cover both admin light and dark.

Each manifest binds to the tested source state through mandatory `gitHead`,
`workingTreeDirty`, and `workingTreeSha256` fields. The digest is calculated from
HEAD plus sorted porcelain path/state/content records, including untracked files and
excluding only the manifest's own evidence directory. Validation against the current
expected task/revision runs immediately after smoke and before task/changelog closure
mutates metadata. The validator derives the evidence directory from the real Git root and
task ID; it rejects caller-selected roots, symlinked components, same-basename alternates,
and traversal. Tracking proof is a separate owner-controlled phase: phase 1 validates
identity/schema/file set/hashes, atomically writes the strict checkpoint, returns an exact
`owner_action_required` owning-workflow resume argv/command plus task/run/checkpoint hash,
and pauses. The repository
owner reviews and stages only the canonical evidence directory. The resumed closure-only
branch verifies the unchanged checkpoint, exact executing workflow, and tracked parity; it
never replays implementation. The standalone evidence validator is diagnostic, not the
owner's closure entrypoint.

That tracked pass freezes the audited runtime snapshot. Subsequent closure may change only
the exact task family, task index, date-resolved pinned changelog file, and changelog index.
A final metadata-delta validation returns the new revision and sorted allowed paths; any
source/test/config/runtime-doc/workflow/evidence/HEAD or other-task delta requires a fresh
smoke. Resume recovers only allowlisted partial closure metadata after a crash and is
idempotent after completed closure; delta checks are read-only. Agents never stage or commit
evidence themselves.

## Fresh baseline

There are currently 215 files under `_smoke`; only six similarly named TASK-511
PNGs are tracked, and none has a validated scenario manifest. `.gitignore:19-21`
still ignores global JPG/PNG. The earlier report's 209/zero count is obsolete,
but the durability defect remains.

## Leaves and order

| ID | Title | Exclusive ownership | Status |
|---|---|---|---|
| TASK-545-03-L01 | Define and validate smoke evidence manifests | manifest/checkpoint schemas, canonical-root validator/resume/delta CLI, focused tests | ⏳ To Do |
| TASK-545-03-L02 | Track evidence screenshots | narrow `.gitignore` plus evidence docs only | ⏳ To Do |

## Security Contract

Evidence uses synthetic fixtures only. Manifests/screenshots/checkpoints contain no session
cookie, CSRF token, API key, secret, email, PII, raw customer content, private
URL query token, sensitive log, file body, or environment value. Validator errors expose
bounded codes/counts and canonical repository-relative paths/hashes only.
No scanner exception or public/product surface.

The owner review/stage checkpoint is mandatory external coordination, not an implicit
agent permission. If the owner does not stage the reviewed evidence, the UI task remains
open with an `owner_action_required` result.
