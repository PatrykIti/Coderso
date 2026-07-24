# TASK-551-01-L02: Small/Large Fixtures, Baselines, and Budgets
# FileName: TASK-551-01-L02-Small-Large-Fixtures-Baselines-And-Budgets.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-01
**Priority:** High
**Category:** Database / Performance / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-01-L01
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Build reproducible, scoped fixture profiles and freeze the initial performance
budgets that all later TASK-551 leaves must meet. The large profile models
growing lists, append-heavy logs/revisions, search candidates, and aggregate
traffic without copying production data.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `scripts/task-551-database-baseline.ts`,
`tests/perf/fixtures/task551DatabaseScale.ts`,
`tests/perf/fixtures/task551DatabaseBudgets.ts`, and
`tests/perf/database-query-baseline.test.ts` only.

**Forbidden:** production code, migration/meta files, task/changelog/workflow
files, and all TASK-511/517/493/518 owned paths.

Seed one isolated family scenario at a time with these exact row counts:

| Family | Small | Large | Relationship recipe |
|---|---:|---:|---|
| users | 100 | 10,000 | exactly one primary role per user; the deterministic additional-role subset is specified below |
| pages | 500 | 100,000 | authors cycle through profile users |
| content types / entries | 20 / 2,000 | 200 / 100,000 | entries distributed evenly by type |
| posts | 1,000 | 100,000 | authors cycle through profile users |
| media | 2,000 | 100,000 | 20 / 1,000 folders; exactly 10% null folder |
| form submissions | 2,000 | 100,000 | 20 / 200 forms, even distribution |
| bookings | 2,000 | 100,000 | 20 / 1,000 resources/services; 20% each current status |
| search history | 5,000 | 100,000 | distributed evenly by profile users |
| `access_logs` | 5,000 | 100,000 | actor/user references cycle through profile users; methods cycle `GET,POST,PATCH,DELETE`; status codes cycle `200,201,400,403,404,429,500` |
| `audit_logs` | 5,000 | 100,000 | actor references cycle through profile users including every tenth row `NULL`; actions cycle `create,update,publish,delete` |
| `email_delivery_logs` | 5,000 | 100,000 | status cycle `queued,sent,failed`; provider cycle `smtp,mock`; no support rows |
| `integration_requests` + `integrations` support | 5,000 + 10 | 100,000 + 200 | requests distributed evenly across exact support integrations; status cycle `pending,success,failed` |
| `webhook_deliveries` + `webhooks` support | 5,000 + 20 | 100,000 + 200 | deliveries distributed evenly across support webhooks; status cycle `pending,success,failed` and attempts cycle `0,1,2,3` |
| `sessions` | 5,000 | 100,000 | users cycle through profile users; exactly 20% revoked, 20% expired-unrevoked, and 60% active |
| `settings` | 50 | 500 | deterministic unique keys; scalar/object/array values repeat in a fixed three-row cycle |
| `redirects` | 500 | 100,000 | unique source paths; status-code cycle `301,302,307,308`; exactly 90% enabled |
| assistant docs / chunks | 200 / 2,000 | 10,000 / 100,000 | exactly 10 chunks per doc |
| assistant executions / undo items | 1,000 / 3,000 | 100,000 / 300,000 | exactly 3 undo items per execution |
| analytics sessions / pageviews | 2,000 / 10,000 | 20,000 / 100,000 | exactly 5 pageviews per session |
| each page/content/post/widget/detail revision family | 2,000 | 100,000 | 20 / 100 versions for 100 / 1,000 parents |

The row counts are insufficient without deterministic predicate selectivity, so
the following distribution is equally frozen. Status/filter percentages are
exact because each affected family count is divisible by 100; assignment is by
`ordinal % 100`, never random:

