# TASK-054-11-02: Commerce DB Schema and Migrations
# FileName: TASK-054-11-02_Commerce_DB_Schema_and_Migrations.md

**Priority:** High  
**Category:** DB/Migrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-01  
**Status:** To Do

---

## Goal
Persist commerce products and collections in normalized schema with deterministic indexes.

## Scope
1. Add commerce tables:
   - `commerce_products`
   - `commerce_collections`
   - `commerce_product_collections`
2. Add unique and filter indexes (`slug`, `status`, `updated_at`).
3. Add migration + journal/snapshot entries.

## Files (planned)
- `core/db/schema.ts`
- `core/db/migrations/0042_commerce_foundation.sql` (new)
- `core/db/migrations/meta/0042_snapshot.json` (new)
- `core/db/migrations/meta/_journal.json`
- `tests/unit/commerce/schema.test.ts` (new)

## Pseudocode
```sql
create table commerce_products (...);
create unique index commerce_products_slug_idx on commerce_products(slug);
create table commerce_collections (...);
create table commerce_product_collections (...);
```

## Acceptance Criteria
1. Migration is idempotent and reversible by migration tooling.
2. Table/index design supports listing and admin edits.
3. DB-backed tests validate key constraints.
