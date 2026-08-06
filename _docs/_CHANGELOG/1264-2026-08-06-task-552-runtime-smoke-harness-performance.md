# 1264 - TASK-552 Runtime Smoke Harness Performance

**Date:** 2026-08-06
**Version:** Unreleased
**Status:** Draft — TASK-552 reopened; not closure evidence
**Tasks:** TASK-552, TASK-552-01, TASK-552-01-L01, TASK-552-02,
TASK-552-02-L01, TASK-552-03, TASK-552-03-L01, TASK-552-03-L02,
TASK-552-04, TASK-552-04-L01, TASK-552-04-L02, TASK-552-04-L03,
TASK-552-04-L04
**Type:** Testing/Developer Experience/Performance/Reliability/Security/Docs/Task Board

## Reopen Notice

The first closure correctly recorded a shared runtime-smoke CLI, lifecycle,
workers, DB batching, browser segmentation, checkpoints and a green TASK-540
fast run. It incorrectly described TASK-540 as fully migrated. The registered
adapter still transitively executes 148 legacy `_docs/_workflows/task-540*`
modules (approximately 58,886 lines), including 57 source-string handler bodies
behind 160 accepted operation IDs and dynamic module compilation. The old
runtime therefore remains executable and cannot be deleted. The widget adapter
also still spawns a 5,530-line runner with private Bun/Playwright process and
fixed-wait loops instead of reusing the shared dispatcher end to end.

Changelog 1264 is reopened as a draft. Its historical `19:38.580` run remains
valid behavior/performance evidence for the wrapped suite, but it is not native
migration or reclosure evidence.

## Landed Baseline Retained

- One strict `scripts/runtime-smoke.ts` entry point with a static suite registry,
  fast/certification profiles, awaited lifecycle, bounded polling/process
  supervision, repository guards, timing, redaction and structured reporting.
- Shared profile-isolated worker, transactional DB batch, browser segment/frame
  and checkpoint primitives.
- Registered TASK-540, widget-contract and production-boundary adapters.
- Historical TASK-540 fast receipt: 7/7 scenarios, 496 logical actions, 13
  PNGs, zero console errors and complete recorded cleanup in `19:38.580`.
- No product endpoint, auth/RBAC/CSRF/rate behavior, product schema, migration,
  snapshot, journal or index change; migration `0070` remains intentional.

## Corrective Work Required Before Reclosure

- `TASK-552-04-L01` freezes all 169 legacy paths into one exclusive source
  manifest and relocates only its stable contract/shared partition without an
  early registered-adapter switch.
- `TASK-552-04-L02` replaces all 57 dynamic source bodies while preserving all
  160 operation IDs/alias schemas through static typed definitions on shared
  profile-scoped `WorkerPool` processes with privileged phase closure.
- `TASK-552-04-L03` exports and adopts shared `PlaywrightCliDispatcher`,
  `SupervisedServerResource` and self-registering `startSupervisedServer(...)`,
  composes and switches native TASK-540, and cohesively splits/migrates the
  complete oversized widget runner/test so TASK-540, widget, production and
  future TASK-547 consume the same wrappers.
- `TASK-552-04-L04` ports essential tests, deletes exactly 169 old TASK-540
  workflow modules plus obsolete workflow-only tests, documents the final
  native architecture and runs fresh fast plus certification benchmarks.

## Reclosure Evidence Pending

This entry returns to final/indexed status only when the final tree proves:

- zero executable imports/requires/subprocess paths into the deleted TASK-540
  workflow runtime;
- no TASK-540 Bun worker source strings, Blob/object URL, dynamic code import,
  arbitrary module path or raw SQL/source frame;
- exact 57-handler/160-operation parity and no widget-private Playwright,
  process or fixed-wait loop;
- seven scenarios, all 496 logical actions, 13 valid PNGs, visible assertions,
  zero console/page errors and complete cleanup in both profiles;
- focused/full runtime-smoke tests, static checks, line counts, task graph and
  documentation gates green.