| Family | Exact distribution used by every seed/check |
|---|---|
| users / roles | statuses `active=80%`, `inactive=10%`, `pending=10%`; create exactly five fixture roles; every user has exactly one primary role `ordinal % 5`, while every tenth user has one additional distinct role `(ordinal + 1) % 5`, so every user has at least one and only that subset has two total assignments |
| pages | `published=50%`, `draft=30%`, `scheduled=10%`, `archived=10%`; published rows have non-null `published_at`, scheduled rows have non-null future `published_at`; authors cycle over every profile user, yielding exactly 5 pages/author small and 10 pages/author large |
| entries | same status cycle as pages; visibility `public=70%`, `private=20%`, `password=10%`; password rows receive a synthetic non-reversible fixture hash and no output assertion may expose it |
| posts | same status/publish-time cycle as pages; primary tag is exactly `task551-post-tag-${ordinal % 10}` and every row with `ordinal % 10 === 0` additionally has `task551-post-extra`, so each primary tag and the extra tag select exactly 10% |
| forms / submissions | forms `published=60%`, `draft=30%`, `archived=10%`; submission status `new=70%`, `processed=20%`, `spam=10%` |
| media | `image=80%`, `file=20%`; exactly 10% null folder as above; MIME and created-time filters have 10 equal buckets; primary tag is `task551-media-tag-${ordinal % 10}`, while every `ordinal % 100 === 0` row also has `task551-media-pair`, making the normalized AND array `["task551-media-pair","task551-media-tag-0"]` select exactly 1% |
| bookings | the already-pinned five statuses remain exactly 20% each; resource/service/time-window filters each select exactly 1%, 10%, and 50% through named fixture cases |

Every list-sort family groups exactly ten adjacent rows on the same sort
timestamp (`base + floor(ordinal / 10) ms`) so the `id` tiebreaker is exercised;
append-only families that do not use a keyset timestamp retain unique
`base + ordinal ms` timestamps. Search tokens use exact integer hit counts,
never percentages or fractional rounding:

| Search family | Small common / rare hits | Large common / rare hits |
|---|---:|---:|
| users | 1 / 1 | 100 / 10 |
| pages | 5 / 1 | 1,000 / 100 |
| entries | 20 / 2 | 1,000 / 100 |
| posts | 10 / 1 | 1,000 / 100 |
| media | 20 / 2 | 1,000 / 100 |
| assistant docs | 2 / 1 | 100 / 10 |
| assistant chunks | 20 / 2 | 1,000 / 100 |

`task551-common` and `task551-rare` occur on exactly those first N
authorization-eligible rows in stable ordinal order; the query result must equal
the corresponding integer. Every searchable row has a unique per-row token and
`task551-miss` occurs zero times. For public-search families, seed exactly one
deterministic draft/private/password row with `task551-hidden` and no eligible
row with that token; its expected result is zero. Thus successful common/rare,
unique point-hit, hidden authorization-zero, and true miss-zero paths all use
real stored text rather than mocked counts.
Each budget record names one of the exact `point`, `filter-1pct`,
`filter-10pct`, `filter-50pct`, `search-common`, `search-rare`, `search-miss`, or
`search-hidden`, `equal-sort-page`, `pages-author`, `users-role-30pct`,
`posts-tag-10pct`, or `media-tags-and-1pct` cases. `pages-author` means fixture
author ordinal 0 and returns exactly 5/10 rows (small/large); `users-role-30pct`
means role 1 and returns 30/3,000 users; the two tag cases use the literal binds
above and return exactly 100/10,000 posts and 20/1,000 media rows. No seed or
plan test may choose its own distribution, predicate, tag array, or query token.

TASK-551-03-L02 summary/facet evidence uses the same rows and the frozen
operation clock `2026-01-15T12:00:00.000Z`. The following additional recipes are
exact in both profiles:

- page/post/entry/form/user status totals follow the percentage tables above;
  summary expectations are integer multiplication by the physical family count;
- every page/post/entry author cycles through all profile users, so author facets
  contain exactly 100/10,000 global members before their bounded facet paging;
  entry content-type counts remain exactly even and include a separate synthetic
  authorized zero-entry type in the facet fixture;
