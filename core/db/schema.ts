/**
 * The database schema's single public import surface.
 *
 * Every table lives in exactly one domain module under `./tables/`, named for the
 * area it serves, so a failing assertion or a stack frame points straight at the
 * one file that owns the definition instead of at a monolith that has to be
 * bisected by hand. This file re-exports all of them, so `from ".../db/schema"`
 * keeps resolving every symbol it resolved before the split and no consumer
 * changed.
 *
 * Two literal contracts pin this path and must keep resolving here:
 *   - `core/db/drizzle.config.ts` sets `schema: "./core/db/schema.ts"`, so
 *     drizzle-kit discovers the tables THROUGH these re-exports. A missing or
 *     misspelled `export *` line still type-checks and still imports, but hides
 *     a table from drizzle-kit, and the next `db:generate` would emit a DROP
 *     TABLE for it. `tests/unit/db/schemaTableFacade.test.ts` guards that by
 *     asserting the facade projects exactly the migration snapshot.
 *   - `core/db/client.ts` does `import * as schema from "./schema"`, which
 *     collects re-exported bindings into the namespace object drizzle receives.
 *
 * Add a table to the domain module it belongs to; add a new domain module here.
 */

export * from "./tables/analytics";
export * from "./tables/assistant";
export * from "./tables/bookings";
export * from "./tables/commerce";
export * from "./tables/content";
export * from "./tables/customScreens";
export * from "./tables/engagement";
export * from "./tables/forms";
export * from "./tables/identity";
export * from "./tables/integrations";
export * from "./tables/media";
export * from "./tables/navigation";
export * from "./tables/observability";
export * from "./tables/operations";
export * from "./tables/pages";
export * from "./tables/platform";
export * from "./tables/posts";
export * from "./tables/seo";
export * from "./tables/theming";
export * from "./tables/widgets";
