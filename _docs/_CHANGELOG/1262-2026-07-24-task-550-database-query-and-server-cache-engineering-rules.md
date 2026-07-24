# 1262 - TASK-550 Database Query and Server Cache Engineering Rules

**Date:** 2026-07-24
**Version:** Unreleased
**Tasks:** TASK-550
**Type:** Docs/Process/Database/Queries/Caching/Performance/Task Board

## Overview

Codifies the owner-requested PostgreSQL and repository query audit as mandatory
engineering rules in root `AGENTS.md`. The rules cover bounded query design,
schema/index co-design, transactional mutations, retention, connection-pool
discipline, measured performance evidence, and a local-first server cache with
an optional Redis implementation for multi-replica deployments.

## Key Changes

### Database and query engineering

- Requires explicit lightweight projections, bounded result sets, deterministic
  keyset pagination, batching, and elimination of avoidable N+1 query patterns.
- Requires query/index alignment and representative small- and large-dataset
  `EXPLAIN (ANALYZE, BUFFERS)` plus query-count and latency evidence.
- Makes index selectivity, foreign-key access paths, write amplification,
  append-only retention, and complete migration artifacts part of schema design.

### Mutation and cache correctness

- Requires rejectable work before writes, explicit atomic transactions, owned
  conflict mapping, and cache invalidation only after a successful commit.
- Establishes a bounded local in-process cache as the default for a small
  single-replica site and an optional Redis adapter for multi-replica scale.
- Requires equivalent key/TTL/invalidation semantics, request coalescing,
  deterministic namespaces, cross-replica invalidation, safe failure behavior,
  and strict secret/authorization-aware cache exclusions.
- Makes public-to-restricted visibility transitions fail closed: they require a
  synchronous fence or a narrow authoritative database check before serving a
  cached public value, even when that means the path is not a zero-query hit.

### Planning and governance

- Adds completed TASK-550 to the task board.
- Prioritizes the separately decomposed TASK-551 implementation family with 11
  technical children, 25 executable leaves, and changelog 1263 reserved for
  implementation closure.

## Security

Documentation/process-only change. No endpoint, auth, RBAC, CSRF, rate-limit,
schema, migration, dependency, or runtime behavior changed. The new rules
explicitly forbid shared caching of secrets, privileged settings, unredacted
personal data, or authorization-dependent responses without safe identity
partitioning.

## Validation

- Administrative files are covered by `git diff --check` and task-graph/index
  validation.
- The combined TASK-550/TASK-551 contract handoff includes `node --check` for
  the TASK-551 workflow plus `bun --cwd core lint` and
  `bun --cwd core lint:types`.
