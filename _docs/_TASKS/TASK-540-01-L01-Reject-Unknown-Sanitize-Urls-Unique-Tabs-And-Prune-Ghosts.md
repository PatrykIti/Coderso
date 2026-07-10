# TASK-540-01-L01: Reject Unknown, Sanitize URLs, Enforce Unique Tabs, and Prune Ghosts

# FileName: TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-01
**Priority:** High
**Category:** Custom Screens / Schema / Security
**Estimated Effort:** Medium
**Dependencies:** None inside TASK-540
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/services/customScreens/customScreenSchemas.ts`
- `core/server/routes/customScreenRoutes.ts`, only to remove the route-local error
  carrier, import/re-export the domain-owned carrier, and preserve
  `mapCustomScreenError` code/status/message plus bounded `details.fields`
- compatibility updates required by this source gate in
  `tests/vitest/admin/custom-screen-schemas.test.ts`,
  `tests/vitest/customScreens/screen-document-image-src.test.ts`,
  `tests/vitest/customScreens/customScreenService.test.ts`, and
  `tests/integration/routes/customScreensRoutes.test.ts`

Do not edit route registration/handlers, `ScreenBlockLibrary.tsx`,
`screenDocumentOps.ts`, renderer/UI files,
task indexes, or changelogs in this leaf. Update the named existing behavior tests
before running this leaf's gate; TASK-540-06 may add aggregate coverage later but must
not re-baseline this leaf's assertions.

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

Re-grep these symbols before editing; line numbers may shift.

## Security Contract

- **Visibility:** existing internal `/admin/api/custom-screens*` routes only; the narrow
  route edit changes only the shared definition-error import/re-export and mapper.
- **Auth/RBAC:** existing session or scoped API-key authentication and `content:read` /
  `content:write` permission checks remain unchanged.
- **CSRF/rate limit:** session writes retain shared CSRF and `admin_write`; internal
  reads retain the existing admin-read bucket. No limiter is added, moved, or skipped.
- **Validation:** create/update envelopes and every nested fixed-kind/slot object reject
  unknown keys before persistence. Mapper details contain only bounded schema paths,
  never rejected values.
- **Anti-abuse/secrets:** this leaf adds no public write, so nonce/captcha are not
  applicable. It adds no token, secret, browser storage, logging, or debug payload.

## Implementation Pseudocode

```ts
type ScreenNormalizeMode = "write" | "stored-read";

export class CustomScreenDefinitionError extends Error {
  readonly code = "custom_screen_definition_invalid" as const;

  constructor(readonly fields: string[] = []) {
    super("custom_screen_definition_invalid");
  }
}

function invalid(path?: string): never {
  throw new CustomScreenDefinitionError(path ? [path] : []);
}

export type ScreenTabItem = Readonly<{ id: string; label: string }>;
export const SCREEN_TAB_ID = /^[a-z][a-z0-9_-]{0,63}$/;
export const SCREEN_TABS_MIN = 1;
export const SCREEN_TABS_MAX = 24;

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

// customScreenRoutes.ts imports/re-exports this exact domain class, deletes its local
// duplicate, and keeps the byte-frozen mapper message/status/code. Only bounded schema
// paths from `fields` enter ApiError.details; submitted values never do.

function normalizeScreenUrl(
  value: unknown,
  kind: "link" | "media",
  mode: ScreenNormalizeMode,
  path: string
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const safe = sanitizeScreenAuthoringUrl(value, kind);
  if (safe !== null) return safe;
  if (mode === "write") invalid(path); // custom_screen_definition_invalid
  return undefined; // stored-read compatibility only
}

function normalizeTabsForWrite(raw: unknown): ScreenTabItem[] {
  if (
    !Array.isArray(raw) ||
    raw.length < SCREEN_TABS_MIN ||
    raw.length > SCREEN_TABS_MAX
  ) invalid();
  const seen = new Set<string>();
  return raw.map((item) => {
    assertExactRecord(item, ["id", "label"]);
    const id = requireTrimmedString(item.id, { max: 64 });
    const label = requireTrimmedString(item.label, { max: 120 });
    if (!SCREEN_TAB_ID.test(id) || seen.has(id)) invalid();
    seen.add(id);
    return { id, label };
  });
}

