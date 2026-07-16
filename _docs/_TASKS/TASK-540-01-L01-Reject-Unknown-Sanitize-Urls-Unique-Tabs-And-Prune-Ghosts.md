# TASK-540-01-L01: Reject Unknown, Sanitize URLs, Enforce Unique Tabs, and Prune Ghosts

# FileName: TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-01
**Priority:** High
**Category:** Custom Screens / Schema / Security
**Estimated Effort:** Medium
**Dependencies:** None inside TASK-540
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Implementation Complete:** 2026-07-14 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Started:** 2026-07-16
**Repair Reason:** The final TASK-540 workflow audit reproduced contract drift between Ajv and direct normalization for structural IDs/binding paths, unsafe or ambiguous compatibility bindings, collision-prone generated binding IDs, and metadata-only PATCH repair. R01 now owns one strict three-mode identity contract plus the shared domain binding-ID builder: every generated ID has a bounded readable prefix plus the 13-character hash of its framed JSON tuple, while valid explicit IDs remain unchanged; public Assistant consumers remain compatible and read-only.
**Revalidation Passed:** 2026-07-16 — `core lint:types` and `core lint` passed; the exact five-file R01 Vitest gate passed 168/168; DB preflight returned configured/reachable/select-one; the exact Custom Screens route plus Assistant executor Bun gate passed 92/92 with 564 expectations; the isolated document-op suite passed 11/11 after the duplication-ID assertion; and `git diff --check` passed. This receipt claims no full-suite, post-audit, smoke, changelog, or closure result.
**Previous Assistant Repair Started:** 2026-07-14
**Historical Assistant Repair Reason:** Repository-wide Bun validation confirmed that the Assistant Custom Screen block-patch test still constructed unsupported `hero` and `rich-text-section` blocks at the strict V4 write boundary. R01 owned a fixture-only update to canonical fixed kinds and data paths while preserving the selected block's sibling data and the untouched sibling block; production/schema behavior did not loosen.
**Historical Assistant Revalidation:** generation 18cd43dd8f0f89cff684d430e2f38b9d / token 1b3e7a821edc208050497e6675544347 / gate green
**Historical Completion:** 2026-07-14
**Historical Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, the exact schema/image Vitest matrix (75/75), the DB-backed Custom Screens route suite (15/15; 82 expectations), and `git diff --check`
**Historical Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings for the original-string ASCII-control repair and its exact five-value regression matrix
**Previous Fix Started:** 2026-07-14
**Previous Fix Reason:** Final closure audit reproduced that TAB/LF/CR and other ASCII controls can survive the Screen wrapper and be reinterpreted at a URL sink; the wrapper must reject them before Page-helper delegation.
**Prior Corrective Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, the exact schema/image Vitest matrix (74/74), the DB-backed Custom Screens route suite (15/15; 82 expectations), and `git diff --check`, before the control-character contract was added
**Prior Corrective Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings on the provenance-corrected working tree before the control-character corpus was added
**Previous Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, the exact schema/image Vitest matrix (72/72), and the DB-backed Custom Screens route suite (15/15; 82 expectations)
**Previous Completion:** 2026-07-14
**Previous Reopened:** 2026-07-14 (Screen URL control-character repair)
**Historical Reopened:** 2026-07-14 (Assistant Custom Screen block-patch fixture compatibility)
**Reopened:** 2026-07-16 (strict identity, compatibility-write, and shared binding-ID correction)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/screenDocumentOps.ts`, only to replace its local
  binding-ID construction with the schema-domain-owned `buildScreenFieldBindingId`
  in block factories and binding duplication; all other document-operation behavior
  remains unchanged
- `core/services/customScreens/customScreenService.ts`, only to give create the same
  warning-sink/build-response flow already used by update; do not refactor DB access
- `core/server/routes/customScreenRoutes.ts`, only to remove the route-local error
  carrier, import/re-export the domain-owned carrier, and preserve
  `mapCustomScreenError` code/status/message plus bounded `details.fields`
- compatibility updates required by this source gate in
  `tests/vitest/admin/custom-screen-schemas.test.ts`,
  `tests/vitest/customScreens/screenDocumentOps.test.ts`,
  `tests/vitest/customScreens/screen-document-image-src.test.ts`,
  `tests/integration/routes/customScreensRoutes.test.ts`
- direct Assistant consumer gates, read-only for the current correction:
  `tests/vitest/assistant/action-plan-schema.test.ts` and
  `tests/vitest/assistant/catalogBlueprintEngine.test.ts`
- fixture-only compatibility update in
  `tests/unit/assistant/actionExecutorService.test.ts`, limited to the existing
  `executeAssistantActionPlan patches custom screen block data` case

For the completed control-character correction, the exact writable implementation set was
`core/services/customScreens/customScreenSchemas.ts` plus
`tests/vitest/customScreens/screen-document-image-src.test.ts`. The other historical
owner files and named gate suites are read-only unless a separately verified finding
reopens their contract. Audit repair authority then uses this leaf's full declared owner
set; the Assistant path remains conditionally fixture-only and is mechanically guarded
byte-for-byte whenever it is touched. The Page-owned sanitizer module remains read-only.

For the historical Assistant fixture repair, the only writable test region was the
existing block-patch case in `tests/unit/assistant/actionExecutorService.test.ts`. It
replaced the unsupported Screen `hero`/`rich-text-section` fixture and matching action
identifiers, type, path, and assertions with canonical fixed-kind equivalents. It used
a `heading` block patched at `dataPath: ["text"]` and an independent `text` sibling,
then asserted the patched heading text, another unchanged property on that same heading,
and the untouched text sibling's content. Shared test helpers, other Assistant cases,
production Assistant code, the Screen schema/normalizer, and compatibility arms remained
unchanged. The strict V4 boundary remains authoritative and receives no fallback for
stale fixtures.

Status authority is phase-aware: before changelog 1252 covers the family, a landed,
gated source sibling remains `🚧 In Progress` with its `Implementation Complete`
receipt; after 1252 covers that physical ID, it may be `✅ Done` with `Completed`.
TASK-540-04-L03 has completed its sole scoped repair and now carries one canonical
`Revalidation Passed` successor with no `Repair Pending`, while TASK-540-06-L01 remains
the active closure leaf and is now landed with its one exact pre-closure
`Revalidation Passed`. R01 was the sole corrective source owner for the strict
identity/binding-ID repair through its exact gate; it does not alter
or duplicate the closure leaf's persisted gate evidence. `_docs/_workflows/task-540-implement.mjs`
owns this phase-aware restart invariant and exposes `--self-test-repair-siblings` as
its executable projection.

The older blanket `screenDocumentOps.ts` exclusion is superseded only for the
corrective binding-ID builder handoff described above. It does not grant R01 authority
over insertion, movement, duplication shape, GC, or any other document operation.
`ScreenBlockInspector.tsx` remains exclusively owned by TASK-540-02-L01: that leaf may
import the same domain builder for its existing `createScreenFieldBinding` helper, but
R01 must not edit the Inspector or its UI tests.

Do not edit route registration/handlers, `ScreenBlockLibrary.tsx`, renderer/UI files,
task indexes, or changelogs in this leaf. Update the named existing behavior tests
before running this leaf's gate; TASK-540-06 may add aggregate coverage later but must
not re-baseline this leaf's assertions.

`tests/vitest/customScreens/customScreenService.test.ts` is read-only here. Importing
its production module has immediate `db/client` coupling, so this leaf does not add or
move persistence assertions into that Vitest suite. Create/update response and stored
row behavior are proved in the existing Bun route integration lane with uniquely scoped
fixtures and owned-row cleanup.

## Current corrective contract: strict identities and compatibility writes

This correction is part of R01 rather than a new task surface. It closes the difference
between the route schema, direct service normalization, legacy stored reads, Assistant
plan normalization, and authoring-time binding factories.

### Structural and binding boundaries

- One schema-domain `SCREEN_PATH_MAX = 160` owns every V4 structural section ID,
  recursive block ID, binding `blockId`, binding `propPath`, binding `field`, and the
  existing fixed-kind path fields. A fresh write accepts only an already canonical,
  non-empty `^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$` string whose dot-separated segments exclude
  `__proto__`, `prototype`, and `constructor`; it does not trim or truncate submitted
  write values. Ajv and direct normalization reject whitespace drift, unsafe segments,
  or length 161 with their existing 400/domain error ownership.
- One `SCREEN_BINDING_ID_MAX = 120` plus
  `^[a-z0-9]+(?:-[a-z0-9]+)*$` owns explicit and generated binding IDs. A present ID on
  either fresh-write entry point must already be canonical and at most 120 characters;
  it is returned unchanged. An absent ID is generated by the shared builder below and
  always ends in `-<13-character framed-tuple hash>`, including for short readable
  prefixes. Duplicate resulting binding IDs still fail closed through the existing
  uniqueness check.
- Stored read may trim otherwise safe legacy paths and deterministically shorten an
  overlong structural/binding path. It keeps the largest prefix that fits together with
  `-<13-character base36 hash>`, where the hash is the existing stable unsigned 64-bit
  FNV-1a-style accumulator over the full normalized pre-shortening value. The same raw
  block ID therefore yields the same repaired document ID and binding reference, while
  two long values with a shared prefix retain distinct hash suffixes. Input storage is
  not mutated. The returned editor and row-template documents are write-valid, retain
  their exact binding-to-block references, and are idempotent under both another stored
  read and a strict write.
- This repair is identity-preserving, not a general fail-open adapter. Invalid grammar,
  unsafe path segments, duplicate canonical IDs, unsupported source/mode values, and
  unrepairable document shapes retain their existing fail-closed/fallback behavior.

### Exact three-mode binding policy

`normalizeScreenFieldBinding` has one explicit internal mode union:

```ts
type ScreenNormalizeMode = "write" | "stored-read";
type ScreenBindingNormalizeMode = ScreenNormalizeMode | "compatibility-write";
```

| Mode | ID-key contract | `source` / `mode` contract | Callers |
|---|---|---|---|
| `write` | `blockId` only; `widgetId` is an unknown key; all paths and any explicit ID are already canonical and bounded | `source` is required and exactly `"entry"`; absent `mode` becomes `"readwrite"`, otherwise it must be one of the domain modes | V4 editor and list-row writes, including service POST/PATCH |
| `compatibility-write` | exactly one own key of `blockId` or legacy `widgetId`; both, neither, or an own undefined alias reject; output always uses `blockId` | `source` may be absent but, when present, is exactly `"entry"`; `mode` may be absent but every present value must be an exact domain mode | exported `normalizeScreenFieldBindings`, retained for public Assistant action-plan/catalog construction |
| `stored-read` | reads historical `blockId` or `widgetId`; a non-nullish `blockId` wins, while an absent/nullish `blockId` falls back to `widgetId`; a malformed non-nullish `blockId` does not fall back; output drops `widgetId`, emits only canonical `blockId`, and applies deterministic safe-path repair | preserves the legacy fail-soft coercion: absent, null, blank/whitespace, or non-string source/mode values receive `"entry"`/`"readwrite"`; a non-empty string is trimmed and must resolve to exact `"entry"` or a domain mode, otherwise it fails | editor and list-row stored-read adapters only |

The exact-one and strict present source/mode rules intentionally belong to new `write`
and `compatibility-write` payloads. They prevent an ambiguous Assistant payload while
retaining the consciously documented fail-soft stored-read coercion for historical
rows. That read adapter never widens the strict V4 route/service write shape.
`tests/vitest/assistant/action-plan-schema.test.ts` and
`tests/vitest/assistant/catalogBlueprintEngine.test.ts` prove this public compatibility
as read-only dependency gates: neither file may be edited or re-baselined by R01.

### Domain-owned binding-ID builder and ownership handoff

`customScreenSchemas.ts` is the sole owner of the exported pure helper. Every generated
ID consists of a bounded readable slug prefix derived from `blockId + "-" + propPath`,
then `-`, then the exact 13-character base36 hash of the framed tuple
`JSON.stringify([blockId, propPath])`. The suffix is present for short and long tuples,
not only overflow. The hash seed is never the ambiguous visible concatenation, so
`(a-b,c)` cannot collide with `(a,b-c)` and case differences remain represented in the
hash seed even though the slug prefix is lowercase:

```ts
export function buildScreenFieldBindingId(blockId: string, propPath: string): string {
  const slugSeed = `${blockId}-${propPath}`;
  const hashSeed = JSON.stringify([blockId, propPath]);
  const hash = stableScreenPathHash(hashSeed); // exact 13-character base36 value
  const maxPrefixLength = SCREEN_BINDING_ID_MAX - hash.length - 1;
  const readablePrefix = slugify(slugSeed) || "binding";
  const boundedPrefix =
    readablePrefix.slice(0, maxPrefixLength).replace(/-+$/g, "") || "binding";
  return `${boundedPrefix}-${hash}`; // canonical grammar, max 120
}
```

The schema normalizer uses it when `binding.id` is absent. As the sole corrective
exception to the older ops exclusion, `screenDocumentOps.ts` imports it for every
factory/duplication path that creates a binding ID; its existing Vitest suite remains
the owning regression gate. TASK-540-02-L01, not R01, owns the Inspector change that
imports the same helper for `createScreenFieldBinding`. No caller keeps a local slug or
binding-ID mirror.

### Read/patch data flow and exact regression shape

1. Stored editor and row-template documents normalize their sections/blocks first.
   Bindings normalize through `stored-read`, so each overlong `blockId` reference is
   shortened from the same full value as its target block. Both scopes then run the
   existing live-block membership and unsupported-Button binding filters.
2. Legacy V1/V2/V3 editor migration first maps its historical blocks and bindings to a
   V4 editor, then passes that mapped editor exactly once through the same V4
   stored-read normalizer. V1 and V2 converge through the V3 migrator; list views keep
   their existing separate normalization and are not remigrated. The pass preserves
   block data and sibling bindings while closing the old max-160/max-120 bypass.
3. A metadata-only registered PATCH loads the stored definition through
   `normalizeCustomScreenDefinitionForRead`, then passes that repaired base definition
   through the strict write normalizer before persistence. The metadata update and the
   repaired definition land atomically; Tabs slot content, sibling blocks, binding
   references, and unrelated data are not dropped.
4. `custom-screen-schemas.test.ts` pins 160/161 structural and binding-path boundaries,
   120/121 explicit/generated binding-ID boundaries, all three modes, exact-one legacy
   alias handling for compatibility writes, non-nullish `blockId` precedence plus
   nullish alias fallback on stored reads, source/mode rejection, the mandatory hash
   suffix on every generated ID, and framed-tuple separator/case separation for both
   short and long tuples. The short separator and case pairs run through the full write
   normalizer and return schema-valid, distinct, idempotent IDs; valid explicit IDs stay
   unchanged. The suite also proves generated-ID determinism/uniqueness, editor+row
   reference equality, and unchanged input bytes plus read→read/read→write idempotence.
   A 12-case V1/V2/V3 × binding-ID/block-ID/prop-path/field table separately proves
   legacy editor repair, exact binding references, and primary/sibling data preservation.
5. `screenDocumentOps.test.ts` covers builder-backed factory and duplication output.
   `customScreensRoutes.test.ts` seeds an owned malformed legacy row and proves a
   metadata-only PATCH persists the local Tabs repair, distinct bounded structural IDs,
   the exact repaired sibling binding reference, and no document loss. The two Assistant
   Vitest suites run unchanged as compatibility consumers.

Every failure in these strict/compatibility-write paths remains
`custom_screen_definition_invalid` at the domain boundary (or the existing Ajv
`validation_error` at the registered route boundary). No submitted identifier or value
is added to error details, and this correction adds no route, public write, migration,
or persistence fallback.

## Historical pre-implementation grounded anchors

These 2026-07-13 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named files, symbols, and regression suites in this contract rather than mutable line
numbers.

- Per-kind allowlist and normalizer:
  `customScreenSchemas.ts:399-415,608-669`.
- Unsafe prefix-only image policy: `:592-605`.
- Block/slot normalization: `:703-769`.
- Read-only legacy repair: `:841-910`.
- Empty-document binding exceptions:
  `:1379-1413,1587-1606,1647-1651`.
- Generic block-data JSON schema: `:2413-2442`.
- Shared pure URL owners:
  `pageAuthoringSanitizers.ts:238-266`.
- Existing route-local `CustomScreenDefinitionError` and mapper:
  `customScreenRoutes.ts:21-64`.
- Create/update warning flow:
  `customScreenService.ts:24-57,190-204,258-313`.
- Existing Ajv error ownership: `schemaValidator.ts:15-50`.

Re-grep these symbols before editing; line numbers may shift.

## Security Contract

- **Visibility:** existing internal `/admin/api/custom-screens*` routes only; the narrow
  route edit changes only the shared definition-error import/re-export and mapper.
- **Auth/RBAC:** Custom Screen Admin routes remain session-cookie-only with existing
  `content:read` / `content:write` permission checks; no API-key authentication path is
  present or added.
- **CSRF/rate limit:** session writes retain shared CSRF and `admin_write`; internal
  reads retain the existing admin-read bucket. No limiter is added, moved, or skipped.
- **Validation:** create/update envelopes and every nested fixed-kind/slot object reject
  unknown keys before persistence through the existing Ajv `validation_error` 400.
  Semantic unsafe-URL and duplicate-tab/tab-slot failures use
  `custom_screen_definition_invalid` 400. Mapper details contain at most eight
  implementation-generated paths of at most 240 characters each, never submitted
  values or rejected unknown-key names.
- **Anti-abuse/secrets:** this leaf adds no public write, so nonce/captcha are not
  applicable. It adds no token, secret, browser storage, logging, or debug payload.

## Historical fixture-repair pseudocode

Keep the existing
`test("executeAssistantActionPlan patches custom screen block data", async () => ...)`
and its existing `createNativeTestCustomScreenDefinition(blocks, bindings?)` helper.
Change only that test's native Screen fixture, the exact plan summary/action title and
matching action coordinates shown below, and the final preservation assertions. Every
other existing plan/action envelope field and value remains byte-identical:

```ts
const screen = await deps.createCustomScreen({
  // Keep the existing name/content-type/status/sidebar fields unchanged.
  definition: createNativeTestCustomScreenDefinition([
    {
      id: "heading-1",
      type: "heading",
      data: { text: "Old headline", label: "Keep label" },
    },
    {
      id: "text-1",
      type: "text",
      data: { content: "Keep sibling" },
    },
  ]),
});

