# TASK-552-01: Shared Runtime Smoke Entry Point and Timings
# FileName: TASK-552-01-Shared-Runtime-Smoke-Entry-Point-And-Timings.md

**Parent Task:** TASK-552
**Priority:** High
**Category:** Testing Infrastructure / Performance / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-552 parent contract audit PASS
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family closure)

---

## Objective

Establish the reusable suite-neutral runtime-smoke foundation consumed by every
later TASK-552 leaf and by future workflows. This umbrella does not own product
flows, DB operations, Playwright batching, checkpoints, benchmarks, or closure.

The exact public command is:

```text
bun scripts/runtime-smoke.ts run --suite <task-540|widget-contract|production-boundary> --profile <fast|certification> --session <name>
```

No alias (`--target`, `certify`, another script path) is part of the contract.
Suite-specific choices belong to static adapter descriptors rather than extra
public process/database arguments.

## Execution Leaf

| ID | Title | Status |
|---|---|---|
| TASK-552-01-L01 | Shared CLI, Lifecycle, Timing, and Adapter Registry | ✅ Done |

Implementation begins only from the physical execution-ready leaf:
`TASK-552-01-L01-Shared-CLI-Lifecycle-Timing-And-Adapter-Registry.md`.

## Owned Contract Boundary

The leaf owns shared modules under `scripts/runtime-smoke/` for strict CLI
parsing, fixed adapter lookup, local host lifecycle/readiness polling, bounded
process supervision, monotonic timing/counters, repository mutation guarding,
redaction, cleanup aggregation, and versioned reporting. The top-level
`scripts/runtime-smoke.ts` is the only public entry point.

The static registry initially reserves exactly `task-540`, `widget-contract`,
and `production-boundary`, resolving only fixed repository-local adapter paths.
The adapters may land later without changing the parser or public command.
Missing/unavailable adapters fail closed. New workflows extend the registry and
write a thin adapter; they reuse lifecycle, worker, browser, checkpoint,
cleanup, timing, and report capabilities rather than copying them.

Shared code must never receive arbitrary shell fragments, module paths, SQL,
remote origins, output paths, or a full enumerable environment. It emits one
bounded secret-safe structured result and always reaps owned process groups in
`finally`, preserving primary and cleanup failures.

## Dependency and Acceptance Boundary

- TASK-552-02 consumes the lifecycle/supervision/timing and adapter capability
  contracts without editing their files.
- TASK-552-03 consumes the same seams for browser transport, checkpoints, and
  adapters without reopening the CLI parser.
- All new human-authored source/test files remain below 1,000 physical lines.
- Targeted parser/registry/lifecycle/polling/timing/repository/process/report
  tests pass before TASK-552-02 starts.

## Security Contract

- **Visibility:** local developer/test CLI; no HTTP/API surface.
- **Auth/RBAC/CSRF/rate limits:** product contracts are unchanged.
- **Validation:** exact verb/options/order-independent pairs, closed suite and
  profile enums, safe session names, canonical local paths/origins, bounded
  streams, exact result schemas, and reject-unknown behavior.
- **Anti-abuse/secrets:** public write hardening is not applicable. No shell,
  arbitrary adapter path, remote origin, inherited full environment, secret in
  arguments/reports, or unbounded output is permitted.
