# 911 - TASK-326 section shared structural truthfulness

- Date: 2026-05-22
- Version: Unreleased
- Tasks: TASK-326

## Key Changes

### Section runtime and normalization
- Aligned invalid `borderWidth` and `radius` fallbacks with the actual Section defaults instead of misleading substitute tokens.
- Kept the current runtime width model intact while making the saved/editor contract truthful about what `wide` and `bleed` do today.

### Section editor ownership
- Removed duplicated `gradientAngle` and `overlayOpacity` ownership from Advanced so those surface numerics live only in Visual.
- Updated Section guidance copy so `Wide alias` and true edge-to-edge requirements are explicit for authors.

### QA and docs
- Refreshed the focused Section Vitest coverage around fallback defaults, Advanced semantics-only behavior, and width guidance expectations.
- Synced the Section report, widget docs, task docs, and task board with the closed shared owner boundary.