const plan: AssistantActionPlan = {
  // Keep every omitted existing plan/action envelope field byte-identical.
  summary: "Patch screen heading text.",
  actions: [
    {
      title: "Patch heading",
      type: "custom-screen.block.patch",
      input: {
        id: screen.id,
        name: "Projects Screen",
        expectedStatus: "draft",
        blockId: "heading-1",
        expectedBlockType: "heading",
        dataPath: ["text"],
        value: "New headline",
      },
    },
  ],
};

const preview = await dryRunAssistantActionPlan({ plan }, deps);
expect(preview.changes[0]?.operation).toBe("update");

await executeAssistantActionPlan(
  {
    plan,
    actorId: "user-1",
    idempotencyKey: "assistant-custom-screen-block-patch-1",
  },
  deps
);

expect(deps.__state.customScreens[0]?.blocks[0]?.data.text).toBe("New headline");
expect(deps.__state.customScreens[0]?.blocks[0]?.data.label).toBe("Keep label");
expect(deps.__state.customScreens[0]?.blocks[1]?.data.content).toBe("Keep sibling");
```

The data flow remains preview → execute → inspect the persisted in-memory projection.
Do not add a catch, compatibility fallback, normalizer exception, or production change;
an invalid fixture must fail rather than be silently repaired.

## Implementation Pseudocode

```ts
type ScreenNormalizeMode = "write" | "stored-read";
type ScreenBindingNormalizeMode = ScreenNormalizeMode | "compatibility-write";
type ScreenFieldPathToken =
  | "definition"
  | "editorView"
  | "listView"
  | "rowTemplate"
  | "document"
  | "sections"
  | "blocks"
  | "children"
  | "slots"
  | "data"
  | "tabs"
  | "id"
  | "action"
  | "href"
  | "src";
