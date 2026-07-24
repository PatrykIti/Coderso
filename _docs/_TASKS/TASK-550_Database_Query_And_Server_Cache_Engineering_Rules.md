# TASK-550: Database Query and Server Cache Engineering Rules
# FileName: TASK-550_Database_Query_And_Server_Cache_Engineering_Rules.md

**Priority:** High
**Category:** Docs / Process / Database / Performance / Caching
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-07-24
**Completed:** 2026-07-24
**Changelog:** 1262

---

## Overview

Codify the database-query, schema, mutation, connection-pool, retention, and
server-cache engineering rules established by the owner-requested audit of the
live PostgreSQL database and the repository's database call sites. The audit
compared observed database behavior with query construction, table/index
definitions, mutation boundaries, pagination, search, retention, and existing
cache usage in the codebase.

The resulting rules live in the repository root `AGENTS.md` and are mandatory
for future implementation work. They make performance a measured correctness
contract for both small single-replica installations and large multi-replica
services, while preserving the existing security, migration, and testing
requirements.

## Scope

- Require bounded queries, explicit projections, stable keyset pagination, and
  batching instead of unbounded table or heavy JSONB reads.
- Require query and index shapes to be designed together and verified with
  representative `EXPLAIN (ANALYZE, BUFFERS)` evidence rather than assumed from
  index presence.
- Require schema changes to account for hot filter/sort paths, foreign-key
  enforcement, index write amplification, append-only retention, and complete
  migration artifacts.
- Require mutations to validate before writing, use explicit atomic transaction
  boundaries, map owned database conflicts, and emit cache invalidation only
  after commit.
- Establish a local-first server-cache contract for small/single-replica sites
  and an optional Redis-backed implementation for multi-replica deployments,
  with equivalent key, TTL, invalidation, security, and failure semantics.
- Require bounded cache cardinality, request coalescing, deterministic
  namespacing, sensitive-data exclusions, cross-replica invalidation, and
  correctness when cache storage is unavailable.
- Require small- and large-dataset regression coverage, query-count/latency
  budgets, concurrency and stampede tests, and documented operational limits.

## Deliverable

- Root `AGENTS.md` contains the canonical database/query/mutation and
  local-first/optional-Redis server-cache engineering rules.
- TASK-551 owns the separately decomposed implementation program. TASK-550 does
  not implement product source, migrations, cache adapters, or runtime behavior.

## Security Contract

- Documentation/process-only change.
- No endpoint, route visibility, authentication, RBAC, CSRF, rate-limit,
  nonce/HMAC, CAPTCHA, schema, migration, persistence, dependency, or runtime
  behavior changes in this task.
- The rules preserve fail-closed validation and prohibit caching credentials,
  secrets, raw privileged settings, unredacted personal data, or
  authorization-dependent responses under shared keys.

## Sub-Tasks

- None. This is a completed documentation/process task.

## Testing Requirements

- `git diff --check`
- repository task-graph/index validation
- `node --check` for the TASK-551 workflow authored alongside its task family
- `bun --cwd core lint`
- `bun --cwd core lint:types`

The orchestrator records the combined validation result after the independently
owned TASK-551 task-contract and workflow files are present. TASK-550 itself has
no executable production path or dedicated runtime test lane.

## Documentation Updates Required

- Root `AGENTS.md` — canonical engineering rules.
- `_docs/_TASKS/README.md` — TASK-550 closure and TASK-551 priority program row.
- `_docs/_CHANGELOG/1262-2026-07-24-task-550-database-query-and-server-cache-engineering-rules.md`.
- `_docs/_CHANGELOG/README.md` — changelog 1262 consumption and TASK-551
  reservation.

## Completion Notes

- The owner-requested database and code-query audit was translated into durable
  repository-wide engineering rules instead of remaining a one-time report.
- Product implementation, migrations, performance gates, local cache substrate,
  optional Redis support, cache adoption, and rollout remain owned by the
  prioritized TASK-551 family.
