# TASK-537-01-L01: Transaction-Aware Taxonomy Mutations

# FileName: TASK-537-01-L01-Transaction-Aware-Taxonomy-Mutations.md

**Parent Task:** TASK-537
**Parent Subtask:** TASK-537-01
**Priority:** High
**Category:** Taxonomy Domain / Transactions
**Estimated Effort:** Medium
**Dependencies:** TASK-514, TASK-541 (program order)
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1249

---

## Scope

Split taxonomy replacement into validation/preparation and application helpers that use
the caller-provided executor for every read and write. Preserve the existing public
replaceEntryTaxonomies wrapper for standalone callers.

## Source ownership

This leaf is the sole TASK-537 writer of
core/services/content/taxonomyService.ts and owns the compatibility/changed-behavior
updates required before its gate in
`tests/unit/content/taxonomyService.test.ts`. It must not edit entryService.ts,
seoService.ts, other tests, routes, docs, tasks, or changelog indexes.

## Implementation Pseudocode

~~~ts
export type TaxonomyExecutor = Pick<
  typeof db,
  "select" | "insert" | "delete"
>;

type PreparedTaxonomyTerm = Readonly<
  Pick<ContentTerm, "id" | "taxonomyId" | "name" | "slug">
>;

export type EntryTaxonomyPlan = Readonly<{
  entryId: string;
  // UUID from a persisted row or the existing valid-UUID fallback; never a raw slug.
  typeId: string;
  taxonomyIdsToClear: readonly string[];
  category: PreparedTaxonomyTerm | null;
  tags: readonly PreparedTaxonomyTerm[];
  assignmentTermIds: readonly string[];
  resolvedTagNames: readonly string[];
}>;

async function resolveContentTypeIdWithExecutor(
  executor: TaxonomyExecutor,
  identifier: string
) {
  normalize identifier exactly as the existing adapter does;
  select only contentTypes.id through executor by UUID-or-slug;
  if a row exists, return its persisted UUID;
  if identifier is a syntactically valid UUID, preserve the existing UUID fallback;
  otherwise return null without querying a UUID column with raw slug text;
}

async function listTaxonomiesWithExecutor(
  executor: TaxonomyExecutor,
  typeIdOrSlug: string
): Promise<ContentTaxonomy[]> {
  resolvedTypeId = await resolveContentTypeIdWithExecutor(executor, typeIdOrSlug);
  if unresolved, return [];
  select explicit ContentTaxonomy fields through executor;
  order by contentTaxonomies.kind;
  return the existing mapped shape;
}

export async function listTaxonomies(typeIdOrSlug: string) {
  return listTaxonomiesWithExecutor(db, typeIdOrSlug);
}

export async function prepareEntryTaxonomyMutation(
  executor: TaxonomyExecutor,
  entryId: string,
  typeIdOrSlug: string,
  input: { categoryId?: string | null; tagIds?: string[] }
): Promise<EntryTaxonomyPlan> {
  normalize/dedupe requested IDs without changing their category/tag roles;
  taxonomies = await listTaxonomiesWithExecutor(executor, typeIdOrSlug);
  validate explicit category/tag keys against taxonomy availability;
  after availability validation but before the term query, reject every malformed
    requested term UUID with Error("taxonomy_term_missing");
  termRows = await executor.select explicit id/taxonomyId/name/slug fields
    for all unique requested IDs, ordered by contentTerms.name then contentTerms.id;
  reject missing or wrong-taxonomy terms before any write;

  // Existing replacement semantics are intentional compatibility: whenever
  // taxonomy replacement is requested, both enabled kinds are replaced.
  // Omitted categoryId means null; omitted tagIds means [].
  taxonomyIdsToClear = every enabled category/tag taxonomy ID;
  assignmentTermIds = category first, then validated tags, with deterministic dedupe;
  category/tags = primitive-only PreparedTaxonomyTerm projections; Date objects do not
    enter the trusted plan;
  tags and resolvedTagNames use the same deterministic name-then-id order;
  freeze each public term object, each array, and the outer plan;
  return the deeply frozen EntryTaxonomyPlan containing only public taxonomy data;
}

export async function applyEntryTaxonomyMutation(
  executor: TaxonomyExecutor,
  plan: EntryTaxonomyPlan
): Promise<EntryTaxonomyAssignments> {
  query current term IDs in plan.taxonomyIdsToClear through executor;
  delete only plan.entryId assignments for those taxonomies;
  insert plan.assignmentTermIds through executor;
  return {
    category: plan.category
      ? { ...plan.category, createdAt: new Date(0), updatedAt: new Date(0) }
      : null,
    tags: plan.tags.map(term => ({
      ...term,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    })),
  };
  // Do not return resolvedTagNames or a second result/plan shape.
}

export async function replaceEntryTaxonomies(entryId, typeIdOrSlug, input) {
  return db.transaction(async tx => {
    plan = await prepareEntryTaxonomyMutation(tx, entryId, typeIdOrSlug, input);
    return applyEntryTaxonomyMutation(tx, plan);
  });
}
~~~

`ContentTerm` is the existing exported public return type in this owner; do not add an
`EntryTaxonomyTerm` alias. The non-exported `PreparedTaxonomyTerm` contains primitives
only, so freezing the plan is meaningful; mutable `Date` instances are created fresh only
at the public `EntryTaxonomyAssignments` return boundary. `TaxonomyExecutor` must be exactly the exported capability
pick shown above; a `typeof db | DbTransaction` union is forbidden because the Drizzle
transaction handle itself exposes `transaction()` and would not make the no-nested-
transaction invariant structural. The exact coordinator seam exported from
`./taxonomyService` is `EntryTaxonomyPlan`, `prepareEntryTaxonomyMutation`, and
`applyEntryTaxonomyMutation`. Export those names directly; do not hide them behind a
default export, rename them in the coordinator, or create a second plan/result shape.
The existing standalone wrapper remains exported under its current name.

