# 862 - TASK-257 to TASK-270 regression fixes

Date: 2026-05-18
Version: Unreleased
Tasks: TASK-257, TASK-258, TASK-259, TASK-260, TASK-261, TASK-262, TASK-263, TASK-264, TASK-265, TASK-266, TASK-267, TASK-268, TASK-269, TASK-270

## Key Changes

### CMS Widgets

- Fixed the Content List public runtime contract so listing-mode helper
  `rawRows` stay internal to resolver consumers and no longer leak into the
  persisted widget `resolved` payload, which keeps strict widget-schema
  validation green for public catalog pages.
- Kept alpha-based `rgba(...)` text colors authoritative in shared admin color
  controls while the swatch falls back to the configured opaque preview instead
  of silently dropping transparency through the native color input.

### QA and Editor Contracts

- Revalidated the post-closure widget wave by updating shared regression tests
  to the shipped editor copy and section structure for Content List, Footer,
  FAQ Accordion, and Contact instead of the pre-closure labels that no longer
  match the final widget owners.
- Added resolver coverage that explicitly proves public Content List runtime
  payloads do not expose internal listing helper rows.
