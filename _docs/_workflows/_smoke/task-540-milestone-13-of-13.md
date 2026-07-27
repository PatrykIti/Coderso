# TASK-540 smoke milestone: the full plan completes, 13 of 13 checkpoints

Recorded as a bisect anchor. Supersedes `task-540-milestone-11-of-13.md` for
progress purposes; that file is kept because its reproduction caveats still apply.

> **This file is itself superseded, and is routinely misquoted. Read this first.**
>
> It records the state at commit `92cc3bd5` — the plan reaching 13 of 13
> checkpoints while the terminal cleanup still failed. That is what it proves and
> all it proves. It is **not** the record of a passing run, and its "What is NOT
> yet true" section below is history, not current state.
>
> The cleanup was fixed afterwards, in `939328ef` and `c89fa96c`, and the run
> that came out green is recorded in
> **`task-540-smoke-green-full-strength.md`** — `pass: true`, all 496 actions,
> 13/13 screenshots, full terminal cleanup, at the shipped 60 s auth window.
> Cite that file for a green run. Cite this one for the blocker inventory and the
> reproduction caveats, which still apply.

## What this file is dated to

| | |
|---|---|
| commit | `92cc3bd5`, tag `task-540-plan-complete` |
| superseded by | `c89fa96c`, tags `task-540-smoke-green` and `task-540-smoke-green-full-strength` |
| fixes that landed in between | `939328ef`, `c89fa96c` — both terminal-cleanup repairs |

## What is proven

| fact | value |
|---|---|
| checkpoints | **13 of 13** |
| plan | **all 496 actions execute** |
| screenshots retained | **13 of 13 PNGs on disk** |
| proven on | three consecutive runs: `fbf0ce10d37c`, `6f71b5da1cde`, `1640c86416da` |
| tag | `task-540-plan-complete` (commit `92cc3bd5`) |

Completion is asserted by the harness itself, not inferred — `plan-execution.mjs`
requires `completed.size === 496`, `browserReceipts.length === 420` and
`runtimeReceipts.length === 76` before it seals the failure tracker. A sealed
tracker is why these runs report no `failedActionId`: absence of that field is the
signature of a completed manifest, not lost attribution.

The screenshots corroborate it physically. `cleanup-lifecycle.mjs` phase 2 deletes
acquired screenshots on the failure path and asserts the full required set on the
success path, so 13 surviving PNGs prove cleanup ran in success mode.

## What was NOT yet true at `92cc3bd5` — since fixed

Everything in this section is the state at `92cc3bd5`. All of it was closed by
`939328ef` and `c89fa96c`; see `task-540-smoke-green-full-strength.md`. The
sentence below is the one most often quoted as if it described the present. It
does not.

`pass: true`. The 496-action plan is green; the **terminal cleanup** is not. Its
failure has moved forward one phase per fix:

| run | cleanup phase | cause |
|---|---|---|
| `fbf0ce10d37c` | 5 | the failure recorder destroyed the cause it was recording |
| `6f71b5da1cde` | 8 | the bootstrap CAS statement could not be dispatched — four of ten predicates bound values postgres.js cannot serialise, killing the child before Postgres saw the UPDATE |
| `1640c86416da` | 9 | `validateSuccessfulScreenshotSet` demanded 13 distinct hashes, but two screenshots are legitimately byte-identical |

Cleanup has 10 phases.

## Reproduction caveats — read before comparing a future run

1. **The runs above were taken with the auth-rate window at 5 s in the test
   database**, not the shipped 60 s. Do not read that as the window's present
   value — the later full-strength run found no `security.settings` row at all,
   i.e. the shipped default. `bun run smoke:auth-window:status` reports the live
   value; restore with `bun run smoke:auth-window:restore`. This is
   configuration, not code: the barrier still derives its wait as
   `windowSeconds * 1000 + 1000`, so at 5 s it waits 6 s and the six barriers
   cost 36 s instead of 366 s. A run on the shipped default is ~7.5 min slower
   and additionally exercises the tight `bootstrapUser: 10` against
   `maxRequests: 10` capacity proof — which is precisely what the full-strength
   run recorded in `task-540-smoke-green-full-strength.md` did, in 56.5 min
   against the 5 s run's 36.9 min.
2. Screenshots are removed on a failing run, so a PNG count of zero means "the run
   failed", not "the run produced nothing".
3. `DATABASE_URL` points at Render's transaction pooler (:6432);
   `DATABASE_DIRECT_URL` (:5432) serves the three session-advisory-lock paths.

## Two screenshots are byte-identical, and that is correct

`task-540-wf540smoke-related-a-stale.png` and
`task-540-wf540smoke-related-b-dark.png` share one sha256. Only `rc-034` (release
the held stale related-A response) and `rc-036` (unroute) run between the two
captures, and `rc-035-stale-proof` asserts the released response leaves the visible
state unchanged. So identical pixels are the specified outcome: nothing between the
captures may repaint unless stale-response rejection breaks. The pair is declared in
`EXPECTED_IDENTICAL_SCREENSHOT_PATH_GROUPS` rather than the uniqueness check being
weakened.

## Blockers closed to get here

Thirteen, of which twelve were harness defects and one was a real product defect.
Eight of the twelve were unsatisfiable by construction — not merely failing, but
incapable of passing:

| blocker | class |
|---|---|
| driver omitted `additionalPaths`, so a screenshot write tripped its own allowlist | driver |
| `muted` addressed a Radix option host by text its label does not carry | unsatisfiable |
| every `unit` action returned literal `{ ok: true }`, so hard failures read as PASS | diagnostic |
| `rc-011` gated on a page-wide alert absence an unrelated mounted alert forbade | unsatisfiable |
| `rc-021` wait budget too tight for this database | environmental |
| `rc-025` contract forbade a request the application is specified to make | unsatisfiable |
| `ru-061a` asserted the exact negation of its own contract row | unsatisfiable, and inverted |
| `ru-073` compared a constant against itself | unsatisfiable |
| `ru-090a` required a `requestfailed` event Chromium never emits on document teardown | unsatisfiable |
| the failure recorder threw while recording, destroying the cause | diagnostic |
| phase-8 CAS predicates bound unserialisable values | unsatisfiable |
| phase-8 compared microsecond `created_at` against a millisecond baseline through a guard rejecting microseconds | unsatisfiable |
| phase-9 required a repaint the product must not perform | unsatisfiable |

`ru-061a` deserves its own note: with the assertion inverted, a real write-back
data-loss defect would have **passed**. It did not merely fail — it pointed the
drift detector the wrong way, and only executing it could reveal that.

The one product defect: the entry editor discarded a fetched entry when a keystroke
beat hydration and then persisted an empty row. Review found a second,
metadata-only channel of the same loss. Both are fixed with regression tests in
`tests/vitest/ui-integration/entry-editor-hydration-race.test.tsx`.
