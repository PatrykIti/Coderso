# Workflow Archive Disposition Matrix

**Task:** TASK-576 (changelog 1298)
**Date:** 2026-08-17
**Scope:** Separating the historical workflow corpus from the executable surface.

The executable workflow surface is the two globs enforced by
`tests/unit/workflows/workflowStaticContract.test.ts`:

- `:(glob)_docs/_workflows/*.mjs` (top-level canonical entries)
- `:(glob)_docs/_workflows/lib/*.mjs` (shared driver lib)

This directory (`_docs/_workflows/_archive/`) is deliberately OUTSIDE that
surface. Git pathspec `*` crosses `/` unless `:(glob)` magic is used, so the
static-contract gate now enumerates the surface with `:(glob)` pathspecs and
the archive never matches the executable globs. Files here are retained as
byte-identical historical evidence; they are not run by any workflow gate and
`node --check` is not required for them (the gate only checks canonical
tracked `.mjs`).

## Disposition rules

- **archive** = moved to `_docs/_workflows/_archive/` with content unchanged
  (historical record), removed from the executable surface, disposition
  recorded here.
- **repair** = edited in place to satisfy a gate.
- **migrate** = rewritten to a canonical name/role/driver with a fresh audit.

Every file below has disposition **archive**. No file was repaired or migrated;
the 29 syntax-invalid files and all forbidden-directive offenders therefore
leave the executable surface without weakening the `node --check` gate or the
forbidden-directive regexes.

## Matrix (31 tracked top-level files)

| # | File (basename) | Canonical name? | node --check | Disposition |
|---|------------------|-----------------|--------------|-------------|
| 1 | task-511-author-audit.mjs | yes (name only) | invalid | archive |
| 2 | task-514-impl.mjs | no | invalid | archive |
| 3 | task-516-impl.mjs | no | invalid | archive |
| 4 | task-517-author.mjs | no | invalid | archive |
| 5 | task-519-520-author.mjs | no | invalid | archive |
| 6 | task-519-520-fix.mjs | no | invalid | archive |
| 7 | task-519-520-fix2.mjs | no | invalid | archive |
| 8 | task-519-520-fix3.mjs | no | invalid | archive |
| 9 | task-519-520-fix4.mjs | no | invalid | archive |
| 10 | task-519-impl.mjs | no | invalid | archive |
| 11 | task-520-impl.mjs | no | invalid | archive |
| 12 | task-521-author.mjs | no | invalid | archive |
| 13 | task-521-impl.mjs | no | invalid | archive |
| 14 | task-522-impl.mjs | no | invalid | archive |
| 15 | task-523-full.mjs | no | invalid | archive |
| 16 | task-524-author.mjs | no | invalid | archive |
| 17 | task-524-impl.mjs | no | invalid | archive |
| 18 | task-525-author.mjs | no | invalid | archive |
| 19 | task-525-impl.mjs | no | invalid | archive |
| 20 | task-526-full.mjs | no | invalid | archive |
| 21 | task-528-full.mjs | no | invalid | archive |
| 22 | task-529-full.mjs | no | invalid | archive |
| 23 | task-530-full.mjs | no | invalid | archive |
| 24 | task-531-534-author.mjs | no | invalid | archive |
| 25 | task-531-impl.mjs | no | invalid | archive |
| 26 | task-532-impl.mjs | no | invalid | archive |
| 27 | task-533-impl.mjs | no | invalid | archive |
| 28 | task-534-impl.mjs | no | invalid | archive |
| 29 | task-535-remediation.mjs | no | invalid | archive |
| 30 | task-536-545-author-audit.mjs | no | valid | archive |
| 31 | task-554-implement-diag.mjs | no | valid | archive |

Totals: 30 non-canonical top-level files (28 syntax-invalid, 2 syntax-valid)
plus 1 canonical-named but syntax-invalid file (task-511-author-audit.mjs,
a pre-canonical author-audit script with top-level `return` and no canonical
audit driver; repairing it would require a full migration, so it is archived).

## Extension: legacy canonical-named pre-driver scripts (drift correction)

