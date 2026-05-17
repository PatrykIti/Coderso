# TASK-290-07: Testimonials Large Set Import Export and Pagination

# FileName: TASK-290-07_Testimonials_Large_Set_Import_Export_and_Pagination.md

**Priority:** Low
**Category:** Widgets + Testimonials + Admin UI + Runtime Render + Import Export
**Estimated Effort:** Very Large
**Dependencies:** TASK-290-02, TASK-290-03, TASK-290
**Status:** To Do

---

## Overview

Define the Testimonials-only path for larger testimonial sets, local
import/export, and optional pagination/load-more behavior.

This leaf covers:

- `REPORT_TESTIMONIALS_WIDGET.md:236-238` BF-09 limit 8 testimonials without
  pagination or load more.
- `REPORT_TESTIMONIALS_WIDGET.md:240-242` BF-10 no export/import from external
  sources.

## Scope Boundary

In scope:

- Decide whether Testimonials v1 keeps the eight-item maximum or raises it with
  explicit editor/runtime large-set behavior.
- Add local JSON/CSV import/export for widget-owned testimonial data if the
  product decision allows it.
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

- [ ] Write a product decision in this task or in TASK-290-08: keep eight-item
  max, increase with pagination, or split large testimonial libraries into a
  future content type.
- [ ] If local import/export lands, add a bounded parser/serializer that accepts
  only known testimonial fields.
- [ ] Add duplicate ID handling, count clamping, and invalid-row reporting.
- [ ] Add optional runtime pagination/load-more controls if max count increases.
- [ ] Add editor tests for import/export errors and renderer tests for large-set
  display.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Adjust max/count normalization only if product decision changes the limit; add pagination fields if needed. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Add import/export controls and invalid-row feedback if included. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add parser/serializer, count, and renderer tests. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Add editor tests for import/export and large-set controls. |
| `_docs/_WIDGETS/TESTIMONIALS.md` | Document final large-set and import/export policy. |

## Implementation Pseudocode

Local import parser:

```ts
function parseTestimonialsImport(input: string) {
  const rows = parseCsvOrJson(input);
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
function resolveVisibleTestimonials(items: TestimonialItem[], pageSize: number, page: number) {
  const safePageSize = clamp(pageSize, 2, testimonialsItemMax);
  return items.slice(0, safePageSize * page);
}
```

Error handling:

- Invalid import rows are reported without mutating current widget data.
- Duplicate imported IDs are replaced with deterministic IDs.
- Unknown import fields are ignored or rejected according to the final parser
  policy, but never persisted silently.

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
- If any route is introduced by a split child task, add route registration and
  `map*Error` tests in the correct Bun lane.
- If committed separately from TASK-290-08, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

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
- Local import/export, if shipped, is normalized, safe, and test-covered.
- External review-provider sync is either explicitly out of scope or split into
  a dedicated security-reviewed task.
