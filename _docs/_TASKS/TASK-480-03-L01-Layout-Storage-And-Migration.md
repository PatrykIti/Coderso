# TASK-480-03-L01: Layout Storage & Migration
# FileName: TASK-480-03-L01-Layout-Storage-And-Migration.md

**Parent Subtask:** TASK-480-03
**Priority:** High
**Category:** `dashboard` / `persistence`
**Estimated Effort:** Medium
**Dependencies:** TASK-480-01 (widget catalog: `DashboardWidgetType` enum +
`normalizeDashboardWidgetConfig`). The layout envelope composes the catalog but
does not redefine it.
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

- **Goal:** Persist a **per-user** dashboard layout so each admin's configured
  widget arrangement survives reload, tab, and device. Define the schema-first
  layout envelope, a dedicated storage table, and a repository with
  read/write/reset helpers. The stored value is **admin dashboard widgets** —
  explicitly NOT `core/widgets` page/content widgets.
- **Owning module/service:** `core/services/dashboard/dashboardLayout.ts`
  (schema/enums/defaults owner), `core/services/dashboard/dashboardLayoutRepository.ts`
  (DB read/write), `core/db/schema.ts` (table), `core/db/migrations/*` (artifacts).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/ORM_SPEC.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/DASHBOARD_WIDGETS_SPEC.md`.
- **Out of scope:** routes (L02), widget-data resolution (L03), caching (L04),
  per-widget config schemas (480-01).

### Storage decision (justify)

Evaluated three options:

1. **Reuse `user_settings` (key `dashboard.layout`).** Rejected. `user_settings`
   (`core/services/settings/userSettingsService.ts`) is an allowlisted enum of
   *small* UI prefs validated by `validateUserSettingValue`; a large,
   schema-versioned widget layout with its own migration story does not belong in
   that keyspace and would force a generic value column to carry domain-specific
   versioning.
2. **JSONB column on `users`.** Rejected. Widens the hot `users` row (read on
   every auth bootstrap), couples an unrelated personalization blob to the
   identity table, and complicates the `users` snapshot/migration surface.
3. **Dedicated `dashboard_layouts` table (CHOSEN).** Domain-owned, isolated
   migration + snapshot, keeps the `users` row lean, and leaves room for a future
   global/role-default layout (a separate `scope` row family) without touching
   this contract. One row per user (`user_id` PK, FK → `users` cascade), mirroring
   the clean `user_settings` ownership pattern.

---

## Security Contract

- **Endpoint visibility:** n/a (storage layer; no route added here).
- **Auth model:** n/a at this layer; the repository is always called with a
  resolved `userId` from a session-authenticated route (L02/L03).
- **RBAC:** n/a here (enforced at routes).
- **CSRF / Rate-limit:** n/a here.
- **Validation:** schema-first. `normalizeDashboardLayout` parses with
  reject-unknown, delegates per-widget `config` to the catalog, and is the **only**
  write path into the column. Repository never persists raw input.
- **Anti-abuse:** `MAX_WIDGETS_PER_LAYOUT` cap (recommend 24) enforced in
  `normalizeDashboardLayout`; oversized payloads raise `dashboard_layout_invalid`.
- **Secret handling:** layout stores presentation/config only (widget type, title,
  grid placement, bounded config). No credentials/tokens/PII are ever written; the
  normalizer drops unknown keys, so a poisoned payload cannot smuggle secrets into
  the column.

---

## Implementation Pseudocode

### 1) Layout envelope schema + normalizer (contract owner)

`core/services/dashboard/dashboardLayout.ts`

```ts
import {
  dashboardWidgetTypeSchema,          // 480-01 catalog owns the enum
  normalizeDashboardWidgetConfig,     // 480-01 catalog owns per-type config
} from "./widgets/dashboardWidgetCatalog";

export const DASHBOARD_LAYOUT_SCHEMA_VERSION = 1 as const;
export const MAX_WIDGETS_PER_LAYOUT = 24;
export const DASHBOARD_GRID_COLUMNS = 12;

export const DASHBOARD_LAYOUT_INVALID = "dashboard_layout_invalid";
export class DashboardLayoutError extends Error {
  constructor(public field?: string) { super(DASHBOARD_LAYOUT_INVALID); }
}