type ScreenFieldPathSegment = ScreenFieldPathToken | number;

export const CUSTOM_SCREEN_ERROR_FIELDS_MAX = 8;
export const CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX = 240;

type GeneratedScreenFieldPath = string & { readonly __generated: unique symbol };

// Call only with fixed contract tokens and traversal indexes. Never pass a submitted
// value, block/slot ID, rejected key name, or URL segment to this helper.
function generatedFieldPath(
  ...segments: ReadonlyArray<ScreenFieldPathToken | number>
): GeneratedScreenFieldPath {
  const path = segments.join(".").slice(0, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX);
  return path as GeneratedScreenFieldPath;
}

function boundGeneratedFields(fields: readonly GeneratedScreenFieldPath[]): string[] {
  return [...new Set(fields)]
    .slice(0, CUSTOM_SCREEN_ERROR_FIELDS_MAX)
    .map((field) => field.slice(0, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX));
}

export class CustomScreenDefinitionError extends Error {
  readonly code = "custom_screen_definition_invalid" as const;
  readonly fields: string[];

  constructor(fields: readonly GeneratedScreenFieldPath[] = []) {
    super("custom_screen_definition_invalid");
    this.fields = boundGeneratedFields(fields);
  }
}

function invalid(...fields: readonly GeneratedScreenFieldPath[]): never {
  throw new CustomScreenDefinitionError(fields);
}

