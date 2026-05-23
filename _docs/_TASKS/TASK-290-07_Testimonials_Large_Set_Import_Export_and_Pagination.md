# TASK-290-07: Testimonials Large Set Import Export and Pagination

# FileName: TASK-290-07_Testimonials_Large_Set_Import_Export_and_Pagination.md

**Priority:** Low
**Category:** Widgets + Testimonials + Admin UI + Runtime Render + Import Export
**Estimated Effort:** Very Large
**Dependencies:** TASK-290-02, TASK-290-03, TASK-290
**Status:** Done (2026-05-22)

---

## Overview

Define the Testimonials-only path for larger testimonial sets by raising the
local cap to 24 items, adding pure local JSON/CSV import/export, and exposing
an SSR `load-more` expansion contract.

This leaf covers:

- `REPORT_TESTIMONIALS_WIDGET.md:236-238` BF-09 limit 8 testimonials without
  pagination or load more.
- `REPORT_TESTIMONIALS_WIDGET.md:240-242` BF-10 no export/import from external
  sources.

## Scope Boundary

In scope:

- Raise `testimonialsItemMax` from `8` to `24`.
- Add `pagination.mode = "none" | "load-more"`, `pagination.pageSize`, and
  `pagination.loadMoreLabel` as Testimonials-owned schema fields.
- Add local JSON/CSV import/export for widget-owned testimonial data through a
  dedicated Bun-free owner module `core/widgets/core/testimonialsImportExport.ts`.
- Own `parseTestimonialsImport`, `serializeTestimonialsExport`, and
  `TestimonialsImportError` in that pure module. Parser policy is strict:
  unknown fields are rejected per row and reported back to the editor.
  `TestimonialsEditors.tsx` must only orchestrate UI/file input.
- Add optional pagination or load-more rendering for large sets.
- Keep all imported data normalized through `normalizeTestimonialsData`.

Out of scope:

- External provider connectors for Trustpilot, Google Reviews, Clutch, or other
  third-party APIs. Those require separate integration/security tasks.
- Global import/export framework changes.
- Server-side scheduled review sync.
- DB schema changes unless a separate product task explicitly moves
  testimonials out of page widget JSON.

## Sub-Tasks

- [x] Raise the Testimonials item cap to 24 and add the owned `pagination`
  schema/default/normalizer contract for `mode`, `pageSize`, and
  `loadMoreLabel`.
- [x] Add a bounded JSON/CSV parser/serializer that accepts only known
  testimonial fields.
- [x] Add duplicate ID handling, count clamping, and invalid-row reporting.
- [x] Render an SSR `load-more` expansion that shows the first `pageSize` items
  and reveals the remainder under a `<details>` disclosure when enabled.
- [x] Add editor tests for import/export errors and renderer tests for large-set
  display.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Raise max/count normalization to 24 and add the owned `pagination` schema/default/normalizer/render contract. |
| `core/widgets/core/testimonialsImportExport.ts` | Create the pure parser/serializer owner for local JSON/CSV import/export. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Add import/export controls and invalid-row feedback if included; do not own parser/serializer logic here. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add parser/serializer, count, and renderer tests. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Add editor tests for import/export and large-set controls. |
| `_docs/_WIDGETS/TESTIMONIALS.md` | Document final large-set and import/export policy. |

## Implementation Pseudocode

Local import parser:

```ts
function parseTestimonialsImport(input: string) {
  const rows = parseTestimonialsCsvOrJson(input);
  return rows.map((row, index) => ({
    id: normalizeImportedId(row.id, index),
    quote: normalizeRequiredText(row.quote),
    author: normalizeRequiredText(row.author),
    role: optionalText(row.role),
    avatar: optionalSafeAvatar(row.avatar),
    rating: resolveRating(Number(row.rating), 5),
    sourceLabel: optionalText(row.sourceLabel),
  }));
}
```

Pagination flow:

```ts
function resolveVisibleTestimonials(items: TestimonialItem[], pageSize: number) {
  const safePageSize = clamp(pageSize, 2, 12);
  return {
    initial: items.slice(0, safePageSize),
    overflow: items.slice(safePageSize),
  };
}
```

SSR load-more flow:

```tsx
const visible = resolveVisibleTestimonials(items, normalized.pagination?.pageSize ?? 6);

return normalized.pagination?.mode === "load-more" && visible.overflow.length > 0 ? (
  <>
    <TestimonialsList items={visible.initial} />
    <details data-testimonials-load-more="true">
      <summary>{normalized.pagination?.loadMoreLabel ?? "Load more testimonials"}</summary>
      <TestimonialsList items={visible.overflow} />
    </details>
  </>
) : (
  <TestimonialsList items={items} />
);
```

Error handling:

- Invalid import rows are reported without mutating current widget data.
- Duplicate imported IDs are replaced with deterministic IDs.
- Unknown import fields are rejected per row and never persisted silently.
- Parser/serializer helpers remain Bun-free and importable by Vitest without
  admin UI, DB, or runtime side effects.

Regression test shape:

- `tests/vitest/widgets/testimonials.test.tsx`
  - Parser accepts valid JSON/CSV rows, rejects rows with unknown fields, clamps
    ratings/counts, and preserves deterministic ids.
  - Renderer exposes all testimonials when `pagination.mode = "none"` and uses
    SSR `<details>` expansion when `mode = "load-more"` and overflow exists.
- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
  - Import preview reports row errors without mutating current widget data.
  - Successful import replaces the current normalized list, export emits the
    normalized JSON/CSV shape, and `pageSize`/label controls patch only the
    pagination contract.

## Security Contract

This leaf may add browser-only import/export controls but should not add API
routes. If an API route becomes necessary, split that route into a child task
with the full route security contract before implementation.

- Endpoint visibility: none unless split into a child route task.
- Auth/RBAC/CSRF/rate limit: unchanged for browser-only import/export.
- Reject-unknown validation: imported data must accept only known testimonial
  fields and must normalize through `testimonialsSchema`.
- Anti-abuse: imported content must not include raw HTML, scripts, event
  handlers, arbitrary class names, or unsafe URLs.
- Secret handling: no provider tokens or private review API credentials in
  widget data or browser storage.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
- If any route is introduced by a split child task, add route registration and
  `map*Error` tests in the correct Bun lane.

## Documentation Updates Required

- Update `_docs/_WIDGETS/TESTIMONIALS.md` with final large-set policy and local
  import/export format.
- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` BF-09 and BF-10
  status after implementation or explicit deferral.

## Changelog Policy

- Covered by the TASK-290 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- The eight-item limit has an explicit product decision and no longer reads as
  an accidental dead end.
- Local import/export is normalized, safe, rejects unknown fields, and is
  test-covered.
- Large sets can reveal overflow through the owned SSR `load-more` contract
  without introducing widget-specific client-side JS.
- External review-provider sync is either explicitly out of scope or split into
  a dedicated security-reviewed task.

## Completion Notes (2026-05-22)

- The local Testimonials cap is now `24`, and the widget owns explicit
  `pagination.mode`, `pagination.pageSize`, and `pagination.loadMoreLabel`
  fields for SSR `load-more` disclosure behavior.
- `core/widgets/core/testimonialsImportExport.ts` now owns strict local
  JSON/CSV parsing and serialization, rejecting unknown fields while preserving
  deterministic ids, safe avatar URLs, sanitized quote HTML, formula-safe CSV
  export, and the truthful `2`-`24` import row contract without fabricating
  fallback rows during export.
- Advanced editor coverage now proves invalid import preview, successful import
  replacement, export generation, and the large-set pagination controls without
  introducing any external review-provider integration.
