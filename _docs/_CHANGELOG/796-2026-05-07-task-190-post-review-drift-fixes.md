# 796 - TASK-190 post-review drift fixes

**Date:** 2026-05-07
**Version:** Unreleased
**Tasks:** TASK-190-04-02, TASK-190-05-01

## Key Changes

### Listing merge planner hardening

- Fixed the composed planner so incompatible merged listing filters now fail
  closed into typed `needs_input` behavior instead of throwing planner
  exceptions.
- Fixed shared listing-template handling so projection-field widening runs for
  every linked query, not only the first query that references a reused
  template.

### Page section library hardening

- Moved alias-specific page-section evidence into the existing
  `modulePackMatrix.ts` helper seam so the section library no longer returns
  pack-wide unrelated preset evidence.
- Gated raw media URLs in seeded section data until the assistant has trusted
  media-library ids, keeping page-section seed assembly inside the repo’s media
  trust boundary.

## Validation

- `bun run test:bun`
- `bun run test:vitest`
- `bun run lint`
- `bun run scan:security:strict`
