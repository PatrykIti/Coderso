# 234-2026-02-18 - Coderso listings execution engine

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-07-02

## Key Changes
- Core/Content: Added `core/services/content/listingSources.ts` with normalized source adapters for `entries`, `posts`, `users`, and `taxonomies`.
- Core/Content: Extended `queryBuilderService` with `buildListingExecutionPlan` and `executeListingQuery` (allowlisted fields, stable fallback sort, bounded pagination).
- Core/Security: Added runtime guards for disallowed fields per source and deterministic error code `listing_query_field_not_allowed`.
- Tests: Added execution coverage for deterministic ordering, array filters, projection behavior, and source allowlist contracts.