export type ScreenTabItem = Readonly<{ id: string; label: string }>;
export const SCREEN_TAB_ID = /^[a-z][a-z0-9_-]{0,63}$/;
export const SCREEN_TABS_MIN = 1;
export const SCREEN_TABS_MAX = 24;
export const SCREEN_TAB_LABEL_MAX = 120;
const SCREEN_MEDIA_ASSET_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sole Bun-free owner of the Screen media-asset identity shape. Renderer,
// override-contract, service, and admin-client consumers import this predicate.
export function isScreenMediaAssetUuid(value: unknown): value is string {
  return typeof value === "string" && SCREEN_MEDIA_ASSET_UUID.test(value);
}

export function sanitizeScreenAuthoringUrl(
  value: unknown,
  kind: "link" | "media"
): string | null {
  if (typeof value !== "string") return null;
  if (/[\u0000-\u001F\u007F]/.test(value) || value.includes("\\")) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return kind === "link"
    ? sanitizeAuthoringLinkHref(trimmed)
    : sanitizeAuthoringMediaUrl(trimmed);
}

// Transitional compatibility only: keep the TASK-540-01 typecheck green while the
// Inspector lands in 02 and renderer lands in 03. Both consumers move to the wrapper.
export const normalizeScreenImageSrc = (value: unknown): string =>
  sanitizeScreenAuthoringUrl(value, "media") ?? "";

// customScreenRoutes.ts imports/re-exports this exact domain class, deletes its local
// duplicate, and keeps this exact public mapping:
// new ApiError(
//   "custom_screen_definition_invalid",
//   "Custom screen definition is invalid",
//   400,
//   fields.length > 0 ? { fields } : undefined
// );
// Ajv ApiError instances bypass this mapper unchanged.

function normalizeScreenUrl(
  value: unknown,
  kind: "link" | "media",
  mode: ScreenNormalizeMode,
  path: GeneratedScreenFieldPath
): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === null || typeof value !== "string") {
    if (mode === "write") invalid(path);
    return undefined; // stored-read compatibility may fail soft on malformed legacy values
  }
  const safe = sanitizeScreenAuthoringUrl(value, kind);
  if (safe !== null) return safe;
  if (mode === "write") invalid(path); // custom_screen_definition_invalid
  return undefined; // stored-read compatibility only
}

