# 882. TASK-279 product compare widget follow-ups

Date: 2026-05-20
Version: Unreleased
Tasks: TASK-279, TASK-279-01, TASK-279-02, TASK-279-03, TASK-279-04, TASK-279-05, TASK-279-06, TASK-279-07, TASK-279-08, TASK-324

## Key Changes

### Product Compare widget contract
- Product Compare now supports exact curated `productIds`, schema-owned compare rows, section copy, locale-aware money formatting, bounded quantity formatting, stock-state labels, featured-product highlighting, sticky headers, and `compact` / `cards` variants.
- Product headers can now render backend-resolved media, safe product links, and bounded read-only CTAs without introducing cart or checkout writes.
- Matrix rendering now ships caption/scoped-header semantics, named sections, keyboard-focusable horizontal scroll, and read-only runtime warning output.

### Admin preview and shared source fields
- Product Compare now refreshes admin preview data through an internal widget preview route and transient builder preview state instead of relying on frontend-only SSR.
- Runtime diagnostics are now read-only and paired with human-readable query summaries plus optional raw JSON disclosure.
- Shared `CommerceSourceFields` / `normalizeSourceForEditor` now support widget-specific bounds and helper copy, closing the shared prerequisite that Product Compare needed for truthful limit/source guidance.

### Docs and QA
- TASK-279 and TASK-324 task docs, board rows, Product Compare widget docs, and the Playwright report are synchronized to the landed runtime/admin behavior.
- Focused commerce, widget, editor, route, and preview suites passed while landing the new Product Compare contract.

## Validation

- Focused Bun commerce/query/runtime/route tests passed.
- Focused Vitest widget/editor/admin preview suites passed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run scan:security:strict`
- `bun run precommit`
