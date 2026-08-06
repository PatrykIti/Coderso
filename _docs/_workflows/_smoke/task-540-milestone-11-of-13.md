# TASK-540 smoke milestone: 11 of 13 checkpoints

Recorded so a later regression has an exact point to bisect back to.

## What was reached

| fact | value |
|---|---|
| commit | `6df739cc` (`fix(smoke): scope the route duplicate guard to the pre-park window and stop erasing browser causes`) |
| checkpoints passed | **11 of 13** |
| plan progress | action **424 of 496 (85%)** |
| first failing action | `ru-061a-a-durable-bypass-read` |
| reported reason | `unclassified` (see caveat below) |
| cleanup | `bootstrap_uncertain_baseline_failed`, phase 8 |
| run nonce | `775055c64c25` |
| wall time | 28.1 min |

Checkpoints passed, in execution order:

```
ord  84  bi-028-media-pending-shot
ord 125  bi-067-final-shot
ord 174  tc-042-shot
ord 209  tk-028-shot
ord 245  ss-029-shot
ord 285  dg-033-failure-shot
ord 294  dg-042-final-shot
ord 309  rc-009-failure-shot
ord 339  rc-033-stale-shot
ord 343  rc-037-final-shot
ord 407  ru-048-a-first-shot
--- first failure at ord 424: ru-061a-a-durable-bypass-read ---
ord 439  ru-074-b-shot        (not reached)
ord 483  ru-109-converged-shot (not reached)
```

`responsive-users` had never executed before this run: everything from `rc-026`
through `ru-061` ran for the first time in the programme, so failures at or after
`ru-061a` are latent defects nobody had exercised rather than regressions.

## Reproduction caveats — read before comparing a future run

1. **The auth-rate window was set to 5 s in the test database**, not the shipped
   60 s default. `bun run smoke:auth-window:status` reports the live value.
   That is configuration, not code: the barrier still derives its wait from the
   live setting (`windowSeconds * 1000 + 1000`), so at 5 s it waits 6 s and the
   six barriers cost 36 s instead of 366 s. A run on the shipped default is
   ~7.5 min slower and additionally exercises the tight
   `bootstrapUser: 10` against `maxRequests: 10` capacity proof, which a 5 s
   window relaxes. Restore with `bun run smoke:auth-window:restore`.
2. Screenshots are NOT retained on a failing run — the executor removes acquired
   screenshots during cleanup. "11 of 13" therefore means execution passed those
   ordinals, not that 11 PNGs exist on disk.
3. The database is a disposable remote test instance. `DATABASE_URL` points at
   Render's transaction pooler (:6432); session-advisory-lock paths use
   `DATABASE_DIRECT_URL` (:5432).

## How this point was reached

Blockers found and closed, in order. Five were harness defects; one was a real
product defect found incidentally.

| blocker | ordinal | cause |
|---|---|---|
| `bi-028-media-pending-shot` | 84 | the standalone driver omitted `additionalPaths`, so a screenshot write produced an empty repository delta and tripped its own allowlist |
| `dg-024-entry-nav-cancel` | 275 | `muted` was registered as `[role="option"]:text-is("Muted")`, unmatchable against a Radix `SelectItem` whose label lives in a nested span; the tone Select stayed open and Radix correctly held `body{pointer-events:none}` |
| — | — | every `browser-run-code` action with `outputSchemaId: "unit"` returned a literal `{ ok: true }`, so hard-failure frames read as PASS and the smoke blamed an action three steps downstream |
| `rc-011-visible-retry` | 311 | settlement gated on a page-wide `[role="alert"]` absence that an unrelated permanently-mounted alert made unsatisfiable |
| `rc-021-related-tab-save` | 326 | wait budget too tight for this database; tripled under the owner's undetermined-cause rule, no assertion changed |
| `rc-025-clear-a1` | 331 | the frozen contract contradicted itself: the shared route handler forbade a second request that the application is specified and unit-tested to make |
| — | — | product defect: the entry editor discarded a fetched entry when a keystroke beat hydration, then persisted an empty row; a second, metadata-only channel of the same data loss was found during review |

## Verification standard applied

Every fix was proven in a real browser or against the real database, not from the
diff. Three adversarial audits covered the modularization; each blocker fix was
independently verified before a smoke run was spent on it. Twice the empirical
proof REFUTED the obvious hypothesis — a Radix pointer-events leak at `dg-024`,
and the hydration fix being causal for `rc-021` — which is why the evidence bar
was set where it was.
