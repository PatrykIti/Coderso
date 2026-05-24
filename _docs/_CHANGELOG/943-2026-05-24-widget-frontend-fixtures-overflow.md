# 943. Widget frontend fixtures and overflow contract

- **Date:** 2026-05-24
- **Version:** Unreleased
- **Tasks:** TASK-336-15

## Key Changes

### Runtime UX
- Fixed Team spotlight supporting cards so high column counts no longer collapse
  the side rail into unreadable narrow cards.
- Added approved horizontal-scroll affordances and focusable scroll regions for
  Testimonials slider, Pricing comparison rows, Product Compare tables, and
  Product Table tables.
- Hardened nested row-flow rendering with a bounded child shell for Stack and
  other row-flow slot layouts.

### QA fixtures
- Repaired the public fixture inventory so all 38 widget public paths are
  covered.
- Seeded bounded public fixture content for Stack, Split Layout, Grid Columns,
  Content List, Product Gallery, Product Compare, Product Table, Search Box,
  Timeline, and Template Section.

### Validation
- Updated the Playwright overflow detector so only allowlisted widget/region
  pairs can bypass overflow failures.
- Captured a full 38-widget frontend smoke rerun with zero public failures,
  fixture gaps, or metadata gaps.
