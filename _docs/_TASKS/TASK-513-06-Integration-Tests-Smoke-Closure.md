# TASK-513-06: Integration Tests, Gates, Playwright Smoke & Closure

# FileName: TASK-513-06-Integration-Tests-Smoke-Closure.md

**Parent Task:** TASK-513
**Priority:** High
**Category:** Content (Engine) / Tests / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-513-01, -02, -03, -04, -05 (all land first)
**Status:** ✅ Done (2026-07-06)

---

## Scope (single-writer)

**513-06 writes only NEW/owned test files + this task's closure docs.** It does NOT edit source
owned by 01–05 (any source bug found is fixed by that file's owner, or noted as a residual).
Adds cross-cutting integration tests, the downstream-consumer guard, runs all gates, performs the
Playwright smoke (≥5 real-flow scenarios), and writes the closure summary.

**Land order (strict):** …→ 513-05 → 513-06 (this, LAST).

---

## Security Contract

**Tests + docs only — no route/DB/RBAC/migration.** Verifies (not introduces) that
`content_type_config_invalid` returns 400, reject-unknown holds for config + permissions keys, and
the config round-trips through create/update/duplicate without privilege change. Confirms no new
endpoint/RBAC bucket was added beyond the existing `content:read`/`content:write` buckets.

---

## What this subtask ships

### 1. Integration / cross-cutting tests
- **End-to-end config round-trip (Bun route lane)**: `POST /content-types` with `config` +
  `date`/`slug` fields → `GET` → `PATCH` (change config + send properties carrying `xFieldConfig.order`) → `GET` asserts config
  present-only, the field-key **SET** preserved AND each field's **`xFieldConfig.order` integer round-trips as data**
  (field order persists via `xFieldConfig.order`, NOT via raw key position — `content_types.schema` is a `jsonb` column that
  re-sorts object keys, so the route lane proves persistence through the `order` integers; see the CROSS-SUBTASK ITEM below),
  schema `xFieldType:"date"`/`xFieldType:"slug"` intact
  (NO `format` key — 513-02 emits none; ajv `strict:true` would throw on it), and a
  field marked `unique` persists its `xFieldConfig.unique === true` through the round-trip (omitted
  when unset). Reject-unknown: `config.bogus` and `permissions.editor.bogus` → 400. Unique-slug per test +
  teardown (shared-DB safety; self-isolate to avoid the smoke-DB-pollution transient).
- **Downstream-consumer guard (Vitest pure)**: feed a schema with `date`/`slug` fields to the
  entry-facing consumers that map `ContentField` (`entries/entryChecklist.ts`,
  `entries/EntryEditor` type-narrowing, `custom-screens` field consumers) and assert no throw /
  sensible passthrough — proves the `FieldType` union widening (513-02) did not break non-owned
  consumers.
- **countSchemaFields / list summary** still correct with date/slug fields.

> **✅ CROSS-SUBTASK ITEM — field-ORDER persistence IS delivered (513-02 via `xFieldConfig.order`; parent Open Question 6).**
> `content_types.schema` is a Postgres **`jsonb`** column (`core/db/schema.ts:688`) and Postgres `jsonb` does **not** preserve
> object-key insertion order — it canonicalizes keys by (length, then bytewise). **Verified empirically against the live DB:**
> `jsonb_build_object('title',1,'publishedAt',2,'urlSlug',3)::text` → `{"title": 1, "urlSlug": 3, "publishedAt": 2}`
> (`title`(5) < `urlSlug`(7) < `publishedAt`(11) — jsonb-canonical, NOT the authored `[title, publishedAt, urlSlug]`). Because raw
> key position cannot carry order, **513-02 makes order DATA, not key-position:** `buildSchemaFromFields` stamps a per-property
> integer **`xFieldConfig.order`** (0-based authored index) on every field, and `fieldsFromSchema` re-sorts the
> `Object.entries(schema.properties)` result by it (missing `order` ⇒ `Infinity`, so legacy fields keep their canonical position —
> no read regression). This rides the already-registered `xFieldConfig` keyword (NO top-level `xFieldOrder`, which would throw
> under `assertContentSchema`'s `new Ajv({ strict:true })`).
> **What this means for the two lanes (IMPORTANT — do not over-assert the route lane):**
> - **Bun route round-trip (raw jsonb in/out):** the route serializes/returns the schema JSON *verbatim*; it does NOT run
>   `fieldsFromSchema`, so `Object.keys(props)` STILL comes back jsonb-canonical (key position is not order). Therefore assert the
>   property-key **SET** (order-independent) AND that the **`xFieldConfig.order` integers round-trip as data** (that is the
>   route-level proof that order PERSISTS). Do NOT assert `Object.keys(...)` equals the authored sequence — it never will at the
>   raw-jsonb layer, regardless of the order feature.
> - **Admin/UI + smoke (through `fieldsFromSchema`):** the editor reads via `fieldsFromSchema`, which re-sorts by
>   `xFieldConfig.order`, so the reloaded FIELD order equals the authored order. The exact-order round-trip is unit-covered in
>   **513-02** (`fieldsFromSchema(buildSchemaFromFields(reordered)).map(f => f.name)` === reordered), and smoke scenario 3
>   **re-enables the "reopen shows the new order" check** (real UI path). (Prior draft asserted raw `Object.keys` order, which is
>   RED/coincidental under jsonb — the correct order proof is the `order` integers at the route layer + the `fieldsFromSchema`
>   resort at the UI layer.)

#### Test skeletons (execution-ready)

**(a) Bun route round-trip + reject-unknown** — new file `tests/integration/routes/contentTypeConfigRoundTrip.test.ts`, reusing the harness already in `tests/integration/routes/contentTypes.test.ts` (`makeRouter()` / `runRoute()` / `testIfDbWithOptions` / `canConnect`). The harness stubs `validate: () => undefined`, so the reject-unknown assertions exercise the **authoritative** path (`typeService.normalizeContentTypeConfig` throws `content_type_config_invalid` → `mapContentTypeError` → `ApiError(...,400)`), not the coarse JSON-Schema gate. **Both** reject cases are pinned by 513-01's *authoritative* §2 pseudocode (subtask file `TASK-513-01…§2`, `normalizeContentTypeConfig`): the **top-level allowlist loop** (`for (const key of Object.keys(input)) if (!CONFIG_KEYS.has(key)) throw …`) rejects `config.bogus`, and the **inlined per-role capability loop** (`if (!CAP_KEYS.has(capKey)) throw …`) rejects `permissions.<role>.bogus`. (The parent file's *condensed* §c snippet is a lossy overview that elides the top-level loop and reads "keeps only known capability booleans" — the subtask §2 pseudocode is authoritative and both anchors above are what the owner ships; do NOT down-scope this test to the capability case only.) **Hard dependency:** the `.rejects.toMatchObject({ status: 400 })` assertion REQUIRES the `content_type_config_invalid` → 400 case to exist in `mapContentTypeError` (`core/server/routes/contentTypeRoutes.ts`) — its current 400 group ends at `content_type_duplicate_name_unavailable`, and `withContentTypeErrors` rethrows unmapped errors RAW (no status), so the test fails until that case is added. Own only this NEW file: **513-01** owns the service/route **and** the one-line `mapContentTypeError` `content_type_config_invalid` → 400 switch case (per 513-01's *Coordination caveat (route error mapping)* — do NOT double-edit it here); **513-02** owns `schemaMapping` (`buildSchemaFromFields`/`fieldsFromSchema`).

```ts
import { afterEach, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { contentTypes } from "../../../core/db/schema";
import { registerContentTypeRoutes } from "../../../core/server/routes/contentTypeRoutes";
// makeRouter/runRoute/testIfDbWithOptions/canConnect are copied VERBATIM from contentTypes.test.ts (same file-local helpers).
// Import usage (no unused locals → passes root `tsc --noEmit` noUnusedLocals + `lint`): `eq`+`db`+`contentTypes` are consumed by
// the afterEach teardown below; `sql` is consumed by the copied `canConnect` helper (`await db.execute(sql`select 1`)`, see
// contentTypes.test.ts); `afterEach` drives teardown. (No `ApiError` import — the reject cases assert on `{ status: 400 }`.)

const uid = () => randomUUID().slice(0, 8);
const created: string[] = [];
// Concrete teardown (shared-DB self-isolation — avoids the smoke-DB-pollution transient): delete every row this file
// created, even when an assertion throws mid-test. `splice(0)` drains the list so a later test cannot re-delete a stale id.
afterEach(async () => {
  for (const id of created.splice(0)) await db.delete(contentTypes).where(eq(contentTypes.id, id));
});

const REAL_ROLE = "editor"; // any role slug is allowed (additionalProperties role keys)

testIfDbWithOptions("content-type config + date/slug round-trip via POST→GET→PATCH→GET", async () => {
  const { router, routes } = makeRouter();
  registerContentTypeRoutes(router, { requirePermission: () => async () => undefined, validate: () => undefined });

  const slug = `rt-${uid()}`;
  const body = {
    name: `Round Trip ${uid()}`,
    slug,
    schema: {
      type: "object", additionalProperties: false, required: ["title"],
      properties: {
        // Every field carries xFieldConfig.order (0-based authored index) — exactly what buildSchemaFromFields
        // stamps on every field (513-02 §Field-ORDER); order rides the registered xFieldConfig keyword (no ajv change).
        title: { type: "string", xFieldConfig: { order: 0 } },
        publishedAt: { type: "string", xFieldType: "date", xFieldConfig: { order: 1 } }, // NO format: ajv strict:true would throw (513-02)
        // urlSlug carries a slug config, `unique:true`, AND order on the SAME xFieldConfig object — proves
        // the jsonb schema persists xFieldConfig verbatim through the route/DB round-trip (513-02 build
        // arm `if (field.unique) fieldConfig.unique = true` rides this same object; read-back at 513-02 §fieldsFromSchema).
        urlSlug: { type: "string", xFieldType: "slug", xFieldConfig: { slug: { source: "title" }, unique: true, order: 2 } },
      },
    },
    // present-only: draftsEnabled:true & versioning:false are RESOLVED DEFAULTS → must be DROPPED to {}
    config: { singularName: "Story", pluralName: "Stories", draftsEnabled: true, versioning: false,
              permissions: { [REAL_ROLE]: { read: true, create: false } } },
  };

  // ACT: create
  const post = (await runRoute(routes, "POST", "/content-types", { params: {}, query: {}, body })) as any;
  const id = post.id ?? post.contentType?.id;
  created.push(id);

  // ASSERT: present-only on the READ path (defaults dropped, false caps dropped, empty role dropped)
  const get1 = (await runRoute(routes, "GET", "/content-types/:id", { params: { id }, query: {}, body: {} })) as any;
  const cfg1 = get1.config ?? get1.contentType?.config;
  // false caps ARE dropped: 513-01 §2 keeps ONLY `caps[cap] === true` (`for (const cap of CAP_KEYS) if (caps[cap] === true) kept[cap] = true`),
  // symmetric with 513-04's UI-side `normalizePermissionsMatrix` minimizer — so `create: false` never persists.
  expect(cfg1).toEqual({ singularName: "Story", pluralName: "Stories", permissions: { [REAL_ROLE]: { read: true } } });
  expect("draftsEnabled" in cfg1).toBe(false);
  expect("versioning" in cfg1).toBe(false);
  // schema field-type markers survive the round-trip
  const props1 = (get1.schema ?? get1.contentType?.schema).properties;
  expect(props1.publishedAt.xFieldType).toBe("date"); // identified by xFieldType, NOT format (513-02)
  expect(props1.urlSlug.xFieldType).toBe("slug");
  // `unique` rides xFieldConfig verbatim through the route/jsonb round-trip — persists when set, omitted when unset.
  // (This is the route/DB-lane proof; the present-only build/read minimizer — set true → drop when falsy — is unit-covered by 513-02's schemaMapping round-trip, so 513-06 does not re-test that arm.)
  expect(props1.urlSlug.xFieldConfig.unique).toBe(true);      // persisted when set
  expect(props1.title.xFieldConfig?.unique).toBeUndefined();  // omitted when unset (title's xFieldConfig carries only `order`, no `unique`)
  // field-ORDER persists as DATA — the authored xFieldConfig.order integers round-trip verbatim (513-02 §Field-ORDER; parent OQ6).
  // (Raw key position is NOT order — jsonb re-sorts keys; the route-layer proof is the `order` integers, and the fieldsFromSchema
  // resort that turns them back into authored FIELD order is unit-covered by 513-02.)
  expect(props1.title.xFieldConfig.order).toBe(0);
  expect(props1.publishedAt.xFieldConfig.order).toBe(1);
  expect(props1.urlSlug.xFieldConfig.order).toBe(2);
  // field SET preserved (jsonb re-sorts keys; see CROSS-SUBTASK ITEM above). Compare the sorted key set,
  // never the raw insertion order: the authored [title, publishedAt, urlSlug] reads back jsonb-canonical [title, urlSlug, publishedAt].
  expect([...Object.keys(props1)].sort()).toEqual(["publishedAt", "title", "urlSlug"]);

  // ACT: PATCH — turn a default OFF (now present) + REORDER to [title, urlSlug, publishedAt], RE-STAMPING
  // xFieldConfig.order to the new authored indices (exactly what buildSchemaFromFields emits after a UI reorder).
  await runRoute(routes, "PATCH", "/content-types/:id", { params: { id }, query: {}, body: {
    config: { ...body.config, draftsEnabled: false, versioning: true },
    schema: { ...body.schema, properties: {
      title:       { ...body.schema.properties.title,       xFieldConfig: { order: 0 } },
      urlSlug:     { ...body.schema.properties.urlSlug,      xFieldConfig: { ...body.schema.properties.urlSlug.xFieldConfig, order: 1 } },
      publishedAt: { ...body.schema.properties.publishedAt, xFieldConfig: { order: 2 } },
    } },
  } });

  const get2 = (await runRoute(routes, "GET", "/content-types/:id", { params: { id }, query: {}, body: {} })) as any;
  const cfg2 = get2.config ?? get2.contentType?.config;
  const props2 = (get2.schema ?? get2.contentType?.schema).properties;
  expect(cfg2.draftsEnabled).toBe(false); // now non-default → PERSISTED
  expect(cfg2.versioning).toBe(true);
  // ORDER-persistence proof: the re-stamped xFieldConfig.order integers round-trip — the new authored order
  // [title(0), urlSlug(1), publishedAt(2)] is preserved as DATA (the fieldsFromSchema resort that renders it back as
  // authored FIELD order is unit-covered by 513-02). Raw Object.keys stays jsonb-canonical — assert the SET, never key order.
  expect(props2.title.xFieldConfig.order).toBe(0);
  expect(props2.urlSlug.xFieldConfig.order).toBe(1);
  expect(props2.publishedAt.xFieldConfig.order).toBe(2);
  expect([...Object.keys(props2)].sort()).toEqual(["publishedAt", "title", "urlSlug"]);
}, { timeout: 20000 });

testIfDbWithOptions("reject-unknown: config.bogus and permissions.<role>.bogus → 400", async () => {
  const { router, routes } = makeRouter();
  registerContentTypeRoutes(router, { requirePermission: () => async () => undefined, validate: () => undefined });
  const base = { name: `Bad ${uid()}`, slug: `bad-${uid()}`,
    schema: { type: "object", additionalProperties: false, required: ["title"], properties: { title: { type: "string" } } } };

  for (const badConfig of [
    { bogus: true },                                  // unknown top-level config key
    { permissions: { [REAL_ROLE]: { bogus: true } } }, // unknown per-role capability key
  ]) {
    const run = runRoute(routes, "POST", "/content-types", { params: {}, query: {}, body: { ...base, config: badConfig } });
    await expect(run).rejects.toMatchObject({ status: 400 }); // ApiError(status 400) from mapContentTypeError(content_type_config_invalid)
  }
}, { timeout: 20000 });
```

**(b) Downstream-consumer guard (Vitest pure)** — new file `tests/vitest/content/fieldTypeWideningGuard.test.ts`. Proves the 513-02 `FieldType` union widening (`date`/`slug`) does not throw or misbehave in non-owned `ContentField` consumers. Pure — no Bun/DB import; imports the real mapping + checklist.

> **Shape dependency (513-02):** the `date`/`slug` config sub-objects in the fixture below and the `slug`-round-trip `toEqual` assertion MUST match the exact `ContentField` config shape that **513-02 pins** — `slug?: { source?: string; editable?: boolean }` and `date?: { includeTime?: boolean }`, persisted present-only via `xFieldConfig.slug` / `xFieldConfig.date` (513-02 §a/§b: `SchemaBuilder.tsx` `ContentField` + `schemaMapping.ts` build/read arms). This is the authoritative shape; the parent gap-analysis's loose `xFieldConfig.sourceField` phrasing is NOT the pinned key — do NOT assert `sourceField`/`source` against a shape 513-02 does not guarantee. Because build is present-only, `date.includeTime:false` is DROPPED on round-trip (assert only `type`, `countSchemaFields`, and the `slug` config that 513-02 emits — never a round-tripped `date` config for a falsy `includeTime`). If 513-02 lands a different key set, this fixture must be aligned to it before the guard is written.

```ts
import { describe, expect, it } from "vitest";
import { buildSchemaFromFields, fieldsFromSchema, countSchemaFields } from "@/ui/content-types/schemaMapping";
import type { ContentField } from "@/ui/content-types/SchemaBuilder";
import { buildEntryChecklist } from "@/ui/entries/entryChecklist";

const fields: ContentField[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "publishedAt", label: "Published at", type: "date", required: true, date: { includeTime: false } },
  { name: "urlSlug", label: "Slug", type: "slug", required: false, slug: { source: "title", editable: false } },
];

describe("date/slug widening — downstream ContentField consumers", () => {
  it("survives build→fields round-trip preserving type + config", () => {
    const back = fieldsFromSchema(buildSchemaFromFields(fields));
    expect(back.map((f) => f.type)).toEqual(["text", "date", "slug"]);
    expect(back.find((f) => f.name === "urlSlug")?.slug).toEqual({ source: "title", editable: false });
    expect(countSchemaFields(buildSchemaFromFields(fields))).toBe(3);
  });

  it("buildEntryChecklist does not throw and treats a filled date/slug value as complete", () => {
    const run = () => buildEntryChecklist({
      title: "Hello", slug: "hello", status: "draft", scheduledAt: "",
      fields,
      values: { title: "Hello", publishedAt: "2026-07-05", urlSlug: "hello" },
    });
    expect(run).not.toThrow();
    expect(run().missingRequiredFields).toEqual([]); // date/slug strings counted as filled (isValueFilled string branch)
  });

  it("flags an empty required date field as missing (no crash on unknown type)", () => {
    const cl = buildEntryChecklist({
      title: "Hello", slug: "hello", status: "draft", scheduledAt: "",
      fields, values: { title: "Hello", publishedAt: "", urlSlug: "hello" },
    });
    expect(cl.missingRequiredFields.map((m) => m.name)).toContain("publishedAt");
  });
});
```

> **Lane note:** `EntryEditor`/`custom-screens` type-narrowing render coverage (a `date`/`slug`
> field rendering an input, not crashing) belongs to the **Vitest admin/UI lane**
> (`tests/vitest/ui/**` — jsdom render of `FieldRenderer`, already scoped in 513-02 §Testing);
> 513-06 only adds the **pure** guard above plus the Bun route round-trip. Keep the pure guard
> import-only from `schemaMapping`/`entryChecklist` (no `EntryEditor.tsx` import — that would drag
> React/jsdom into the pure lane).

### 2. Gates (all must be green)
- `bun --cwd core lint:types` AND root `tsc -p tsconfig.json --noEmit` (prop/type ripple).
- `lint`, full `bun test` (re-run named files if the glob shows spurious timeout flakes),
  Vitest suites, `gates:coderso`.

### 3. Playwright smoke — ≥5 distinct real-flow scenarios (session `-s=wf513smoke`, screenshots to `_docs/_workflows/_smoke/`)
Gate on `http://coderso-a.localhost:5173/admin/` == 200 (start `coderso-dev-core-host` if white).
1. **Prototype-fidelity side-by-side**: open the rebuilt editor vs `:5180/#/advanced/engine/sample`
   — verify breadcrumb `Engine › {name}`, Boxes icon, underline tabs incl. Permissions,
   `[1fr_300px]` grid, Fields rows (grip + type badge + `…`), Type-settings card. Light AND dark.
2. **Type-settings persist**: set Singular/Plural, toggle Enable drafts off + Versioning on, Save,
   reload → values persist (config round-trip through the UI).
3. **Field lifecycle**: add a **Date** field and a **Slug** field, toggle a field's **Unique** flag
   on (the inspector row 513-02 adds under Required, matching the prototype), reorder via drag,
   duplicate a field, delete a field (with Undo), Save → reopen shows the new field **types**, the
   add/duplicate/delete results, AND the Unique flag persisted (present-only via `xFieldConfig.unique`).
   **Field ORDER IS asserted** — the reordered field order PERSISTS through Save→reopen (513-02 stamps
   `xFieldConfig.order` and `fieldsFromSchema` re-sorts by it, so the real UI reload reflects the authored
   order despite jsonb key-canonicalization; see the CROSS-SUBTASK ITEM in §1). Drag to a new order, Save,
   reopen, and confirm the fields render in that new order. Open an **Entry** of the type and confirm the
   date input + slug input render (513-02 renderer).
4. **Permissions tab**: toggle several role×capability cells, Reset to defaults, re-toggle, Save,
   reload → matrix persists (present-only).
5. **Visual schema builder (Open schema)**: from the editor header open `/schema`, add a field via
   the palette, edit its inspector, reorder, Save → returns to a persisted schema; Discard reverts.
6. (bonus) **Cross-device**: repeat scenario 1 at a mobile viewport — field details Sheet + preview
   drawer behave; publish→front parity where a content route exists.

### 4. Closure
- Update `TASK-513*` subtask **Status** fields to ✅ Done with completion dates and truthful
  closure notes (what shipped, residuals, gate results, smoke pass counts).
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator adds board rows;
  closure changelog **1226** is pinned and owner/orchestrator-driven).
- Record any residuals + confirm the parent Open Questions' resolutions taken during impl.

---

## UI/UX-fidelity & max-config-flexibility notes

Smoke is the fidelity bar: measured light+dark side-by-side vs the prototype, all controls
exercised with real input (owner mandate: ≥5 distinct real-flow scenarios; acceptance-checklist-
only smoke is insufficient). Confirm every new control (API ID, singular, plural, drafts,
versioning, permissions matrix, date/slug fields, drag reorder, visual builder Save) is functional
end-to-end, not a shell.

---

## Closure (2026-07-06)

**Shipped (513-06, test files + docs only — no impl source touched):**
- `tests/integration/routes/contentTypeConfigRoundTrip.test.ts` (Bun route lane): config
  POST→GET→PATCH→GET present-only round-trip, `date`/`slug` `xFieldType` (no `format`), `unique`
  persistence, `xFieldConfig.order` field-order integers, and `config.bogus` /
  `permissions.<role>.bogus` → 400 (own-slug isolate + afterEach teardown).
- `tests/vitest/content/contentTypeConfig.test.ts` (pure lane): `normalizeContentTypeConfig`
  table cases (reject-unknown top-level/cap, present-only drop-defaults, trims/caps, idempotent),
  `resolveDraftsEnabled`/`resolveVersioning`, and the 513-04 permissions minimizer
  (`normalizePermissionsMatrix`/`toggleCapability`/`resolveRoleCapabilities`).
- `tests/vitest/content/fieldTypeWideningGuard.test.ts` (pure guard): `FieldType` widening
  (`date`/`slug`) survives `schemaMapping` round-trip and does not throw in `entryChecklist`.

**Changelog:** 1226 (`_docs/_CHANGELOG/1226-2026-07-06-task-513-engine-content-type-editor.md`);
README next-pointer bumped to 1227. Migration used by 513-01: `0068_productive_stephen_strange`.

**Gate results:** see the workflow commit body / structured result (lint, lint:types, root tsc,
test:bun, test:vitest, gates:coderso all green at closure).

**Smoke deferral:** the ≥5-scenario LIVE prototype-fidelity Playwright smoke is run by the
ORCHESTRATOR post-merge (the dev host serves the MAIN tree, not this worktree).

**Residuals / Open Questions (decisions taken):** permissions enforcement (OQ1), `versioning`
semantics (OQ2), `draftsEnabled` entry-editor effect (OQ4), and `unique` per-entry enforcement
(OQ5) are all delivered as DECLARATIVE config only (surfaced + persisted; enforcement deferred).
Field-order persistence (OQ6) is delivered via `xFieldConfig.order` (RESOLVED). Both field editors
(tab-based 513-03 + visual builder 513-05) are kept (OQ3).