- role `0` is the administrator role; primary assignments give every role
  exactly 20% of users, and the every-tenth additional assignment goes to role
  `1`, yielding role usage `20%,30%,20%,20%,20%`, administrator counts
  20/2,000 and `soleAdministratorId=null`; a separate scoped mutation fixture
  contains exactly one administrator for the sole-admin guard;
- form-submission `created_at` is an explicit exception to the general fixture
  timestamp rule. For `ordinal % 4 === 0`, set it to
  `asOf - (1 + (floor(ordinal / 4) % 6)) days`; for every other row, set it to
  `asOf - (8 + (floor(ordinal / 4) % 30)) days`. The first branch is always
  inside the inclusive rolling-seven-day predicate and the second is always
  outside it, so `rollingSevenDays` is exactly 500/25,000; spam remains exactly
  200/10,000 from the independent status distribution;
- media `size = 1_000 + ordinal` bytes, giving exact global bytes
  `n*1_000 + n*(n-1)/2`; non-null media folders cycle evenly through flat fixture
  folders, tags use the existing ten equal buckets, and type totals remain
  80% image/20% file;
- booking resources total 20/1,000. Reservation `starts_at`/`ends_at` are the
  second explicit exception to the general timestamp rule. Timezones cycle
  `UTC,America/New_York,Asia/Tokyo`; convert the following local-wall-clock
  instants in each row's IANA timezone back to UTC, and set `ends_at` exactly 60
  minutes after `starts_at`:

| `ordinal % 100` | Exact local start relative to `asOf` in the row timezone | Today | Upcoming |
|---:|---|---:|---:|
| `0..9` | same local date, `asOfLocal - (1 + ordinal % 2) hours` | yes | no |
| `10..19` | same local date, `asOfLocal + (1 + ordinal % 2) hours` | yes | yes |
| `20..59` | local noon on `asOfLocalDate + (1 + ordinal % 40) days` | no | yes |
| `60..99` | local noon on `asOfLocalDate - (1 + ordinal % 40) days` | no | no |

The at-most-two-hour same-day offsets are valid for all three frozen timezone
localizations of `asOf`. Because both profiles are divisible by 100, `today` is
exactly 400/20,000, `upcoming` exactly 1,000/50,000, and `startsAt <= asOf`
(`pastOrCurrent`) exactly 1,000/50,000. Tests derive none of these classes from
the host timezone.

Every summary test asserts both unfiltered global values and exact
`matchingTotal` after one filter from the declared 1%/10%/50% or status cases.
First/middle/last pages must return byte-identical global summaries and facet
pages; no expectation may be calculated from returned `items.length`.

IDs are UUIDv5 from `(validatedRunScope, profile, family, ordinal)`. Timestamps
other than form-submission `created_at` and booking `starts_at`/`ends_at` follow
the frozen unique/equal-sort rule above from `2026-01-01T00:00:00Z`; the two
exceptions use only the exact `asOf` formulas above. The scope only isolates
concurrent runs and is persisted hashed. Cleanup derives the same IDs, deletes
child-first, and asserts zero owned rows remain.
The physical tables named before `+ support` receive the first count; every
support-table count is part of the same scenario and is asserted independently.
Every initial inventory budget record must declare exactly one matrix scenario;
an unmapped hot/release-gated record or an undeclared supporting table fails
`database_baseline_invalid` before seeding.

## Implementation Pseudocode

