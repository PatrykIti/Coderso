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

## Overview

Permit only validated synthetic smoke-evidence families through the global
image ignore and document the owner review, stage, and resume protocol.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

- `.gitignore` only for the narrow evidence exception
- new `_docs/_workflows/SMOKE_EVIDENCE.md`
- `docs/develop/runtime-smoke-cookbook.md`, only for the generic manifestable
  visible-evidence adapter recipe owned by TASK-545

Do not edit the manifest validator/schema, its tests/fixtures, or unrelated ignore rules.
This leaf is the serialized cookbook predecessor of TASK-548-02-L02,
TASK-548-04-L03, TASK-548-07-L01, and TASK-414-11-L01. Those later owners add or
succeed only their suite-specific recipes after rereading these terminal bytes;
they do not redefine the generic contract.

## Implementation Pseudocode

```gitignore
# Keep existing global image ignores.
*.jpg
*.png
!banner.png

# Keep the globally ignored workflow tree traversable only far enough to
# re-include canonical evidence. Every other immediate workflow/smoke child
# remains ignored; tracked workflow modules keep their existing Git status.
!/_docs/_workflows/
/_docs/_workflows/*
!/_docs/_workflows/_smoke/
/_docs/_workflows/_smoke/*
!/_docs/_workflows/_smoke/evidence/
!/_docs/_workflows/_smoke/evidence/**
```

```bash
# An evidence PNG must be unignored even before it exists.
if git check-ignore -q --no-index \
  _docs/_workflows/_smoke/evidence/task-545/task-545-certification/example.png; then
  echo "evidence path is still ignored" >&2
  exit 1
fi

# Arbitrary workflow modules and PNGs outside the exact exception remain ignored.
git check-ignore -q --no-index _docs/_workflows/local-only-script.mjs
git check-ignore -q --no-index _docs/_workflows/_smoke/unrelated.png
```

The parent-directory exceptions are mandatory: Git cannot re-include a file
below an ignored `_docs/_workflows/` directory unless each traversed parent is
first re-included. The immediately following `*` rules re-ignore every sibling,
so this change does not turn ignored owner-local workflow scripts or loose smoke
files into repository inventory. Only the canonical `evidence/**` subtree is
eligible for owner-reviewed tracking; schema/hash validation still decides
whether an eligible file is valid evidence.

`_docs/_workflows/SMOKE_EVIDENCE.md` itself remains below the ignored workflow
tree and therefore requires the same explicit owner review, force-track, owner
commit, and fresh `git ls-files`/`git show HEAD` parity gate as TASK-545's
runtime/schema/declaration files. The agent never stages it. The cookbook and
`.gitignore` use ordinary tracked-file handling.

L01's owned tests use temporary synthetic image bytes; this leaf does not edit those
fixtures. Do not commit a fake product screenshot as historical smoke proof. The exception enables future
real Playwright evidence under task directories. Documentation requires human
review for synthetic-data/secret/PII safety before adding evidence.

Document all three exact L01 CLI stages. Phase 1 is
`phase1 --repo-root <root> --task TASK-### --suite <registered-suite>
--profile certification --session <validated-session> --audit-directory`; it
derives the canonical task/session
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

Add one cookbook recipe requiring a thin registered adapter to return exact
scenario `id`, `pass`, `title`, non-empty profile-specific `variants`, each
variant's machine-observed visible assertions and empty console errors, and at
least one scenario-owned screenshot. The adapter calls
`requireManifestableScenarioResults(scenarios, globalScreenshots)` directly (or
through a named one-line delegate that performs no projection) before returning
the shared report. The global screenshot array must equal the unique ordered
scenario union. The recipe explicitly composes TASK-552 lifecycle, polling,
process supervision, persistent profile worker, set-based DB helpers,
`BrowserTransport`, checkpoints, redaction, timing, reporting, and reverse
cleanup; it creates no task-local server/browser/worker/report loop.

Cookbook tests or source guards must pin all fields above and show that missing
title/variant/assertion/scenario screenshot, a false assertion, nonempty console
errors, duplicate screenshot ownership, or global-union drift fails before
manifest creation. The later TASK-548 pilot is the first real adapter consumer
of this recipe, not its owner.

## Error/compatibility flow

- Existing loose ignored PNG/JPG behavior remains.
- Evidence manifest/PNG/checkpoint files under the exact path can be tracked.
- Wrong/missing hash or untracked referenced file fails closure.
- Phase-1 validation of new untracked evidence is not a closure pass. Missing owner review/
  staging pauses the workflow; wrong/stale resume identity fails, repeated exact resume is
  read-only, and the final owner commit remains after metadata-delta closure validation.
- TASK-511's deleted historical PNGs remain Git-history-only evidence. Current
  tracked `_smoke` inventory contains zero TASK-511 files, so none is copied,
  restored, or fabricated as current proof.

## Testing Requirements

```bash
bun test tests/unit/workflows/smokeEvidence.test.ts
node _docs/_workflows/lib/smoke-evidence.mjs --help
if git check-ignore -q --no-index _docs/_workflows/_smoke/evidence/task-545/task-545-certification/example.png; then exit 1; fi
git check-ignore -q --no-index _docs/_workflows/local-only-script.mjs
git check-ignore -q --no-index _docs/_workflows/_smoke/unrelated.png
git diff --check
```

These commands assert both ignored/unignored exit codes; `|| true` is forbidden because
it would make the evidence exception unverifiable.

## Documentation Updates Required

- Create `_docs/_workflows/SMOKE_EVIDENCE.md` with the exact L01 CLI phases and
  link the shared runtime-smoke cookbook instead of duplicating its lifecycle.
- Add the one generic manifestable-visible-evidence recipe to
  `docs/develop/runtime-smoke-cookbook.md`; later suite recipes consume it.
- TASK-545-04-L03 owns board and changelog 1257 closure evidence.