The TASK-545 audit's fail-fast classifier (M-545-07) stopped at the first
non-canonical file, so the driver-contract checks never ran against the
remaining canonical-named top-level entries. A fresh full-inventory pass
(`bun tests/unit/workflows/workflowStaticContract.test.ts` + an enumeration
script that runs every driver check over every tracked entry) exposed that 15
canonical-named scripts predate the TASK-545 driver contract (bulk-tracked by
the 2026-08-15 `chore(workflows): track the whole _docs/_workflows tree`
commit) and never received the canonical driver wiring. They fail the exact
identity-result guard, the `runCanonicalAuditRounds` import, or the
independent post-audit lens declaration. They are historical records for
closed or not-yet-started tasks (486, 536-545, 548, 551, 556, 557); none is
referenced as a live workflow by any current task. Per the disposition rules
they are **archived** byte-identically (same treatment as the 31 files
above), keeping the gate strict.

| # | File (basename) | Role | Missing driver contract | Disposition |
|---|------------------|------|-------------------------|-------------|
| 32 | task-486-implement.mjs | implement | exact-identity guard + post lens ids | archive |
| 33 | task-536-implement.mjs | implement | exact-identity guard | archive |
| 34 | task-537-implement.mjs | implement | exact-identity guard | archive |
| 35 | task-538-implement.mjs | implement | exact-identity guard | archive |
| 36 | task-539-fix.mjs | fix | exact-identity guard | archive |
| 37 | task-540-fix.mjs | fix | exact-identity guard | archive |
| 38 | task-541-implement.mjs | implement | exact-identity guard | archive |
| 39 | task-544-implement.mjs | implement | exact-identity guard | archive |
| 40 | task-545-implement.mjs | implement | exact-identity guard + post lens ids | archive |
| 41 | task-548-author-audit.mjs | author-audit | runCanonicalAuditRounds import | archive |
| 42 | task-551-author-audit.mjs | author-audit | runCanonicalAuditRounds import | archive |
| 43 | task-556-author-audit.mjs | author-audit | runCanonicalAuditRounds import | archive |
| 44 | task-556-fix.mjs | fix | exact-identity guard | archive |
| 45 | task-556-implement.mjs | implement | exact-identity guard | archive |
| 46 | task-557-implement.mjs | implement | exact-identity guard | archive |

Also fixed during the drift correction: `workflowStaticContractDrivers.ts`
called `assertTask554CloseoutGuardContract` without importing it; the owning
workflow entries test previously never reached the closeout branch because the
fail-fast enumeration always threw on an earlier legacy entry. Added the
missing import.

## Forbidden-directive offenders removed from the executable surface

The TASK-545 audit (H-545-03) found forbidden action directives in tracked
workflows. ALL of the following are archived in this change, so no forbidden
`git commit` instruction or dynamic changelog allocation remains in the
executable glob:

- `git commit` / dynamic `highest+1` directives:
  task-514-impl.mjs (`:207` `highest+1`, `:212` `git add -A && git commit`),
  task-516-impl.mjs, task-519-impl.mjs, task-520-impl.mjs,
  task-521-impl.mjs, task-522-impl.mjs.
- `commit on the worktree` matches:
  task-523-full.mjs (`:198`), task-524-impl.mjs (`:133`),
  task-525-impl.mjs (`:125`), task-526-full.mjs (`:169`),
  task-528-full.mjs (`:124`), task-529-full.mjs (`:124`).
- Dynamic next-free/highest+1 changelog allocation prose in ~15 files
  (task-514-impl.mjs, task-516-impl.mjs, task-519-impl.mjs, task-520-impl.mjs,
  task-521-impl.mjs, task-522-impl.mjs, task-523-full.mjs, task-524-impl.mjs,
  task-525-impl.mjs, task-526-full.mjs, task-528-full.mjs, task-529-full.mjs,
  task-530-full.mjs, task-531-534-author.mjs, task-535-remediation.mjs and
  other legacy author/impl files in this archive).

The remaining executable surface (21 canonical top-level entries + 22 lib
modules) contains no forbidden directives and every canonical tracked `.mjs`
passes `node --check`.

## Post-archive executable surface

Top-level canonical entries (6, all TASK-545 migration-built): task-522-author,
task-543-implement, task-554-author-audit, task-554-closeout, task-554-fix,
task-554-implement. Every remaining top-level entry passes the full static
contract, including the driver checks. The 15 legacy canonical-named pre-driver
scripts are archived under the Extension section above.