```ts
type ScaleProfile = "small" | "large";
type FixtureFamily = keyof typeof TASK551_SCALE_COUNTS;
const PROFILE_POOL_CAPACITY = strictReadonly({ small: 2, large: 10 });
const MEASUREMENT = strictReadonly({ repetitions: 3, warmups: 5, samples: 30,
  calibrationWarmups: 20, calibrationSamples: 100, maxP95VariancePercent: 20 });
const TASK551_SCALE_DISTRIBUTIONS = strictReadonly({
  users: { active: 80, inactive: 10, pending: 10, roles: 5 },
  contentStatus: { published: 50, draft: 30, scheduled: 10, archived: 10 },
  entryVisibility: { public: 70, private: 20, password: 10 },
  formStatus: { published: 60, draft: 30, archived: 10 },
  submissionStatus: { new: 70, processed: 20, spam: 10 },
  userRoles: { primaryPerUser: 1, additionalEvery: 10, additionalPerMatch: 1 },
  postTags: { buckets: 10, extraTag: "task551-post-extra", extraEvery: 10 },
  mediaTags: { buckets: 10, pairTag: "task551-media-pair", pairEvery: 100 },
  equalSortGroupSize: 10,
});
const TASK551_SEARCH_HIT_COUNTS = strictReadonly({
  users: { small: { common: 1, rare: 1 }, large: { common: 100, rare: 10 } },
  pages: { small: { common: 5, rare: 1 }, large: { common: 1_000, rare: 100 } },
  entries: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
  posts: { small: { common: 10, rare: 1 }, large: { common: 1_000, rare: 100 } },
  media: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
  assistantDocs: { small: { common: 2, rare: 1 }, large: { common: 100, rare: 10 } },
  assistantChunks: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
});

function expectedSearchHits(
  family: keyof typeof TASK551_SEARCH_HIT_COUNTS,
  profile: ScaleProfile,
  token: "common" | "rare" | "unique" | "hidden" | "miss",
): number {
  if (token === "unique") return 1;
  if (token === "hidden" || token === "miss") return 0;
  return TASK551_SEARCH_HIT_COUNTS[family][profile][token];
}

async function withTask551Dataset<T>(profile: ScaleProfile, family: FixtureFamily, run: (scope: FixtureScope) => Promise<T>) {
  const scope = await seedExactOwnedRows(profile, family, validatedRunScope());
  try { return await run(scope); }
  finally { await deleteOnlyOwnedRows(scope); }
}

async function measureQueryFamily(contract: BudgetContract, scope: FixtureScope) {
  // Each of three repetitions runs five unrecorded warmups then 30 samples.
  return sampleExact(MEASUREMENT, contract, scope);
}

async function measurePoolAcquisitionWait(profile: ScaleProfile, sql: SqlClient) {
  // Create a harness-owned pool with max PROFILE_POOL_CAPACITY[profile], reserve
  // exactly that numeric capacity, synchronize one
  // additional waiter, measure reserve->acquire latency, then release every
  // reservation in finally. This is an external contention measurement and
  // does not consume TASK-551-02's later telemetry implementation.
}

function p95SpreadPercent(repetitionP95Ms: readonly [number, number, number]): number {
  const median = medianOfThree(repetitionP95Ms);
  if (repetitionP95Ms.every((value) => value === 0)) return 0;
  return ((Math.max(...repetitionP95Ms) - Math.min(...repetitionP95Ms)) /
    Math.max(median, 0.1)) * 100;
}

function freezeCeiling(kind: QueryKind, medianRepetitionPercentileMs: number) {
  const floor = { point: 1, list: 5, search: 10, aggregate: 10, append: 2, pool: 5 }[kind];
  return ceilToTenthMillisecond(Math.max(floor, medianRepetitionPercentileMs * 1.25));
}
```

Invalid profiles/counts fail `database_baseline_invalid`; unreachable DB fails
preflight without seeding. Measurement reports sanitized fingerprints only.
The context receipt pins commit/schema digest, Linux/architecture, CPU model and
logical count, memory, PostgreSQL major/config digest, Bun version, pool size,
and container mode. Calibration uses 20 warmups plus 100 timed `SELECT 1` calls
through the same pool. Checks normalize with
`observedMs * referenceCalibrationMedian / currentCalibrationMedian` and reject
a context/version mismatch or factor outside `0.80..1.20`.
The receipt requires pool size `2` for the small profile and `10` for the large
profile; any inherited driver/env maximum is ignored by the harness-owned pool.