function normalizeTabsForWrite(
  raw: unknown,
  blockPath: readonly ScreenFieldPathSegment[]
): ScreenTabItem[] {
  if (
    !Array.isArray(raw) ||
    raw.length < SCREEN_TABS_MIN ||
    raw.length > SCREEN_TABS_MAX
  ) invalid(generatedFieldPath(...blockPath, "data", "tabs"));
  const seen = new Set<string>();
  return raw.map((item, index) => {
    assertExactRecord(item, ["id", "label"]);
    const id = requireTrimmedString(item.id, { max: 64 });
    const label = requireTrimmedString(item.label, { max: SCREEN_TAB_LABEL_MAX });
    if (!SCREEN_TAB_ID.test(id) || seen.has(id)) {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index, "id"));
    }
    seen.add(id);
    return { id, label };
  });
}

function assertTabSlots(
  block: ScreenBlockV1,
  blockPath: readonly ScreenFieldPathSegment[]
): void {
  if (block.type !== "tabs") return;
  const tabIds = block.data.tabs.map((tab) => tab.id);
  const slotIds = Object.keys(block.slots ?? {});
  if (!sameSet(tabIds, slotIds)) {
    invalid(
      generatedFieldPath(...blockPath, "data", "tabs"),
      generatedFieldPath(...blockPath, "slots")
    );
  }
}

function normalizeButtonData(
  data,
  mode: ScreenNormalizeMode,
  path: readonly ScreenFieldPathSegment[]
) {
  if (mode === "write") {
    assertKnownKeys(data, ["label", "action", "variant", "href", "field"]);
    if (data.action !== undefined && data.action !== "link") {
      invalid(generatedFieldPath(...path, "data", "action"));
    }
  }
  const href = normalizeScreenUrl(
    data.href,
    "link",
    mode,
    generatedFieldPath(...path, "data", "href")
  );
  return compact({
    ...normalizedKnownFields,
    ...(data.action !== undefined ? { action: "link" } : {}),
    href,
  });
}

function normalizeImageData(
  data,
  mode: ScreenNormalizeMode,
  path: readonly ScreenFieldPathSegment[]
) {
  assertKnownKeys(data, fixedImageKeys);
  return compact({
    ...normalizedKnownImageFields,
    src: normalizeScreenUrl(
      data.src,
      "media",
      mode,
      generatedFieldPath(...path, "data", "src")
    ),
  });
}

function repairDocumentAndBindingsForRead(rawDocument, rawBindings) {
  // One repair context follows the exact recursive objects that survive Tabs repair.
  // Mark any button/repaired-actions node with an own, present action !== exact "link"
  // before action/type coercion. Do not flatten the unrepaired raw tree.
  const context = { unsupportedButtonNodes: new WeakSet<object>() };
  const repaired = repairLegacyScreenRecordForRead(rawDocument, context);
  const document = normalizeRepairedDocumentForRead(repaired);

  // Traverse the repaired and normalized trees in the same structural order. Removed
  // orphan slots are absent from both; renamed/reordered slots carry their original
  // repaired node identity. Pairing therefore maps provenance to the final generated
  // or authored normalized ID without transferring it to a sibling.
  const repairedBlocks = collectRepairedBlocksInReadOrder(repaired);
  const normalizedBlocks = collectNormalizedBlocksInReadOrder(document);
  assertSameLength(repairedBlocks, normalizedBlocks);
  const unsupportedButtonIds = new Set(
    repairedBlocks.flatMap((node, index) =>
      context.unsupportedButtonNodes.has(node) ? [normalizedBlocks[index].id] : []
    )
  );

  const bindings = normalizeBindingsForRead(rawBindings).filter(
    (binding) =>
      !(unsupportedButtonIds.has(binding.blockId) && binding.propPath === "href")
  );

  // The adapter returns an in-memory read model only. It does not persist a disabled
  // bit/action or write the pruned binding back by itself.
  return { document, bindings };
}

function pruneBindings(blockIds: Set<string>, bindings, sink) {
  for (const binding of bindings) {
    if (blockIds.has(binding.blockId)) kept.push(binding);
    else sink?.removedBlockOrphans.push(binding.field);
  }
  return kept;
}

