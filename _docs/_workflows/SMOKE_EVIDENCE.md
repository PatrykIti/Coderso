# Smoke Evidence: Owner Review, Stage, and Resume Protocol

# FileName: SMOKE_EVIDENCE.md

This guide documents the TASK-545 durable smoke-evidence family: how validated
synthetic evidence reaches Git, who reviews and stages it, and how a workflow
resumes after the owner checkpoint. It is the evidence guide owned by
TASK-545-03-L02; the authoritative CLI implementation, schemas, and tests live
in `_docs/_workflows/lib/smoke-evidence.mjs`, its `.d.mts` declarations, and
`tests/unit/workflows/smokeEvidence.test.ts`.

Product suites are always authored through the shared runtime-smoke cookbook.
This guide links
[`docs/develop/runtime-smoke-cookbook.md`](../../docs/develop/runtime-smoke-cookbook.md)
instead of duplicating its lifecycle, polling, process supervision, worker,
database, browser, checkpoint, redaction, timing, or reporting loops.

## 1. The canonical evidence tree

A manifest-bearing suite writes strict, versioned evidence under the canonical
real-repository path:

```text
_docs/_workflows/_smoke/evidence/task-<###>/<validated-session>/
  manifest.json
  resume-checkpoint.json
  report.json
  <scenario-owned screenshot files>
```

The directory is derived from the real Git root, the exact task ID
(`TASK-###`, plus the sole `TASK-9999` sentinel), and the report-bound
validated session. Caller-selected roots, unregistered suites/profiles,
suite/task/session mismatches, symlinked components, same-basename alternates,
and traversal are rejected. Manifests use synthetic fixtures only; they contain
no session cookie, CSRF token, API key, secret, email, PII, raw customer
content, private URL query token, sensitive log, file body, or environment
value.

## 2. Git tracking: the narrow evidence exception

The repository globally ignores image files (`*.jpg`, `*.png`, with
`!banner.png` retained) and ignores the whole `_docs/_workflows/` tree. To let
only the canonical evidence subtree become trackable, `.gitignore` re-includes
each traversed parent, then re-ignores every sibling:

```gitignore
!/_docs/_workflows/
/_docs/_workflows/*
!/_docs/_workflows/_smoke/
/_docs/_workflows/_smoke/*
!/_docs/_workflows/_smoke/evidence/
!/_docs/_workflows/_smoke/evidence/**
```

Git cannot re-include a file below an ignored directory unless every traversed
parent is first re-included; the immediately following `*` rules re-ignore all
other workflow/smoke children, so ignored owner-local scripts and loose smoke
files stay out of repository inventory. Only the canonical `evidence/**`
subtree is eligible for owner-reviewed tracking, and schema/hash validation
still decides whether an eligible file is valid evidence. This file itself
lives below the ignored workflow tree, so it requires the same explicit owner
review, force-track, owner commit, and fresh `git ls-files`/`git show HEAD`
parity gate as the TASK-545 runtime/schema/declaration files. Agents never
stage it.

## 3. The owner review/stage checkpoint

Phase 1 never claims durability and never stages or commits anything. It
validates identity, schema, the exact present file set, revision, and every
hash, then atomically creates `resume-checkpoint.json` beside the manifest
(create-only, never overwritten), and returns an `owner_action_required` pause
payload: the canonical task/run/checkpoint SHA-256, the evidence directory, the
checkpoint path, and the exact owning-workflow resume `argv`/`command`. The
workflow then pauses.

The repository owner reviews the report, screenshots, manifest, and checkpoint
for visible correctness and secret/PII safety, stages only the reviewed
canonical evidence directory, and re-enters the owning workflow with the
unchanged checkpoint path/hash/run ID. The agent returns
`owner_action_required`; it never invokes `git add` and never commits evidence
itself. Missing owner review/staging pauses the workflow and keeps the UI task
open.

## 4. L01 CLI stages (contract)

The TASK-545-03-L01 family defines the following stages. Commands marked as
L03/L04-owned forward references are not yet shipped by L01; this guide records
the contract so the stages stay pinned.

Phase 1 (owner-review checkpoint):

```text
phase1 --repo-root <root> --task TASK-### --suite <registered-suite>
       --profile certification --session <validated-session> --audit-directory
```

Phase 1 derives the canonical task/session directory, creates
`resume-checkpoint.json`, returns the task/run/checkpoint hash plus the exact
owning-workflow resume `argv`/`command`, and pauses. Only after the owner
reviews and stages that exact directory may the closure-only workflow command
re-enter with the same canonical checkpoint path, hash, run ID, and bound
workflow entry while internally requiring tracked parity.

Closure-only resume (owner-staged evidence):

```text
<exact owning-workflow closure-only command> <checkpoint path> <hash> <run>
```

The resume re-derives the canonical checkpoint path from the real repository
root, task, and session; requires the exact caller path, constant-time SHA-256
match, exact task/session/run, the exact executing workflow entry, and an
unchanged frozen revision. It enumerates the manifest-referenced files plus the
checkpoint control file, validates every hash, proves exact `git ls-files`
parity, and fails on unreferenced files. Repeated exact resume is read-only and
replay-safe.

Standalone diagnostic validator (shipped by L01):

```text
node _docs/_workflows/lib/smoke-evidence.mjs validate-tracked
     --repo-root <root> --task TASK-###
     --suite <registered-suite> --profile <fast|certification>
     --session <session> [--audit-directory] [--require-tracked]
```

`validate-tracked` reads `manifest.json`, `report.json`, and the referenced
screenshots from the canonical evidence directory, verifies schema, identity,
revision, report byte-equality, and every hash, then exits 0 on success.
`--audit-directory` additionally requires the exact present file set;
`--require-tracked` requires that exact set in `git ls-files`. The standalone
validator is diagnostic only, never the owner closure entrypoint.

Closure metadata delta (after closure edits):

```text
closure-delta <pinned changelog path> <bounded metadata allowlist>
```

`closure-delta` validates the exact pinned changelog path and the bounded
metadata allowlist after the closure workflow's metadata edits. Any
source/test/config/runtime-doc/workflow/evidence/HEAD or other-task delta
requires a fresh smoke.

## 5. Ownership and forward references

The following are owned by later leaves and are not yet implemented by the L01
surface that ships `validate-tracked`:

- `phase1` checkpoint creation and the exact `owner_action_required` resume
  payload: TASK-545-03-L03 (not yet implemented).
- Tracked resume and closure-resume state machine
  (`resumeTrackedEvidence`, `openWorkflowClosureResume`, task-bound owning
  workflow validation): TASK-545-03-L03 (not yet implemented).
- `closure-delta` and the closure metadata/delta writer: TASK-545-03-L04 (not
  yet implemented).

Until those leaves land, `validate-tracked` is the only executable surface.
The `resume-checkpoint.json` schema is already shipped by L01 for owner
review, but no CLI writes or resumes it yet.

## 6. Truthful evidence rules

- Never fabricate evidence after the adapter returns. Manifest scenarios are a
  pure projection of generic shared-runner scenario results; a workflow cannot
  invent screenshots, hashes, variants, or assertions after the fact.
- Deleted TASK-511 historical PNGs are Git-history-only context, not current
  evidence; none is copied, restored, or fabricated as current proof.
- A manifest containing Admin variants must cover both Admin light and dark
  without inventing duplicate scenario IDs.
- The manifest binds to the tested source state through `gitHead`,
  `workingTreeDirty`, and `workingTreeSha256`; validation runs immediately
  after smoke and before any closure metadata mutation.
- Do not implement a second evidence enumerator in documentation or tests;
  the checkpoint/resume APIs own enumeration.