function assertTabSlots(block: ScreenBlockV1): void {
  if (block.type !== "tabs") return;
  const tabIds = block.data.tabs.map((tab) => tab.id);
  const slotIds = Object.keys(block.slots ?? {});
  if (!sameSet(tabIds, slotIds)) invalid();
}

function normalizeButtonData(data, mode: ScreenNormalizeMode, path: string) {
  if (mode === "write") {
    assertKnownKeys(data, ["label", "action", "variant", "href", "field"]);
    if (data.action !== undefined && data.action !== "link") invalid(`${path}.action`);
  }
  const href = normalizeScreenUrl(data.href, "link", mode, `${path}.href`);
  return compact({
    ...normalizedKnownFields,
    ...(data.action !== undefined ? { action: "link" } : {}),
    href,
  });
}

function normalizeImageData(data, mode: ScreenNormalizeMode, path: string) {
  assertKnownKeys(data, fixedImageKeys);
  return compact({
    ...normalizedKnownImageFields,
    src: normalizeScreenUrl(data.src, "media", mode, `${path}.src`),
  });
}

function repairLegacyScreenRecordForRead(node: unknown): unknown {
  // Existing actions->button repair stays.
  // For a button with publish/custom: return a copy with action:"link" and
  // href removed. This is safe-disabled, strict-write-valid, and not persisted.
  // For Tabs: assign stable tab-N[-K] IDs, keep first matching legacy slot,
  // give later collision repairs empty slots, then recurse through all slots.
}

function pruneBindings(blockIds: Set<string>, bindings, sink) {
  for (const binding of bindings) {
    if (blockIds.has(binding.blockId)) kept.push(binding);
    else sink?.removedBlockOrphans.push(binding.field);
  }
  return kept;
}
```

Replace every `blockIds.size === 0 || blockIds.has(...)` and every
`blockIds.size > 0 && orphan` gate with unconditional membership semantics.
Apply the same policy to editor view, list-row template, strict write, and stored
read. Keep field-orphan read retention unchanged; only impossible block IDs are
pruned.

Define one `fixedScreenBlockDataSchemas` map for every fixed data-oriented kind
already present in `screenBlockDataAllowedKeys`: `heading`, `text`, `stat`,
`divider`, `image`, `related-list`, `tabs`, and `button`. Each object schema has
`additionalProperties:false`; its property set exactly mirrors that kind's
allowlist, and it imports/reuses the same enum arrays, integer clamps, string/path
limits, URL helpers, `SCREEN_TAB_ID.source`, and `SCREEN_TABS_MAX` consumed by the
normalizer. Factory-seeded `label` remains required for these fixed kinds. Tabs
also requires `tabs`, with `minItems:SCREEN_TABS_MIN`, `maxItems:SCREEN_TABS_MAX`, and exact
items requiring only `id` and `label`; Button's action enum contains only `link`.

Select the matching fixed schema through exact-`const` type branches inside one
recursive `$defs` graph. The write schema has a single `screenBlock` definition, and
every structural position references it rather than a generic object:

```ts
export const CUSTOM_SCREEN_V4_WRITE_SCHEMA_ID =
  "urn:coderso:schema:custom-screen-v4-write:v1" as const;

const absoluteScreenBlockRef = {
  $ref: `${CUSTOM_SCREEN_V4_WRITE_SCHEMA_ID}#/$defs/screenBlock`,
};
const absoluteScreenDocumentRef = {
  $ref: `${CUSTOM_SCREEN_V4_WRITE_SCHEMA_ID}#/$defs/screenDocument`,
};

