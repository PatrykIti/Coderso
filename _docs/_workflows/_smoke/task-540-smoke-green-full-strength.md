# TASK-540 smoke receipt: fully green at the shipped 60 s auth window

This is the durable record of the programme's two fully green runs. Until this
file existed, the only place either was written down was a git tag annotation.

A tag annotation is not evidence. It is not part of the trail the closure
machinery reads, it lives outside the tree so no diff or gate can see it, and it
can be deleted or simply never pushed by anyone with write access. Both runs are
therefore transcribed here, in the tree, alongside the milestone files.

## Provenance of every fact below

| | |
|---|---|
| source | the two annotated git tags, transcribed verbatim |
| `task-540-smoke-green-full-strength` | tagger date `2026-07-27 06:31:07 +0000`, target commit `c89fa96c` |
| `task-540-smoke-green` | tagger date `2026-07-27 05:33:43 +0000`, target commit `c89fa96c` |
| re-derived here? | **no** — the runs are not reproduced by this file |

Read them yourself with `git tag -n20 task-540-smoke-green-full-strength`. If
this file and the annotation ever disagree, the annotation is the original and
this file is the copy — but only the copy is guaranteed to still be there.

Only the "measured in this working tree" section below is a fresh measurement.
Everything in the two run tables is transcription.

## Run 1 — full strength, at the shipped auth window

| fact | value |
|---|---|
| tag | `task-540-smoke-green-full-strength` |
| commit | `c89fa96c` (`fix(task-540-smoke): stop phase 9 asserting a directory mtime no run can restore`) |
| result | `pass: true` |
| run nonce | `wf540-d77c5608d17c` |
| wall time | 56.5 min |
| plan | all 496 actions |
| screenshots | 13 of 13 |
| terminal cleanup | full |
| auth-rate window | the **shipped 60 s default** |
| `security.settings` row | none — the deployment ran on shipped defaults |

Because no `security.settings` row overrode the default, this run also exercises
the tight `bootstrapUser: 10` against `maxRequests: 10` capacity proof that a
shortened window relaxes. The annotation states plainly what that makes it: *"the
full-strength evidence the TASK-540-06 smoke gate requires."*

## Run 2 — the first green run, at a shortened window

| fact | value |
|---|---|
| tag | `task-540-smoke-green` |
| commit | `c89fa96c` — the same bytes as run 1 |
| result | `pass: true` |
| run nonce | `wf540-0537b37077ce` |
| wall time | 36.9 min |
| plan | all 496 actions |
| screenshots | 13 of 13 |
| terminal cleanup | complete |
| auth-rate window | **5 s in the test database**, not the shipped 60 s |

The annotation records this as the first fully green run in the programme's
history, and carries its own caveat: restore with
`bun run smoke:auth-window:restore` and re-run for full-strength evidence. Run 1
above is that re-run.

## These runs describe `c89fa96c`, not HEAD

Stated plainly because it is the one way this file could be misread. Both runs
were executed against commit `c89fa96c`. Neither is a receipt for the current
bytes, and neither substitutes for the canonical run TASK-540-06 owns.

What has and has not moved since, measured with
`git diff --name-only c89fa96c..HEAD -- <paths>` at HEAD `4b81a764`:

| path set | changed since `c89fa96c` |
|---|---|
| `_docs/_workflows/task-540-smoke*` (harness, contract, executor, host, all child modules) | **nothing** — empty diff |
| `core/**` | `core/db/schema.ts` split into 20 `core/db/tables/*.ts` modules (`e6bbee69`) |
| `tests/**` | one schema-facade suite plus nine workflow suites |
| `_docs/_TASKS/**`, `_docs/_workflows/task-540-implement.mjs`, `task-540-local-orchestrator.mjs`, `scripts/` | changed |

So the smoke harness itself is byte-identical to what produced these runs, while
the product's database layer is not. That is a fact about the diff, and nothing
more: it is **not** a claim that run 1 remains valid at HEAD, and it does not
discharge the canonical smoke gate. A refactor of the schema layer is exactly the
kind of change a runtime smoke exists to exercise.

## Measured in this working tree, 2026-07-27

The one section here that is a fresh measurement rather than a transcription.
Thirteen screenshots are on disk, and their mtimes place them inside run 1's
window rather than run 2's — every one falls after the run-2 tag was written at
05:33:43 and before the run-1 tag at 06:31:07:

```
$ sha256sum _docs/_workflows/_smoke/task-540-wf540smoke-*.png
$ stat -c '%y  %n' _docs/_workflows/_smoke/task-540-wf540smoke-*.png
```

| mtime (2026-07-27) | sha256 (first 16) | file |
|---|---|---|
| 05:38:40 | `11947e2f5c267c6f` | `task-540-wf540smoke-media-prior-pending.png` |
| 05:41:05 | `b453864de6d2a8cb` | `task-540-wf540smoke-button-image-light.png` |
| 05:43:25 | `c32d544a3d7dd5cb` | `task-540-wf540smoke-tabs-content-dark.png` |
| 05:44:19 | `36658ee94c63b317` | `task-540-wf540smoke-tabs-keyboard-light.png` |
| 05:45:20 | `095067b627331bef` | `task-540-wf540smoke-space-selection-dark.png` |
| 05:46:28 | `45322c0ad7398917` | `task-540-wf540smoke-dirty-save-failure.png` |
| 05:46:47 | `be6fbe73c8e93d25` | `task-540-wf540smoke-dirty-guards-final.png` |
| 05:47:12 | `9d72473755a79608` | `task-540-wf540smoke-related-first-failure.png` |
| 05:49:12 | `7f4314ae10951266` | `task-540-wf540smoke-related-a-stale.png` |
| 05:49:18 | `7f4314ae10951266` | `task-540-wf540smoke-related-b-dark.png` |
| 05:51:07 | `82061dd3ce3a4d49` | `task-540-wf540smoke-responsive-user-a-light.png` |
| 05:52:18 | `3910962d83f30e53` | `task-540-wf540smoke-responsive-user-b-dark.png` |
| 05:56:00 | `27b0bca52199d442` | `task-540-wf540smoke-responsive-user-a-converged.png` |

Two facts follow, and only two.

**The identical pair is still identical.** `related-a-stale` and `related-b-dark`
share sha256 `7f4314ae10951266...`, exactly as
`EXPECTED_IDENTICAL_SCREENSHOT_PATH_GROUPS` in
`_docs/_workflows/task-540-smoke/executor/finalization.mjs:46` declares they must
be. See the milestone file for why that is the specified outcome and not a bug.

**These files are not in git.** `.gitignore:63` ignores `_docs/_workflows/`
wholesale; the two milestone markdowns and this receipt are tracked despite it,
the PNGs are not. `git check-ignore -v` confirms. Deleting the working tree
destroys them, which is the same fragility as trusting a tag — and the reason the
run facts are written out above rather than left as a pointer at the pixels.

The mtime argument is inference from filesystem metadata, not proof of
attribution. It is corroboration, not the receipt.

## What this file does not claim

- It does not claim a run at HEAD. See the diff table above.
- It does not flip any status, and it is not a gate receipt.
- It does not authorize closure. Changelog 1252 and the closure transaction
  remain owned by TASK-540-06-L01 and are unaffected by this file existing.

## Related files

- `task-540-milestone-13-of-13.md` — the plan reaching 13/13 checkpoints at
  `92cc3bd5`, **before** the cleanup fixes. Its "What is NOT yet true" section is
  superseded by run 1 above; it is kept for its blocker inventory and
  reproduction caveats.
- `task-540-milestone-11-of-13.md` — the earlier bisect anchor at `6df739cc`.