// reject-unknown at every level (zod .strict() or equivalent)
const gridCellSchema = z.object({
  x: z.number().int().min(0).max(DASHBOARD_GRID_COLUMNS - 1),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(DASHBOARD_GRID_COLUMNS),
  h: z.number().int().min(1).max(24),
}).strict();

const widgetInstanceSchema = z.object({
  id: z.string().uuid(),
  type: dashboardWidgetTypeSchema,         // unknown type -> reject
  title: z.string().max(120).nullable().optional(),
  grid: gridCellSchema,
  config: z.unknown().optional(),          // delegated below
}).strict();

const layoutSchema = z.object({
  schemaVersion: z.literal(DASHBOARD_LAYOUT_SCHEMA_VERSION).optional(),
  columns: z.literal(DASHBOARD_GRID_COLUMNS).optional(),
  widgets: z.array(widgetInstanceSchema).max(MAX_WIDGETS_PER_LAYOUT),
}).strict();

export type DashboardWidgetInstance = {
  id: string;
  type: DashboardWidgetType;
  title: string | null;
  grid: { x: number; y: number; w: number; h: number };
  config: DashboardWidgetConfig;           // narrowed by catalog
};
export type DashboardLayout = {
  schemaVersion: typeof DASHBOARD_LAYOUT_SCHEMA_VERSION;
  columns: typeof DASHBOARD_GRID_COLUMNS;
  widgets: DashboardWidgetInstance[];
};

export function normalizeDashboardLayout(input: unknown): DashboardLayout {
  const parsed = layoutSchema.parse(input);              // throws ZodError on unknown
  const seen = new Set<string>();
  const widgets = parsed.widgets.map((w) => {
    if (seen.has(w.id)) throw new DashboardLayoutError("widgets[].id");
    seen.add(w.id);
    return {
      id: w.id,
      type: w.type,
      title: w.title?.trim() ? w.title.trim() : null,
      grid: w.grid,
      // catalog validates/normalizes config per type; unknown keys rejected there
      config: normalizeDashboardWidgetConfig(w.type, w.config),
    };
  });
  return { schemaVersion: DASHBOARD_LAYOUT_SCHEMA_VERSION, columns: DASHBOARD_GRID_COLUMNS, widgets };
}

// Read-side migration of legacy/empty/unknown stored rows -> never throws.
export function migrateStoredLayout(raw: unknown): DashboardLayout {
  try { return normalizeDashboardLayout(raw); }
  catch { return getDefaultDashboardLayout(); }
}

export function getDefaultDashboardLayout(): DashboardLayout {
  // Mirrors the current fixed dashboard so a brand-new user sees today's UX.
  return normalizeDashboardLayout({
    widgets: [
      { id: crypto.randomUUID(), type: "stat.totals", grid: { x: 0, y: 0, w: 4, h: 2 } },
      { id: crypto.randomUUID(), type: "storage.usage", grid: { x: 4, y: 0, w: 4, h: 2 } },
      { id: crypto.randomUUID(), type: "site.health",  grid: { x: 8, y: 0, w: 4, h: 2 } },
      { id: crypto.randomUUID(), type: "activity.recentEdits", grid: { x: 0, y: 2, w: 8, h: 4 } },
      { id: crypto.randomUUID(), type: "security.summary", grid: { x: 8, y: 2, w: 4, h: 4 } },
    ],
  });
}
```

> Note: `crypto.randomUUID()` defaults must run server-side at read time only when
> persisting a brand-new default; the normalizer itself must stay pure (no RNG) so
> tests are deterministic — generate ids in `getDefaultDashboardLayout`, not in
> `normalizeDashboardLayout`.

### 2) Table (`core/db/schema.ts`)

```ts
export const dashboardLayouts = pgTable("dashboard_layouts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(1),
  layout: jsonb("layout").notNull(),         // normalized DashboardLayout
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});
```

One row per user; `user_id` PK doubles as the lookup index. No extra index needed.

### 3) Repository (`core/services/dashboard/dashboardLayoutRepository.ts`)

```ts
export async function readDashboardLayout(userId: string): Promise<DashboardLayout> {
  const [row] = await db.select().from(dashboardLayouts)
    .where(eq(dashboardLayouts.userId, userId));
  if (!row) return getDefaultDashboardLayout();    // unsaved user -> default (not persisted)
  return migrateStoredLayout(row.layout);          // tolerate legacy/drift on read
}

