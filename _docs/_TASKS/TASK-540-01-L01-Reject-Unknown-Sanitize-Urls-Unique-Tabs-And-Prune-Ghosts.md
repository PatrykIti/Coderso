# TASK-540-01-L01: Reject Unknown, Sanitize URLs, Enforce Unique Tabs, and Prune Ghosts

# FileName: TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-01
**Priority:** High
**Category:** Custom Screens / Schema / Security
**Estimated Effort:** Medium
**Dependencies:** None inside TASK-540
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/customScreenService.ts`, only to give create the same
  warning-sink/build-response flow already used by update; do not refactor DB access
- `core/server/routes/customScreenRoutes.ts`, only to remove the route-local error
  carrier, import/re-export the domain-owned carrier, and preserve
  `mapCustomScreenError` code/status/message plus bounded `details.fields`
- compatibility updates required by this source gate in
  `tests/vitest/admin/custom-screen-schemas.test.ts`,
  `tests/vitest/customScreens/screen-document-image-src.test.ts`,
  `tests/integration/routes/customScreensRoutes.test.ts`

Do not edit route registration/handlers, `ScreenBlockLibrary.tsx`,
`screenDocumentOps.ts`, renderer/UI files,
task indexes, or changelogs in this leaf. Update the named existing behavior tests
before running this leaf's gate; TASK-540-06 may add aggregate coverage later but must
not re-baseline this leaf's assertions.

`tests/vitest/customScreens/customScreenService.test.ts` is read-only here. Importing
its production module has immediate `db/client` coupling, so this leaf does not add or
move persistence assertions into that Vitest suite. Create/update response and stored
row behavior are proved in the existing Bun route integration lane with uniquely scoped
fixtures and owned-row cleanup.

## Grounded anchors

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

## Implementation Pseudocode

```ts
type ScreenNormalizeMode = "write" | "stored-read";
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
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("\\")) return null;
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
  // Collect canonical IDs BEFORE rewriting action/type. Do this independently for
  // editorView.document and listView.rowTemplate.document so equal IDs in separate
  // documents cannot suppress one another's bindings.
  const unsupportedButtonIds = collectRawUnsupportedButtonIds(rawDocument, {
    blockTypes: ["button", "actions"],
    actions: ["publish", "custom"],
  });

  // Existing actions->button repair stays. Unsupported buttons become action:"link"
  // with static href absent. Tabs receive deterministic tab-N[-K] repair: first
  // matching legacy slot keeps its content; collision repairs receive empty slots.
  const document = normalizeRepairedDocumentForRead(rawDocument);
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
| `heading` | `label`: common clearable label; `text`: string, empty allowed; `level`: integer `1..3`; `align`: `"left" \| "center" \| "right"`; `field`: non-empty path string, max 160, `^[a-zA-Z0-9_.-]+$` | none |
| `text` | `content`: string, empty allowed; `tone`: `"default" \| "muted"`; `label`: common clearable label | none |
| `stat` | `label`: common clearable label; `format`: `"number" \| "percent" \| "money"`; `trend`: `"auto" \| "up" \| "down" \| "flat"`; `deltaField`: empty or path string, max 160; `field`: non-empty path string, max 160 | none |
| `divider` | `variant`: `"line" \| "space" \| "label"`; `label`: common clearable label | none |
| `image` | `label`: common clearable label; `fit`: `"cover" \| "contain"`; `ratio`: any string, empty allowed, no enum/coercion/default; `field`: non-empty path string, max 160; `src`: string handled semantically by the media URL profile, empty means omit | none |
| `related-list` | `label`: common clearable label; `target`: empty or path string, max 160; `displayField`: empty or path string, max 160; `variant`: `"checklist" \| "activity" \| "cards"`; `limit`: integer `1..50`; `field`: non-empty path string, max 160 | none |
| `tabs` | `label`: common clearable label; `tabs`: array `1..24`; every item is exact `{id,label}` with both required, `id` matching `^[a-z][a-z0-9_-]{0,63}$`, and `label` trimmed/non-empty/max 120 | `tabs` |
| `button` | `label`: common clearable label; `action`: enum containing only `"link"`; `variant`: `"primary" \| "secondary" \| "ghost"`; `href`: string handled semantically by the link URL profile, empty means omit; `field`: non-empty path string, max 160 | none |

For the empty-or-path fields, the schema uses `^(?:[a-zA-Z0-9_.-]+)?$`; non-empty
path fields use `^[a-zA-Z0-9_.-]+$`. Both schemas also reject the existing unsafe path
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
  Using fresh module instances of the real shared `schemaValidator`, validate valid
  create then update payloads and, in a second fresh instance, update then create; both
  orders must compile and pass, proving there is no duplicate schema-ID registration.
- `tests/vitest/customScreens/screen-document-image-src.test.ts`: shared safe and
  hostile URL corpus, including relative/absolute backslash confusion rejected before
  delegation; a non-empty unsafe write reports the exact `.src`/`.href` path, while the
  stored-read adapter alone omits it. Direct write-normalizer cases also prove that
  `null` and every non-string present value throw rather than bypassing the Ajv contract,
  while stored-read compatibility omits those malformed legacy values. It pins the
  delegating compatibility contract
  `normalizeScreenImageSrc(value) === (sanitizeScreenAuthoringUrl(value, "media") ??
  "")`; TASK-540-02/03 migrate the two consumers before the alias is considered unused.
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
bunx vitest run tests/vitest/admin/custom-screen-schemas.test.ts \
  tests/vitest/customScreens/screen-document-image-src.test.ts
set -a && source .env && set +a
bun test tests/integration/routes/customScreensRoutes.test.ts
```

If a named test fails, rerun that exact file once in isolation before classifying
the failure. This leaf adds no DB migration and no public/security gate exception.

## Completion

Implemented the strict recursive fixed-kind schema, deterministic stored-read repair,
Screen-owned URL and media-UUID helpers, empty-document binding pruning, bounded
non-echoing domain errors, and create/update warning parity. The final source audit found
no unresolved HIGH, MEDIUM, or feasibility LOW drift. Typecheck and lint passed; the two
targeted Vitest files passed 70/70 and the DB-backed Bun route suite passed 15/15 with
82 expectations.
