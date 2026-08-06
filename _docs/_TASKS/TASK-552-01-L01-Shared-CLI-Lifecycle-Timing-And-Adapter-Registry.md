# TASK-552-01-L01: Shared CLI, Lifecycle, Timing, and Adapter Registry
# FileName: TASK-552-01-L01-Shared-CLI-Lifecycle-Timing-And-Adapter-Registry.md

**Parent Subtask:** TASK-552-01
**Priority:** High
**Category:** Testing Infrastructure / Runtime / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-552 contract audit PASS
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family closure)

---

## Objective

Create the suite-neutral runtime-smoke entry point and capabilities that every
later adapter reuses. This leaf changes no product flow and performs no DB or
Playwright optimization.

The only public command is:

```text
bun scripts/runtime-smoke.ts run --suite <task-540|widget-contract|production-boundary> --profile <fast|certification> --session <name>
```

## Exact Single-Writer Ownership

This leaf alone creates:

- `scripts/runtime-smoke.ts`;
- `scripts/runtime-smoke/contracts.ts`;
- `scripts/runtime-smoke/cli.ts`;
- `scripts/runtime-smoke/registry.ts`;
- `scripts/runtime-smoke/lifecycle.ts`;
- `scripts/runtime-smoke/polling.ts`;
- `scripts/runtime-smoke/timing.ts`;
- `scripts/runtime-smoke/process-supervisor.ts`;
- `scripts/runtime-smoke/repository-guard.ts`;
- `scripts/runtime-smoke/redaction.ts`;
- `scripts/runtime-smoke/report.ts`;
- `scripts/runtime-smoke/adapters/types.ts`;
- `tests/unit/runtime-smoke/cli-registry.test.ts`;
- `tests/unit/runtime-smoke/lifecycle-timing.test.ts`;
- `tests/unit/runtime-smoke/process-supervisor.test.ts`;
- `tests/unit/runtime-smoke/repository-report.test.ts`.

No other source, test, task, changelog, product, migration, or existing smoke
file may change in this leaf.

## Implementation Contract

- Parse strict reject-unknown pairs for the exact verb/options above; reject
  duplicates, missing values, control characters, path-like sessions, and
  unsupported suite/profile combinations before any side effect.
- Reserve exactly three suite IDs in a static registry. Each resolves to a
  fixed repository-local adapter path; arbitrary imports and module arguments
  are forbidden. A not-yet-landed adapter fails `smoke_adapter_unavailable`.
- Resolve the canonical repo root once. Validate local origins, owned ports,
  evidence paths, and process executable realpaths.
- Own one awaited lifecycle: stop admission, close adapters/workers/browser,
  reap exact process groups, verify ports/PIDs absent, then emit the report.
- Poll bounded conditions with monotonic deadlines. Fixed sleeps are forbidden
  except suite-declared product timing assertions.
- Record phase/scenario/process/snapshot/cleanup timings and counters without
  using elapsed time as the sole pass criterion.
- Take repository snapshots only through one canonical porcelain parser and
  hash bounded adapter-declared evidence paths safely.
- Emit versioned bounded JSON plus concise Markdown; raw child output remains
  private to strict adapter decoders and all known secret shapes are redacted.

## Execution Pseudocode

```ts
async function run(argv: string[], deps = defaults) {
  const input = parseExactArgs(argv);
  const suite = staticRegistry.require(input.suite);
  const ctx = await createRuntimeContext(input, deps);
  let primary: unknown;
  try {
    const adapter = await suite.loadFixedAdapter();
    return await ctx.timing.measure("suite", () => adapter.run(ctx));
  } catch (error) {
    primary = mapRuntimeSmokeError(error);
    throw primary;
  } finally {
    const cleanup = await ctx.lifecycle.closeAllNeverThrow();
    await emitBoundedReport({ ctx, primary, cleanup });
  }
}
```

## Failure Handling

Spawn failure, timeout, malformed output, unexpected stderr, repository
mutation, readiness failure, report failure, or incomplete cleanup is non-zero.
TERM escalates to KILL only for the exact owned process group. Cleanup errors
are aggregated without hiding the primary error. A signal runs the same
idempotent lifecycle once; a second signal cannot skip absence proof.

## Security Contract

- **Visibility:** local developer/test CLI; no HTTP endpoint.
- **Auth/RBAC/CSRF/rate limits:** unchanged product contracts.
- **Validation:** exact CLI, static adapters, canonical local paths/origins,
  bounded streams, strict reports, and reject-unknown objects.
- **Anti-abuse/secrets:** no public write. No shell, arbitrary executable,
  remote origin, full enumerable environment, credential in arguments, raw
  logs, cookies, tokens, DB URLs, SQL, binds, or PII in evidence.

## Tests and Gates

```bash
bun test tests/unit/runtime-smoke/cli-registry.test.ts \
  tests/unit/runtime-smoke/lifecycle-timing.test.ts \
  tests/unit/runtime-smoke/process-supervisor.test.ts \
  tests/unit/runtime-smoke/repository-report.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l scripts/runtime-smoke.ts scripts/runtime-smoke/*.ts \
  scripts/runtime-smoke/adapters/types.ts tests/unit/runtime-smoke/*.test.ts
```

Acceptance requires exact CLI/registry behavior, monotonic deterministic
receipts, bounded secret-free reports, and stable process/port absence on every
success and failure boundary. Every touched human-authored file is at most
1,000 physical lines.
