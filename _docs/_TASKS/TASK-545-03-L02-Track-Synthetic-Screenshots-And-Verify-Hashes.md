# TASK-545-03-L02: Track Synthetic Screenshots and Verify Hashes

# FileName: TASK-545-03-L02-Track-Synthetic-Screenshots-And-Verify-Hashes.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-03
**Priority:** High
**Category:** Workflow Evidence / Git Tracking / Documentation
**Estimated Effort:** Small
**Dependencies:** TASK-545-03-L01
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Exclusive ownership

- `.gitignore` only for the narrow evidence exception
- new `_docs/_workflows/SMOKE_EVIDENCE.md`

Do not edit the manifest validator/schema, its tests/fixtures, or unrelated ignore rules.

## Implementation Pseudocode

```gitignore
# Keep existing global image ignores.
*.jpg
*.png
!banner.png

# TASK-545: only validated workflow evidence may be tracked.
!_docs/_workflows/_smoke/evidence/
!_docs/_workflows/_smoke/evidence/**
```

```bash
# An evidence PNG must be unignored even before it exists.
if git check-ignore -q --no-index \
  _docs/_workflows/_smoke/evidence/task-545/example.png; then
  echo "evidence path is still ignored" >&2
  exit 1
fi

# An arbitrary PNG outside the exact exception must remain ignored.
git check-ignore -q --no-index _docs/_workflows/_smoke/unrelated.png
```

L01's owned tests use temporary synthetic image bytes; this leaf does not edit those
fixtures. Do not commit a fake product screenshot as historical smoke proof. The exception enables future
real Playwright evidence under task directories. Documentation requires human
review for synthetic-data/secret/PII safety before adding evidence.

Document all three exact L01 CLI stages. Phase 1 is
`phase1 --repo-root <root> --task TASK-### --audit-directory`; it derives the canonical
directory, creates `resume-checkpoint.json`, returns the task/run/checkpoint hash and exact
owning-workflow resume argv/command, then pauses. Only after the repository owner reviews
and stages that exact directory may that closure-only workflow command use the same
canonical checkpoint path, hash, run ID and bound workflow entry while internally requiring
tracked parity. The standalone validator command is diagnostic only. After closure metadata edits,
`closure-delta` validates the exact pinned changelog path and bounded metadata allowlist.
The agent returns `owner_action_required` and never stages/commits files. The tracked resume
enumerates manifest-referenced files plus the checkpoint control file, validates every
hash, proves exact `git ls-files` parity, and fails on unreferenced files. Do not implement
a second enumerator in documentation or tests.

## Error/compatibility flow

- Existing loose ignored PNG/JPG behavior remains.
- Evidence manifest/PNG/checkpoint files under the exact path can be tracked.
- Wrong/missing hash or untracked referenced file fails closure.
- Phase-1 validation of new untracked evidence is not a closure pass. Missing owner review/
  staging pauses the workflow; wrong/stale resume identity fails, repeated exact resume is
  read-only, and the final owner commit remains after metadata-delta closure validation.
- The six current TASK-511 PNGs are not treated as valid evidence without a
  manifest and are not copied/fabricated.

## Validation

```bash
bun test tests/unit/workflows/smokeEvidence.test.ts
node _docs/_workflows/lib/smoke-evidence.mjs --help
if git check-ignore -q --no-index _docs/_workflows/_smoke/evidence/task-545/example.png; then exit 1; fi
git check-ignore -q --no-index _docs/_workflows/_smoke/unrelated.png
git diff --check
```

These commands assert both ignored/unignored exit codes; `|| true` is forbidden because
it would make the evidence exception unverifiable.
