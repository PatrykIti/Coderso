# TASK-580-03-L01: Legacy Widget Block Type In Shared Page V2 Contract
# FileName: TASK-580-03-L01-Legacy-Widget-Block-Type-In-Shared-Page-V2-Contract.md

**Parent Subtask:** TASK-580-03
**Priority:** High
**Category:** Pages / Content Modeling
**Estimated Effort:** Medium
**Dependencies:** TASK-580-01 + TASK-580-02
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

> **Cross-stream note (S3):** this leaf makes ONE narrow, enumerated addition
> to S3-owned Page V2 contract files: `pageDocumentV2Types.ts`,
> `pageBlockNormalizerV2.ts`, `pageBlockJsonSchemaV2.ts`,
> `pageDocumentV2Contract.ts`, `pageRendererV2.tsx`, `pageDocumentV2.ts` plus
> a NEW S6-owned `core/services/pages/legacyWidgetPlaceholder.tsx` (the six
> existing files keep S3 ownership; only the enumerated entries change). Do
> not start while TASK-539 is actively editing `pageRendererV2.tsx`; sequence
> after 539 lands or get an explicit single-writer handoff from the
> orchestrator. The diff is exactly the entries listed below, nothing else.
> Verified 2026-08-19 at contract-audit time: the S3 worktree in this shared
> repo carries only workflow/task-doc files; no `pageRendererV2.tsx` (or any
> `core/services/pages/*`) edits are present today.

---

## Overview

The detail-page migration needs a read-only placeholder block for widget types
that have no V2 equivalent. Mirroring TASK-468's `legacy-widget`
(`ScreenRuntimeLeafBlocks.tsx:626-640`), this leaf adds ONE new block type
`legacy-widget` to the shared Page V2 block contract so converted detail-page
documents can flow through `normalizeStoredPageDocumentV2ForRead` (which today
coerces unknown block types to `text`, `pageBlockNormalizerV2.ts:847`) and
render through `renderPublicPageV2RuntimeHtml` without losing the preserved
widget data. The block is migration-only: never editor-insertable, never
assistant-emittable, always rendered as a neutral read-only placeholder.

## Sub-Tasks

- [x] Add `"legacy-widget"` to `pageBlockTypes`
  (`core/services/pages/pageDocumentV2Types.ts:27-55`, currently 24 members;
  25 after this leaf).
- [x] Add `LegacyWidgetBlockV2` props type (`legacyWidgetType: string`,
  `data: Record<string, unknown>`) + normalize branch in
  `pageBlockNormalizerV2.ts` (strict on write: reject unknown top-level props;
  `legacyWidgetType` non-empty string ≤64 chars; `data` plain object, deep
  frozen copy, prototype-pollution keys rejected; stored-read: same branch —
  the type is now KNOWN so nothing coerces).
- [x] Add the block JSON schema entry in `pageBlockJsonSchemaV2.ts`.
- [x] Register capabilities in `pageDocumentV2Contract.ts`:
  `pageBlockPropKeys["legacy-widget"] = ["legacyWidgetType", "data"]`,
  `pageBlockCapabilities`: `editorInsertable: false`, `insertable: false`,
  `assistantEmittable: false`, `runtimeRenderer: "real"`, `slots: []`,
  `publicDataBinding: "none"`; add to `realRuntimeBlockTypes` (it DOES render),
  NOT to `editorInsertableBlockTypes`/`dataBoundBlockTypes`/
  `layoutBlockTypes`.
- [x] Add `case "legacy-widget"` in `renderPageBlockContent`
  (`pageRendererV2.tsx`, next to the `default: return null`) delegating to a
  NEW S6-owned module `core/services/pages/legacyWidgetPlaceholder.tsx`
  (minimal diff: one import + one case).
- [x] Re-export the new type through the `pageDocumentV2.ts` facade.
- [x] Tests: normalizer (write strict / stored-read / round-trip / data
  byte-identity), capabilities, JSON schema, renderer placeholder output
  (visible box with the type label, data NOT rendered, no `dangerouslySet*`),
  byte-identity guard that a no-placeholder V2 page renders byte-identically.

## Files To Change

| File | Required change |
|---|---|
| `core/services/pages/pageDocumentV2Types.ts` | +1 union member, `LegacyWidgetBlockV2` props type, prop keys export |
| `core/services/pages/pageBlockNormalizerV2.ts` | `legacy-widget` normalization branch |
| `core/services/pages/pageBlockJsonSchemaV2.ts` | JSON schema entry |
| `core/services/pages/pageDocumentV2Contract.ts` | prop keys + capabilities entries |
| `core/services/pages/pageRendererV2.tsx` | import + one switch case (delegates) |
| `core/services/pages/legacyWidgetPlaceholder.tsx` | NEW — placeholder component + renderer |
| `core/services/pages/pageDocumentV2.ts` | facade re-export |
| `tests/vitest/pages/legacy-widget-block.test.tsx` | NEW — normalizer/capabilities/render tests |

## Implementation Pseudocode