For p50/p95/p99, freeze the median of the three repetition percentiles with the
formula above. `--freeze` also writes exact numeric query-count, rows-read,
rows-returned, transferred-byte, and pool-wait ceilings to
`task551DatabaseBudgets.ts`. Missing/placeholders fail. After review, only
`--check` is permitted; re-freezing requires a task-contract amendment.

## Testing Requirements

- Every matrix family matches its exact small/large count and relationship
  recipe; off-by-one seeds or residual derived IDs fail.
- Assert the exact status/visibility/role/tag/MIME/filter/search distributions,
  equal-sort groups, and publication exclusions above before any warmup. Mutate
  one ordinal bucket or searchable token and prove pre-measurement validation
  fails rather than freezing a different plan. Role assertions require one
  primary assignment for every user and one distinct additional assignment only
  for ordinals divisible by ten. Search assertions compare each profile/family
  to the literal integer table through `expectedSearchHits`, including one-hit,
  hidden-zero, and miss-zero cases; no percentage-derived expectation is legal.
- Pin the four index-evidence fixture cases independently: page author 0 returns
  exactly 5/10, role 1 returns 30/3,000, the one-element post containment array
  returns 100/10,000, and the sorted unique media AND array returns 20/1,000.
  Mutating author cycling, role direction, tag spelling/order/deduplication, or
  the second-tag ordinal fails fixture validation before plan capture.
- Run representative point/list/search/aggregate/append families; record current
  baseline separately from target budget.
- Saturate only this harness's bounded test pool and freeze acquisition-wait
  p50/p95/p99 without inspecting postgres.js internals or logging SQL/binds.
- Prove a deliberately unbounded fixture query fails the rows/query-count gate.
- Run the named perf file twice with exact 3 × (5 warmup + 30 sample) runs and
  reject `p95SpreadPercent` above 20% or normalization outside `0.80..1.20`.
  The spread denominator is the median repetition p95 floored at `0.1 ms`; three
  exact zero p95 values yield `0%` rather than division by zero.
- Freeze tests pin formula/rounding and prove every stored ceiling is numeric;
  check mode cannot rewrite or derive a ceiling.
- With the frozen operation clock, assert the literal small/large counts
  `rollingSevenDays=500/25_000`, booking `today=400/20_000`,
  `upcoming=1_000/50_000`, and `pastOrCurrent=1_000/50_000` in UTC, New York,
  and Tokyo.
  Mutating either exception back to the general January 1 timestamp rule must
  fail before summary/plan measurement.

## Security Contract

- No routes or product writes beyond isolated test fixtures.
- Existing protected route auth/RBAC/CSRF/rate limits remain in force when route
  measurement is used.
- Reject unknown CLI/profile fields and clamp row/sample/time limits.
- Synthetic data only; no `.env` values, SQL binds, PII, or row bodies in output.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/perf/database-query-baseline.test.ts`
- `set -a && source .env && set +a && bun scripts/task-551-database-baseline.ts --profile small`
- `set -a && source .env && set +a && bun scripts/task-551-database-baseline.ts --profile large`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs; emit the sanitized budget contract for TASK-551-10-L02.

## Quantified Acceptance

- Small and large datasets match declared row counts exactly and leak zero rows
  after teardown.
- Every declared distribution and selectivity case has exact expected counts in
  both profiles; public/private authorization and equal-sort fixtures are never
  inferred from column defaults.
- Budgets cover 100% of inventory records classified hot/release-gated.
- Pool acquisition-wait budgets are reproducible from the independent reserved-
  connection contention fixture before TASK-551-02 begins.
- Repeat-run p95 variance is at most the frozen tolerance (initial ceiling 20%);
  a later leaf cannot increase any budget without a task-contract amendment.
- TASK-551-02 remains blocked until every gated inventory ID has finite
  checked-in numeric latency/query/row/byte/pool ceilings.