`entryService.ts` awaits `applyEntryTaxonomyMutation` for its write effect and reads
`plan.resolvedTagNames` for the `content_entries.tags` update. It does not expect the
apply result to expose tag names. Copy the readonly names only at the mutable DB-update
boundary. Standalone callers continue to receive only `EntryTaxonomyAssignments`.

All helpers use explicit projections. The preparation plan contains public taxonomy
primitive fields only and is not a cache object. Its runtime immutability is enforced with
`Object.freeze` on the outer plan, every owned array, and every primitive-only term object; TypeScript
`readonly` alone is insufficient because apply trusts the prepared values. `listTaxonomies(typeIdOrSlug)` remains the public
global-db adapter, while preparation resolves either a persisted UUID or stable content-
type slug through the supplied executor. Preserve the current valid-UUID fallback and
unknown-slug behavior. Other existing public taxonomy exports, including
`resolveEntryTagsFromTaxonomy`, remain available and compatible even after the metadata
coordinator stops using the latter. If concurrency requires revalidation, perform it
through the same executor before the first write; do not reopen a nested transaction or
savepoint.

## Errors and compatibility

Preserve taxonomy_category_disabled, taxonomy_tag_disabled, taxonomy_term_missing, and
taxonomy_term_invalid. A preparation error writes nothing. Assignment insert/delete
failure rejects the caller transaction. Standalone behavior and return shape remain.
Malformed non-null category/tag IDs fail as `taxonomy_term_missing` after taxonomy
availability is resolved but before the term UUID query or any write. This preserves the
existing disabled-taxonomy error precedence while preventing raw PostgreSQL UUID errors
from becoming the domain contract. Do not add a new error code or route mapping.

The replacement compatibility rule is exact: a present taxonomy mutation replaces both
enabled kinds, not only keys present in the nested object. An omitted `categoryId` clears
the category and omitted `tagIds` clears tags; disabled-kind errors retain their existing
explicit-key behavior. Term rows and derived names use `name ASC, id ASC`; equal names
therefore remain deterministic. The public assignment terms retain the existing
`createdAt: new Date(0)` and `updatedAt: new Date(0)` values rather than silently exposing
new timestamp values. No global-table cleanup is permitted in tests.

## Regression-test shape

This leaf updates `tests/unit/content/taxonomyService.test.ts` before its source gate.
Replace the global mutable `contentTypeId`/`entryId` cleanup harness with locally owned,
uniquely prefixed fixtures. Every test uses `try/finally`, deletes only its own entry and
content type in FK-safe order, and remains clean even when an assertion or injected seam
fails.

Include these exact symbols in the existing service import so a missing or renamed
type/helper fails compilation; retain the suite's existing create/update/list helpers as
additional imports:

~~~ts
import {
  applyEntryTaxonomyMutation,
  listTaxonomies,
  prepareEntryTaxonomyMutation,
  replaceEntryTaxonomies,
  type ContentTerm,
  type EntryTaxonomyAssignments,
  type EntryTaxonomyPlan,
  type TaxonomyExecutor,
} from "../../../core/services/content/taxonomyService";
~~~

Add a call-through spy for the standalone `db.transaction` and restore it in `finally`:
one `replaceEntryTaxonomies` call opens exactly one transaction. For direct helper tests,
wrap the real outer `tx` in a typed recording proxy/executor that records
`select`/`insert`/`delete` and fails if `transaction` is accessed; preparation/application
must use only that supplied executor and create zero nested transactions/savepoints.

Required cases are:

- UUID and content-type-slug standalone calls retain the same assignments and public
  return shape;
- malformed category and tag UUIDs preserve disabled-taxonomy precedence, otherwise
  throw `taxonomy_term_missing` before the term-query builder or any write is reached;
- missing and wrong-taxonomy terms preserve their current domain codes and write nothing;
- a pre-existing category and tags followed by `{ tagIds: [...] }` proves the existing
  full-replace rule by clearing the omitted category while replacing tags;
- duplicate requested tag IDs are deterministic, and equal tag names are ordered by ID;
- returned `ContentTerm` compatibility timestamps are fresh `Date(0)` objects on every
  apply result and cannot mutate the frozen primitive plan;
- outer plan, arrays, and nested primitive term objects are frozen and reject mutation
  before apply;
- a composed outer transaction faults immediately after taxonomy application and proves
  all assignment writes roll back;
- successful standalone replacement commits category/tags and returns only
  `EntryTaxonomyAssignments`, while `plan.resolvedTagNames` remains available to the
  coordinator.

TASK-537-03-L01 may add composed cross-domain rollback cases after this gate but cannot
re-baseline these executor/helper assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/taxonomyService.test.ts
~~~

Re-run the file once alone before declaring a failure.

## Acceptance criteria

- Entry metadata can prepare and apply taxonomy state inside its one transaction.
- No helper reads from global db while writing through a caller transaction.
- Known taxonomy validation errors occur before the first composed write.
- Direct helpers cannot open a transaction/savepoint; the standalone wrapper owns one.
- Public UUID-or-slug, full-replace, term shape, and error-code behavior stays compatible.
