# TASK-237-02: Listing Query Path Hardening
# FileName: TASK-237-02_Listing_Query_Path_Hardening.md

**Priority:** High
**Category:** Security + Content Services
**Estimated Effort:** Small
**Dependencies:** TASK-237
**Status:** To Do

---

## Overview

Fix CodeQL `js/prototype-pollution-utility` alert 19 in the listing query
projection path.

`parseListingQuery` already rejects `__proto__`, `prototype`, and
`constructor` segments, but `setFieldValue` still writes dynamic path segments
directly. The implementation must make the write helper itself safe so the
execution layer is protected even if a future caller bypasses normalization.

## File Inventory

| File | Lines | Current Issue | Required Change |
|------|-------|---------------|-----------------|
| `core/services/content/queryBuilderService.ts` | 74, 105-118 | Reserved segment set exists only in normalization. | Reuse one safe path helper for normalization, read, and write paths. |
| `core/services/content/queryBuilderService.ts` | 339-366 | `readFieldValue` and `setFieldValue` traverse arbitrary path strings. | Validate each path segment before reading/writing; never assign to `__proto__`, `prototype`, or `constructor`. |
| `core/services/content/queryBuilderService.ts` | 536 | Projection calls `setFieldValue(projected, field, ...)`. | Keep projection behavior for safe nested fields, reject unsafe paths before mutation. |
| `tests/unit/content/queryBuilderService.test.ts` | Existing suite | Suite covers parse-time unsafe field rejection but not projection write hardening. | Add execution-level tests proving unsafe paths do not pollute `Object.prototype` and produce a machine-readable error if reached. |

## Sub-Tasks

- [ ] Extract a shared safe field-path helper from `normalizeFieldPath`.
- [ ] Make `readFieldValue` and `setFieldValue` call the same safety guard.
- [ ] Keep error mapping machine-readable as `listing_query_invalid_field`
  when an unsafe path reaches execution.
- [ ] Add a regression test that attempts `__proto__.polluted` through
  projection/execution and asserts `({}).polluted` remains `undefined`.
- [ ] Add a nested safe-field regression so normal projections still work.

## Implementation Pseudocode

Shared field-path guard:

```ts
const reservedFieldSegments = new Set(["__proto__", "prototype", "constructor"]);

const splitSafeFieldPath = (
  value: string,
  context: "field" | "sort" | "filter" | "execution"
) => {
  const normalized = value.trim();
  const segments = normalized.split(".");

  const invalidSegment = segments.find(
    (segment) => segment.length === 0 || reservedFieldSegments.has(segment)
  );

  if (!normalized || invalidSegment) {
    throw new ApiError(
      "listing_query_invalid_field",
      `Invalid ${context} path "${value}"`,
      400
    );
  }

  return segments;
};

const normalizeFieldPath = (value, context) =>
  splitSafeFieldPath(value, context).join(".");
```

Read/write helper shape:

```ts
const readFieldValue = (row: ListingSourceRow, field: string): unknown => {
  const segments = splitSafeFieldPath(field, "execution");
  let current: unknown = row;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const setFieldValue = (
  target: ListingSourceRow,
  field: string,
  value: unknown
) => {
  const segments = splitSafeFieldPath(field, "execution");
  let current: Record<string, unknown> = target;

  for (const [index, segment] of segments.entries()) {
    const isLast = index === segments.length - 1;

    if (isLast) {
      current[segment] = value;
      return;
    }

    const existing = current[segment];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
};
```

Regression-test shape:

```ts
test("executeListingQuery guards projection writes against prototype pollution", async () => {
  let captured: unknown;

  try {
    await executeListingQuery(
      {
        source: "entries",
        sourceConfig: { contentTypeId: "type-post" },
        filters: [],
        sort: [],
        pagination: { limit: 10, offset: 0 },
        fields: ["__proto__.polluted"],
      },
      { rowsResolver: async () => [{ id: "entry-1", title: "Entry" }] }
    );
  } catch (error) {
    captured = error;
  }

  expect(captured).toBeInstanceOf(ApiError);
  expect(captured instanceof ApiError ? captured.code : undefined).toBe(
    "listing_query_invalid_field"
  );

  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});

test("executeListingQuery still projects safe nested fields", async () => {
  const query = {
    source: "entries",
    sourceConfig: { contentTypeId: "type-post" },
    filters: [],
    sort: [],
    pagination: { limit: 10, offset: 0 },
    fields: ["seo.title"],
  };

  const result = await executeListingQuery(
    query,
    { rowsResolver: async () => [{ id: "entry-1", seo: { title: "SEO" } }] }
  );

  expect(result.rows[0]).toEqual({ id: "entry-1", seo: { title: "SEO" } });
});
```

## Security Contract

- Visibility: internal listing query service.
- Auth model: unchanged; callers keep existing admin/runtime authorization.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: unsafe field segments must be rejected before
  execution and also guarded at execution-time path traversal.
- Anti-abuse: prototype-chain mutation must be impossible through listing
  query fields, filters, sort keys, or projections.
- Secret handling: listing rows must not expose hidden fields through fallback
  path traversal.

## Testing Requirements

```bash
bun test tests/unit/content/queryBuilderService.test.ts
bun test tests/integration/posts/posts-runtime-flow.test.ts
bun test tests/perf/codersoPerformanceGate.test.ts
git diff --check
```

The integration/performance suites import `executeListingQuery`; run them if the
implementation changes public behavior or execution-plan shape.

## Documentation Updates Required

- `_docs/_TASKS/TASK-237_GitHub_CodeQL_Security_Findings_Remediation.md`
- Changelog entry on TASK-237 closure.

## Acceptance Criteria

1. CodeQL alert 19 is addressed.
2. Unsafe object path segments cannot be read or written by listing execution.
3. Safe nested projection behavior stays compatible.
4. Tests prove `Object.prototype` is not polluted.