export async function writeDashboardLayout(
  userId: string, input: unknown
): Promise<{ layout: DashboardLayout; updatedAt: string }> {
  const layout = normalizeDashboardLayout(input);  // reject-unknown / cap / dup-id
  const now = new Date();
  const [row] = await db.insert(dashboardLayouts)
    .values({ userId, schemaVersion: layout.schemaVersion, layout, updatedAt: now, updatedBy: userId })
    .onConflictDoUpdate({
      target: dashboardLayouts.userId,
      set: { layout, schemaVersion: layout.schemaVersion, updatedAt: now, updatedBy: userId },
    })
    .returning();
  return { layout: migrateStoredLayout(row.layout), updatedAt: row.updatedAt.toISOString() };
}

export async function resetDashboardLayout(userId: string) {
  await db.delete(dashboardLayouts).where(eq(dashboardLayouts.userId, userId));
  return getDefaultDashboardLayout();
}
```

### 4) Migration artifacts (FULL — required)

Generate via the project's drizzle-kit flow, then verify the three artifacts
exist (`bun --cwd core db:generate` or the repo's documented generate script —
confirm the exact script in `core/db/drizzle.config.ts` / `package.json`). The
next free index is **0064** (last shipped is `0063_yummy_glorian`):

- **SQL** — `core/db/migrations/0064_dashboard_layouts.sql`:
  ```sql
  CREATE TABLE "dashboard_layouts" (
    "user_id" uuid PRIMARY KEY NOT NULL,
    "schema_version" integer DEFAULT 1 NOT NULL,
    "layout" jsonb NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "updated_by" uuid
  );
  --> statement-breakpoint
  ALTER TABLE "dashboard_layouts"
    ADD CONSTRAINT "dashboard_layouts_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
  --> statement-breakpoint
  ALTER TABLE "dashboard_layouts"
    ADD CONSTRAINT "dashboard_layouts_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
  ```
- **Snapshot** — `core/db/migrations/meta/0064_snapshot.json`: full drizzle
  snapshot regenerated for the new table (do not hand-edit beyond what the
  generator emits; it must include `dashboard_layouts` columns, PK, and both FKs).
- **Journal** — append to `core/db/migrations/meta/_journal.json`:
  ```json
  { "idx": 64, "version": "7", "when": <epoch-ms>, "tag": "0064_dashboard_layouts", "breakpoints": true }
  ```

**Data flow:** route resolves `userId` → repository → `normalizeDashboardLayout`
(write) / `migrateStoredLayout` (read) → JSONB column. Routes never touch the
table directly.

**Error handling:** `normalizeDashboardLayout` raises `DashboardLayoutError`
(`dashboard_layout_invalid`) or a ZodError; both map at the route boundary (L02).
Read path never throws — it falls back to the default layout.

**Regression-test shape:**

- Domain (Vitest): reject-unknown at envelope/instance/grid/config levels;
  duplicate id rejection; widget cap enforcement; unknown widget `type` rejection;
  `migrateStoredLayout` returns default for `null`/garbage/legacy; default layout
  is stable and re-normalizes idempotently.
- Repository (Bun, DB): unsaved user → default (no row written); write→read
  round-trip; per-user isolation (user A's write does not affect user B);
  `onConflictDoUpdate` upsert overwrites; reset deletes row; cascade delete when
  user is removed.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core test:vitest -- dashboardLayout` (pure schema/normalize/migrate).
- DB lanes (load env first: `set -a && source .env && set +a`):
  - `bun test tests/integration/routes/dashboardLayout.test.ts` (repository
    round-trip is exercised through the L02 route harness; a direct repo test may
    live in `tests/integration/dashboard/` if added).
- Verify migration applies cleanly: `set -a && source .env && set +a` then the
  repo's migrate script (e.g. `bun --cwd core db:migrate`), and confirm
  `0064_snapshot.json` + the `_journal.json` entry exist.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md` — add `dashboard_layouts` table (columns, PK, FKs, "one
  row per user", "stores admin dashboard widget layout — not `core/widgets`").
- `_docs/DASHBOARD_WIDGETS_SPEC.md` — layout envelope schema + storage decision.
- Board status; changelog entry references the migration tag.