async function createCustomScreen(input: CustomScreenCreateInput) {
  const sink: ScreenBindingWarningSink = {
    removedFieldOrphans: [],
    removedBlockOrphans: [],
  };
  const definition = normalizeCustomScreenDefinitionForWrite(rawDefinition, context, sink);
  const row = await insertNormalizedDefinition(definition);
  const warnings = buildBindingWarnings(sink);
  return {
    ...mapRow(row, context),
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
```

The ASCII-control check is performed against the original string, before `trim()` and
before either imported Page helper. It is not reduced to whitespace or prefix checks:
all code points `U+0000..U+001F` and `U+007F` fail closed wherever they occur. This leaf
does not change the Page-owned helper because that policy has consumers outside Custom
Screens.

Replace every `blockIds.size === 0 || blockIds.has(...)` and every
`blockIds.size > 0 && orphan` gate with unconditional membership semantics.
Apply the same policy to editor view, list-row template, strict write, and stored
read. Keep the existing field-orphan policy unchanged (sink-backed write/read cleanup
versus the existing no-sink failure); this change only removes the empty-live-set
exception for impossible block IDs. `createCustomScreen` and `updateCustomScreen` each
allocate one sink before normalization, persist only the normalized definition, and
attach de-duplicated warnings to their successful response after persistence.
Stored-read normalization supplies its own discard sink and emits no warning on
GET/list responses; read repair itself never writes storage.

### Exact fixed-kind data contract

Define one `fixedScreenBlockDataSchemas` map for the eight kinds below. Every data
object has `type:"object"` and `additionalProperties:false`; properties not named in
its row are rejected. Except for `tabs.tabs`, fixed-kind data properties remain
optional for stored-V4 compatibility. In particular, factory-seeded `data.label` is
not retroactively required: absent means the renderer's existing fallback, while an
explicit `""` (or whitespace string) retains the established clearable-label behavior.
When present, `data.label` is a string with no new min/max; it is not defaulted or
trimmed by this leaf. The existing outer block/section label bounds remain unchanged and
must not be confused with clearable `data.label`.

| Kind | Exact allowed properties and write constraints | Required |
|---|---|---|
| `heading` | `label`: common clearable label; `text`: string, empty allowed; `level`: integer `1..3`; `align`: `"left" \| "center" \| "right"`; `field`: non-empty path string, max 160, `^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$` | none |
| `text` | `content`: string, empty allowed; `tone`: `"default" \| "muted"`; `label`: common clearable label | none |
| `stat` | `label`: common clearable label; `format`: `"number" \| "percent" \| "money"`; `trend`: `"auto" \| "up" \| "down" \| "flat"`; `deltaField`: empty or path string, max 160; `field`: non-empty path string, max 160 | none |
| `divider` | `variant`: `"line" \| "space" \| "label"`; `label`: common clearable label | none |
| `image` | `label`: common clearable label; `fit`: `"cover" \| "contain"`; `ratio`: any string, empty allowed, no enum/coercion/default; `field`: non-empty path string, max 160; `src`: string handled semantically by the media URL profile, empty means omit | none |
| `related-list` | `label`: common clearable label; `target`: empty or path string, max 160; `displayField`: empty or path string, max 160; `variant`: `"checklist" \| "activity" \| "cards"`; `limit`: integer `1..50`; `field`: non-empty path string, max 160 | none |
| `tabs` | `label`: common clearable label; `tabs`: array `1..24`; every item is exact `{id,label}` with both required, `id` matching `^[a-z][a-z0-9_-]{0,63}$`, and `label` trimmed/non-empty/max 120 | `tabs` |
| `button` | `label`: common clearable label; `action`: enum containing only `"link"`; `variant`: `"primary" \| "secondary" \| "ghost"`; `href`: string handled semantically by the link URL profile, empty means omit; `field`: non-empty path string, max 160 | none |

For the empty-or-path fields, the schema uses
`^(?:[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)?$`; non-empty path fields use
`^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$`. Both schemas also reject the existing unsafe path
segments `__proto__`, `prototype`, and `constructor` through an exact segment-aware
`not` pattern, `(^|\\.)(?:__proto__|prototype|constructor)(?:\\.|$)`; the normalizer
reuses `normalizePath` rather than duplicating this rule. General labels, text, URL, and
ratio properties deliberately receive no new arbitrary length cap in this remediation
because the current data normalizer has none; this task must not reject previously
valid stored strings by inventing one. A tab item's label is the intentional exception:
its schema uses `minLength:1`, `maxLength:SCREEN_TAB_LABEL_MAX`, and `pattern:"\\S"`,
while the normalizer trims and rechecks non-empty/max-120. `ratio` specifically
preserves canonical `"16/9"`, legacy `"16:9"`, `""`, and unknown stored strings
byte-for-byte on both read and write. Only the Inspector writes the canonical
`screenImageRatios` values.

The write normalizer uses the same property map, enum arrays, numeric bounds, path
patterns, `SCREEN_TAB_ID`, `SCREEN_TAB_LABEL_MAX`, and Tabs min/max constants. Direct
service calls therefore cannot bypass the route contract. Stored-read mode may apply
only the explicitly described legacy repairs/coercions; valid input is unchanged. In
particular, a present `href` or `src` must be a string on write: `null`, arrays, objects,
numbers, and booleans throw `CustomScreenDefinitionError` for direct service calls just
as Ajv rejects them at the route. Only stored-read mode may fail soft by omitting such a
malformed legacy URL value. `undefined` and the explicit empty string remain the only
write-time omission forms.

This Bun-free module also exports `isScreenMediaAssetUuid` from one private UUID
pattern. Tests pin valid mixed-case UUIDs and reject malformed, URL-shaped, blank, and
non-string values. TASK-540-03 imports the predicate for direct-image binding
resolution; TASK-540-04's strict override normalizer imports it rather than mirroring
the regex.

Select the matching fixed schema through exact-`const` type branches inside one
recursive `$defs` graph per validation root. The shared validator owns one global Ajv
instance and lazily compiles both mutation schemas, so do **not** put the same nested
`$id` in create and update: Ajv can register the first ID and fail when the opposite
schema compiles. A single factory/constant owner builds byte-equivalent definition
shapes for create, update, and the standalone exported definition schema, while each
root owns its own local definitions and `#/$defs/...` references:

```ts
const localScreenBlockRef = { $ref: "#/$defs/customScreenV4ScreenBlock" };
const localScreenDocumentRef = { $ref: "#/$defs/customScreenV4ScreenDocument" };
const localScreenDefinitionRef = { $ref: "#/$defs/customScreenV4Definition" };

function screenBlockBranch(type: string, dataSchema: object) {
  return {
    type: "object",
    required: ["id", "type", "data"],
    properties: {
      ...existingStrictBlockStructuralProperties,
      type: { const: type },
      data: dataSchema,
      // Keep the existing recursive collection bounds.
      children: { type: "array", maxItems: 500, items: localScreenBlockRef },
      slots: {
        type: "object",
        additionalProperties: {
          type: "array",
          maxItems: 500,
          items: localScreenBlockRef,
        },
      },
    },
    additionalProperties: false,
  } as const;
}

function screenSectionSchemaUsing(blockRef: object) {
  return {
    ...existingStrictSectionShape,
    properties: {
      ...existingStrictSectionShape.properties,
      blocks: { type: "array", maxItems: 500, items: blockRef },
    },
  } as const;
}

function buildCustomScreenV4Defs() {
  return {
    customScreenV4ScreenBlock: {
      oneOf: [
        ...buildFixedKindBranches(screenBlockBranch),
        ...buildExplicitCompatibilityKindBranches(screenBlockBranch),
      ],
    },
    customScreenV4ScreenDocument: {
      type: "object",
      additionalProperties: false,
      required: ["schemaVersion", "sections"],
      properties: {
        schemaVersion: { const: 1 },
        sections: {
          type: "array",
          maxItems: 120,
          items: screenSectionSchemaUsing(localScreenBlockRef),
        },
      },
    },
    customScreenV4Definition: {
      type: "object",
      additionalProperties: false,
      required: ["schemaVersion", "listView", "editorView"],
      properties: {
        schemaVersion: { const: 4 },
        listView: listViewSchemaUsing(localScreenDocumentRef),
        editorView: editorViewSchemaUsing(localScreenDocumentRef),
      },
    },
  } as const;
}

function buildCustomScreenMutationSchema(kind: "create" | "update") {
  const $defs = buildCustomScreenV4Defs();
  return {
    type: "object",
    $defs,
    required: kind === "create" ? ["name", "contentTypeId"] : [],
    properties: {
      ...buildExistingMutationProperties(kind),
      definition: localScreenDefinitionRef,
    },
    additionalProperties: false,
  } as const;
}

function buildStandaloneCustomScreenDefinitionSchema() {
  const $defs = buildCustomScreenV4Defs();
  return { ...$defs.customScreenV4Definition, $defs } as const;
}

export const customScreenDefinitionSchema = buildStandaloneCustomScreenDefinitionSchema();
export const customScreenCreateSchema = buildCustomScreenMutationSchema("create");
export const customScreenUpdateSchema = buildCustomScreenMutationSchema("update");
```

No nested `$id` or absolute ref is introduced. `customScreenCreateSchema` and
`customScreenUpdateSchema` each carry one locally resolvable `$defs` graph built by the
same owner, so both list-row and editor documents reference an identical recursive
shape without cross-root registration.
Root section blocks, every `children` item, and every item in every named slot must reach
that same discriminated definition. Each block branch has
`additionalProperties:false` for structural keys, and each fixed-kind `data` branch has
`additionalProperties:false`. Keep a separate, explicit stored-read/legacy compatibility
arm for `field`, `field-group`, `record-header`, `columns`, `rich-text`, and
`legacy-widget`; that arm does not pretend arbitrary legacy/plugin data is a new strict
fixed-kind write contract. No generic `{type:"object"}` arm may allow a fixed kind at
any depth to bypass its schema. `normalizeScreenBlockData` uses the same kind map and
exported min/max/ID constants, so route AJV and service normalization agree on required
fields, limits, enums, and URL/action policy.

## Error and compatibility flow

- Ajv remains the route-schema owner. Unknown keys at any recursive depth, missing
  required members, wrong primitive types, invalid tab ID/label shape, structural
  array overflows, and the unsupported Button action enum return the existing
  `validation_error`, message `Invalid payload`, and status 400. They do not get
  remapped to a Custom Screen domain error.
- Semantic checks that JSON Schema cannot express here—duplicate tab IDs, tab/slot set
  mismatch, and a non-empty unsafe URL—throw `CustomScreenDefinitionError`. The route
  mapper imports this sole class, removes its duplicate, and preserves exact code
  `custom_screen_definition_invalid`, message `Custom screen definition is invalid`,
  and status 400. No second route-local carrier remains.
- Domain `details.fields` is stable-order/de-duplicated, at most eight entries, and
  each entry is at most 240 characters. Paths are assembled only from fixed contract
  tokens plus traversal indexes. Submitted URLs, values, IDs, slot names, and unknown
  key names never enter the error. Zero fields omits `details`.
- Stored-read repair is deterministic and non-destructive. Unrepairable malformed
  documents continue through the existing fail-closed legacy path.
- A non-empty unsafe URL on a write throws `custom_screen_definition_invalid` with the
  exact `.href` or `.src` path before persistence. Only stored-read compatibility may
  omit that URL; it never substitutes an executable fallback. Error details never
  contain the rejected URL value.
- ASCII controls are unsafe before trimming or shared-helper delegation. In particular,
  `"/\t/evil.example/x"`, `"/\n/evil.example/x"`, and `"/\r/evil.example/x"`
  cannot survive as relative strings that a URL sink could reinterpret as protocol-
  relative. NUL (`"/\u0000/evil.example/x"`) and DEL
  (`"/\u007F/evil.example/x"`) are rejected by the same range check.
- Valid legacy/no-override documents preserve object and emitted-byte identity,
  including absent/empty fixed-kind labels and image ratio `"16:9"`/`""` strings.
- Do not add `disabled`, `publish`, or `custom` to the write enum. Safe-disabled
  compatibility is represented by the reserved read pair: supported `link` plus
  absent href plus absence of that block's href binding. The adapter performs this
  independently in editor and row-template documents before returning their read
  models; it persists no marker and preserves unrelated bindings.

## Gate regressions owned here; aggregate additions owned by TASK-540-06

- `tests/vitest/admin/custom-screen-schemas.test.ts`: exact schema and one unknown-
  key rejection/valid round-trip for every fixed data kind; assert the same rejection
  at root, two-level `children`, and two-level named-slot positions; preserve sections
  `120`, section-block/children/slot-array `500`, optional/empty labels, and image ratio
  `"16:9"`/`""`; nested Tabs limits, label trim/non-empty/max-120, duplicate/blank IDs,
  slot mismatch, link-only write, deterministic legacy read, empty-document binding
  warnings, and byte-stable round-trip. Legacy `button` and repaired `actions` fixtures
  carry href bindings in both editor and row-template views; read repair removes only
  those bindings and yields write-valid disabled Buttons without a persisted marker.
  Two compositional regressions run in both views. The first gives the removed orphan
  slot a missing/null-ID Button with an own non-`link` action plus a binding targeting
  its would-be generated ID; duplicate-Tab repair must preserve survivor sections/slot
  content, prune only that unsupported href binding, avoid empty-document fallback, and
  return a write-valid model. The second keeps equal block counts while slot repair
  reverses traversal order; it must not transfer provenance to a safe Button or preserve
  the generated unsupported Button's bound href. Both results re-read and write-normalize
  deterministically.
  Using fresh module instances of the real shared `schemaValidator`, validate valid
  create then update payloads and, in a second fresh instance, update then create; both
  orders must compile and pass, proving there is no duplicate schema-ID registration.
- The same schema suite owns the current correction's 160-character section/block/
  binding-path boundary, 120-character binding-ID boundary, strict/compatibility-write/
  stored-read mode matrix, exact-one `blockId|widgetId` compatibility contract,
  source/mode rejection, the exact generated-ID shape of bounded readable prefix plus
  `-` plus 13-character framed-tuple hash, and deterministic framed-tuple separation.
  Full write-normalizer cases cover short separator and case variants, preserve valid
  explicit IDs byte-for-byte, and retain editor+row binding references, unchanged stored
  input, and read/write idempotence.
- `tests/vitest/customScreens/screenDocumentOps.test.ts`: every binding-producing block
  factory and binding duplication path delegates to `buildScreenFieldBindingId`; bounded
  deterministic IDs preserve the existing block/propPath/field/mode semantics. No
  unrelated document-operation assertion is re-baselined.
- `tests/vitest/customScreens/screen-document-image-src.test.ts`: shared safe and
  hostile URL corpus, including relative/absolute backslash confusion and the exact
  TAB/LF/CR protocol-relative-confusion strings below, plus NUL/DEL, all rejected before
  delegation for both link and media profiles:

  ```ts
  const controlConfusedUrls = [
    "/\t/evil.example/x",
    "/\n/evil.example/x",
    "/\r/evil.example/x",
    "/\u0000/evil.example/x",
    "/\u007F/evil.example/x",
  ];
  ```

  For every value, call `sanitizeScreenAuthoringUrl` directly and expect `null`; direct
  Button/Image write normalization must throw with the exact generated `.href`/`.src`
  path and no submitted-value echo; stored-read normalization must omit the field; and
  `normalizeScreenImageSrc(value)` must return `""`, proving the compatibility alias
  delegates to the corrected wrapper. Existing safe, hostile, idempotence, non-string,
  and backslash assertions remain intact. A non-empty unsafe write reports the exact
  `.src`/`.href` path, while the stored-read adapter alone omits it. Direct write-normalizer cases also prove that
  `null` and every non-string present value throw rather than bypassing the Ajv contract,
  while stored-read compatibility omits those malformed legacy values. It pins the
  delegating compatibility contract
  `normalizeScreenImageSrc(value) === (sanitizeScreenAuthoringUrl(value, "media") ??
  "")`; TASK-540-02/03 migrate the two consumers before the alias is considered unused.
- `tests/vitest/assistant/action-plan-schema.test.ts` and
  `tests/vitest/assistant/catalogBlueprintEngine.test.ts`: direct Assistant action-plan
  and catalog-blueprint consumers of the changed exported Custom Screen write normalizer
  remain dependency-shaped R01 gates. They are not edited or re-baselined for this
  correction; their existing curated plan normalization assertions must stay green.
- `tests/integration/routes/customScreensRoutes.test.ts` (Bun/DB): nested fixed-kind
  unknown keys beneath both `children` and `slots` return `validation_error`/`Invalid
  payload`/400 and leave the owned fixture unchanged. Unsafe Button/Image URLs and
  duplicate-tab/tab-slot semantic failures return
  `custom_screen_definition_invalid`/`Custom screen definition is invalid`/400; assert
  `details.fields` count/length bounds and that neither submitted values nor unknown
  keys are echoed.
- The same Bun route suite creates a uniquely scoped screen whose editor and row
  template bindings point at absent block IDs. POST succeeds with ordered/de-duplicated
  `binding_block_removed` warning fields, persists only the pruned bindings, and a
  subsequent GET contains no transient warning. PATCH retains the existing equivalent
  proof. Cleanup deletes only rows created by this suite.
- `tests/unit/assistant/actionExecutorService.test.ts` (Bun): the existing Custom Screen
  block-patch case uses only strict V4 fixed kinds and their owned data paths. The action
  patches `heading.data.text`, preserves another property on the selected heading, and
  preserves the independent `text.data.content` sibling. No expectation may normalize,
  accept, or silently repair `hero`, `rich-text-section`, `headline`, or another stale
  Screen authoring shape; those names may remain in unrelated Page/Widget tests whose
  contracts legitimately own them.

`tests/vitest/customScreens/customScreenService.test.ts` is not changed or run as a
source-owned gate here. It may continue to run in the repository-wide suite, but the
leaf makes no new claim that the DB-importing service is Bun-free.

Apply all expectation changes above before running this leaf's validation. TASK-540-06
may add cross-leaf flows after source gates are green; it must preserve these exact
write-versus-stored-read assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/admin/custom-screen-schemas.test.ts \
  tests/vitest/assistant/action-plan-schema.test.ts \
  tests/vitest/assistant/catalogBlueprintEngine.test.ts \
  tests/vitest/customScreens/screen-document-image-src.test.ts \
  tests/vitest/customScreens/screenDocumentOps.test.ts
set -a && source .env && set +a
bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); if (!reachable) process.exit(1); process.exit(0)'
bun test tests/integration/routes/customScreensRoutes.test.ts tests/unit/assistant/actionExecutorService.test.ts
node --check _docs/_workflows/task-540-implement.mjs
node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings
git diff --check
```

If a named test fails, rerun that exact file once in isolation before classifying
the failure. This leaf adds no DB migration and no public/security gate exception.

## Historical corrective completion and fixture repair

The structural-provenance implementation and its 74/74 Vitest plus 15/15 DB route
evidence remain historical metadata. The later repair landed the original-string
ASCII-control guard and direct sanitizer/write/stored-read/compatibility-alias matrix,
then passed the final 75/75 Vitest and 15/15 DB route gates plus a fresh zero-finding
post-audit before this leaf returned to Done. That evidence remains historical and is
not invalidated as schema/source evidence. The later narrow Assistant fixture repair
also passed the exact schema/image Vitest, Custom Screens route, Assistant Bun, static,
and diff gates before its then-current repair ownership ended. That repair and its Done
transition are historical. The current 2026-07-16 R01 correction remains
`🚧 In Progress` with the exact current `Revalidation Passed` receipt above; source and
targeted gates are complete, while workflow/final audit and closure are not claimed.
TASK-540-04-L03 keeps
one canonical `Revalidation Passed` successor and no `Repair Pending`; the closure leaf
remains landed with its exact pre-closure evidence and must not be duplicated. Family
changelog 1252, full validation, and live smoke still remain closure-owned.