```ts
// core/services/pages/pageDocumentV2Types.ts
export const pageBlockTypes = [
  /* ...existing 24... */,
  "legacy-widget", // TASK-580-03-L01: migration-only read-only placeholder
] as const;

export type LegacyWidgetBlockProps = {
  /** Original v1 widget type id, e.g. "booking-calendar". */
  legacyWidgetType: string;
  /** Original widget `data`, preserved verbatim (never rendered). */
  data: Record<string, unknown>;
};
```

```ts
// core/services/pages/pageBlockNormalizerV2.ts
function normalizeLegacyWidgetProps(input: RecordValue, mode: NormalizeMode) {
  assertKnownKeys(input, ["legacyWidgetType", "data"], "props", mode);
  const legacyWidgetType = readBoundedText(input.legacyWidgetType, 1, 64);
  if (!legacyWidgetType) {
    if (mode === "write") throw new PageDocumentError("page_document_invalid", "legacyWidgetType required", "props.legacyWidgetType");
    return { legacyWidgetType: "unknown", data: {} }; // stored-read fail-closed
  }
  const data = isRecord(input.data) ? deepFreezeCopy(input.data) : {};
  return { legacyWidgetType, data };
}
```

```tsx
// core/services/pages/legacyWidgetPlaceholder.tsx
export function LegacyWidgetPlaceholder({ block }: { block: PageBlockV2 }) {
  const type = typeof block.props.legacyWidgetType === "string"
    ? block.props.legacyWidgetType.slice(0, 64)
    : "unknown";
  return (
    <div role="note" data-legacy-widget={type} className="rounded border border-dashed ...">
      <span>Legacy widget: {type}</span>
      <span className="sr-only">Read-only placeholder. Contact an editor to re-author this section.</span>
    </div>
  );
}
// pageRendererV2.tsx: case "legacy-widget": return <LegacyWidgetPlaceholder block={block} />;
```

**Data flow:** migration/read adapter emits `{type:"legacy-widget", props:
{legacyWidgetType, data}}` → `normalizeStoredPageDocumentV2ForRead` keeps the
type (known now) → `PageDocumentRender` hits the new case → neutral
placeholder; `data` stays in props untouched.

**Error handling:** strict reject-unknown on write (`page_document_unknown_
field`); stored-read never throws for a malformed placeholder (fail-closed to
`unknown`/`{}`); renderer never renders `data` (no XSS surface, no secret
leak); missing case would render `null` — the capability entry
(`runtimeRenderer: "real"`) and a render test pin that the case exists.

**Regression-test shape:**

```ts
describe("legacy-widget block", () => {
  it("round-trips on write and preserves data byte-identically", () => {
    const block = { id: "b1", type: "legacy-widget",
      props: { legacyWidgetType: "booking-calendar", data: { slots: { a: 1 }, nested: { x: "y" } } } };
    const doc = normalizePageDocumentV2ForWrite(buildDocWithBlock(block));
    expect(doc.sections[0].blocks[0].props.data).toEqual({ slots: { a: 1 }, nested: { x: "y" } });
    expect(JSON.stringify(doc)).toBe(JSON.stringify(normalizePageDocumentV2ForWrite(doc)));
  });
  it("rejects unknown props on write", () => expect(() =>
    normalizePageDocumentV2ForWrite(buildDocWithBlock({ ..., props: { legacyWidgetType: "x", data: {}, extra: 1 } }))
  ).toThrowError(/unknown/));
  it("renders a read-only placeholder without the data", () => {
    const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
    expect(html).toContain('data-legacy-widget="booking-calendar"');
    expect(html).not.toContain("nested");
  });
  it("keeps byte-identity for placeholder-free pages", () => {
    expect(renderNoPlaceholderPage()).toBe(PRE_MIGRATION_SNAPSHOT); // pinned snapshot
  });
});
```

**Validation commands:**

- `bun --cwd core lint:types` + `bun --cwd core lint`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/pages/legacy-widget-block.test.tsx`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/pages/page-renderer-v2.test.tsx` (regression: no placeholder-free byte drift)
- `git diff --check`

## Security Contract

- **Endpoint visibility:** no endpoints (contract addition only).
- **Auth model / RBAC / CSRF / rate limits:** n/a.
- **Validation:** reject-unknown on write; `legacyWidgetType` bounded 1..64;
  `data` deep-copied, never rendered; prototype-pollution keys rejected.
- **Secret handling:** placeholder renders only the type label; `data` never
  reaches markup, logs, or admin debug payloads.

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` — new block type + read-only/migration-only rule.
- `_docs/ARCHITECTURE.md` — legacy placeholder contract (done with L07; note
  here).

## Acceptance Criteria

1. `pageBlockTypes` includes `legacy-widget`; the facade re-exports it.
2. Write path is strict (unknown props rejected); stored-read never coerces
   the type to `text`.
3. `pageBlockCapabilities` marks it non-insertable/non-emittable with a real
   runtime renderer.
4. Placeholder renders visibly with the type label only; `data` is preserved
   in props byte-identically and never rendered.
5. Placeholder-free V2 pages render byte-identically (existing
   `page-renderer-v2` tests green).