const customScreenV4DefinitionSchema = {
  $id: CUSTOM_SCREEN_V4_WRITE_SCHEMA_ID,
  $defs: {
    screenBlock: {
      oneOf: fixedKindBranches plus explicitCompatibilityKindBranches,
    },
    screenDocument: {
      type: "object",
      additionalProperties: false,
      required: ["schemaVersion", "sections"],
      properties: {
        schemaVersion: { const: 1 },
        sections: {
          type: "array",
          maxItems: 120,
          items: screenSectionSchemaUsing(absoluteScreenBlockRef),
        },
      },
    },
  },
  properties: {
    listView: rowTemplate.document uses absoluteScreenDocumentRef,
    editorView: document uses absoluteScreenDocumentRef,
  },
};

// Every screenBlock branch owns strict structural keys and reuses these refs:
children: { type: "array", items: absoluteScreenBlockRef };
slots: {
  type: "object",
  additionalProperties: {
    type: "array",
    items: absoluteScreenBlockRef,
  },
};
```

The `$id` and both absolute `$ref` strings above are exact and must not be rebased.
`customScreenCreateSchema` and `customScreenUpdateSchema` each embed exactly one
`customScreenV4DefinitionSchema`, so Ajv compiles the identified definition once per
route schema; both list-row and editor documents reference the same `$defs` graph.
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

- Write contract violations throw the existing
  `custom_screen_definition_invalid`. `CustomScreenDefinitionError` is owned/exported
  here; the route mapper imports this sole class, preserves the existing code, 400
  status, and byte-frozen message, and carries only bounded schema paths through
  `details.fields`. No second route-local carrier remains.
- Stored-read repair is deterministic and non-destructive. Unrepairable malformed
  documents continue through the existing fail-closed legacy path.
- A non-empty unsafe URL on a write throws `custom_screen_definition_invalid` with the
  exact `.href` or `.src` path before persistence. Only stored-read compatibility may
  omit that URL; it never substitutes an executable fallback. Error details never
  contain the rejected URL value.
- Valid legacy/no-override documents preserve object and emitted-byte identity.
- Do not add `disabled`, `publish`, or `custom` to the write enum. Safe-disabled
  compatibility is represented by the reserved read pair: supported `link` plus
  absent href. It is a state/representation, not a second action string.

## Gate regressions owned here; aggregate additions owned by TASK-540-06

- `tests/vitest/admin/custom-screen-schemas.test.ts`: exact schema and one unknown-
  key rejection/valid round-trip for every fixed data kind; assert the same rejection
  at root, two-level `children`, and two-level named-slot positions; nested Tabs limits,
  duplicate/blank IDs, slot mismatch, link-only write, deterministic legacy read,
  empty-document binding warnings, and byte-stable round-trip.
- `tests/vitest/customScreens/screen-document-image-src.test.ts`: shared safe and
  hostile URL corpus, including relative/absolute backslash confusion rejected before
  delegation; a non-empty unsafe write reports the exact `.src`/`.href` path, while the
  stored-read adapter alone omits it.
- `tests/vitest/customScreens/customScreenService.test.ts` and
  `tests/integration/routes/customScreensRoutes.test.ts`: persistence/reject-
  unknown/error mapping and untouched-store assertions. Route tests submit an unknown
  fixed-kind data key beneath both nested `children` and nested `slots`, expect the
  existing 400/error code, and prove persistence is untouched. Domain and route tests
  also assert an unsafe Button/Image write returns the exact `.href`/`.src` path in
  `details.fields`, preserves the byte-frozen public message, and never echoes the
  submitted value.

Apply all expectation changes above before running this leaf's validation. TASK-540-06
may add cross-leaf flows after source gates are green; it must preserve these exact
write-versus-stored-read assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/admin/custom-screen-schemas.test.ts \
  tests/vitest/customScreens/screen-document-image-src.test.ts \
  tests/vitest/customScreens/customScreenService.test.ts
set -a && source .env && set +a
bun test tests/integration/routes/customScreensRoutes.test.ts
```

If a named test fails, rerun that exact file once in isolation before classifying
the failure. This leaf adds no DB migration and no public/security gate exception.
