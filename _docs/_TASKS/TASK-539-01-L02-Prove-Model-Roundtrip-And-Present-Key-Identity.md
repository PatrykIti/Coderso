# TASK-539-01-L02: Prove Model Round-trip and Present-Key Identity

# FileName: TASK-539-01-L02-Prove-Model-Roundtrip-And-Present-Key-Identity.md

**Parent Subtask:** TASK-539-01
**Priority:** High
**Category:** Pages / Vitest / Contract Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-01-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Own only `tests/integration/routes/pages.test.ts`. TASK-539-01-L01 has already updated
and gated the three Page-model Vitest files; this leaf runs them read-only for aggregate
confidence and must not edit or re-baseline them.

Do not alter production files or weaken existing assertions.

## Implementation Pseudocode

### Regression Test Shape

Confirm the landed unit coverage, then add route-level tests that prove:

1. Unit coverage already proves `{layer:{x}}` over `{layer:{y,z,anchor}}` resolves to all four present keys and
   does not deep-merge unrelated nested style records.
2. A write containing responsive layer without a base layer fails with
   `page_document_invalid` at the exact responsive layer path; stored read removes
   that unreachable layer but keeps sibling responsive typography/visibility.
3. Responsive `textTransform:"none"` survives normalization and round-trip while a
   base `"none"` remains omitted.
4. Canonical gallery objects round-trip exactly at the exact exported item/text/category
   limits; limit+1, every unknown nested key, legacy alias, malformed category set, or
   unsafe nonempty URL rejects on write.
5. Stored-read fixtures for strings and legacy aliases rebuild exactly
   `{src,alt,caption,category?}` and never carry alias/unknown keys forward.
6. `cursorSpotlight:false`, orphan color/size, and orphan parallax intensity leave no
   residue; true spotlight and parallax retain only their bounded dependants; noise
   remains independent.
7. Divider width/alignment are absent when gradient is off and retained when on.
8. A legacy document with none of the repaired fields remains JSON-byte-identical
   after normalization; a normalize→normalize pass is idempotent.
9. The registered Page create/update route rejects an unknown gallery-item key at the
   exact nested path with the existing 400/`page_document_invalid` mapping, leaves the
   owned Page row/document unchanged, and accepts a canonical gallery round-trip.

Use explicit expected objects and paths. Do not snapshot large documents or make a
test pass by accepting silent key loss.

## Security proof

The tests must exercise the actual write normalizer, not only helper calls, so nested
reject-unknown and media URL validation are proven at the same boundary used by Page
writes. No route/auth behavior changes in this leaf.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-document-v2-block-roundtrip.test.ts tests/vitest/pages/task-534-interactivity-model.test.ts
set -a && source .env && set +a && bun test --timeout=15000 tests/integration/routes/pages.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Check DB reachability before the route suite. Rerun any failing named file alone before
reporting a regression. Route fixtures must be uniquely scoped and clean only their rows.
